const BorrowRecord = require('../models/BorrowRecord');
const Book = require('../models/Book');
const UserActivity = require('../models/UserActivity'); 
const User = require('../models/User'); // Nhúng Model User để khóa thẻ


// BỔ SUNG: Nhúng thêm hàm gửi Email Từ chối (sendRejectionEmail)
const { sendBorrowConfirmationEmail, sendReturnConfirmationEmail, sendRejectionEmail, sendPaymentConfirmationEmail } = require('../services/cronService');

// 1. [POST] Gửi yêu cầu mượn sách (Độc giả)
exports.borrowBook = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ message: "Quản trị viên không có quyền mượn sách!" });
    }

    const { book_id, expected_borrow_date, expected_return_date } = req.body;
    const user_id = req.user._id; 

    const book = await Book.findById(book_id);
    if (!book || book.available_quantity < 1) {
      return res.status(400).json({ message: "Sách này hiện đã hết trong kho." });
    }

    // ==========================================
    // LOGIC MỚI: KIỂM TRA GIỚI HẠN MƯỢN TỐI ĐA 3 CUỐN
    // ==========================================
    const activeBorrowsCount = await BorrowRecord.countDocuments({
      user_id: user_id,
      status: { $in: ['pending', 'approved', 'borrowed'] } 
    });

    if (activeBorrowsCount >= 3) {
      return res.status(400).json({ 
        message: "Bạn đã đạt giới hạn mượn tối đa 3 cuốn sách cùng lúc. Vui lòng hoàn trả sách cũ trước khi mượn thêm!" 
      });
    }
    // ==========================================

    const alreadyPending = await BorrowRecord.findOne({ 
      user_id, 
      book_id, 
      status: { $in: ['pending', 'approved', 'borrowed'] } 
    });
    if (alreadyPending) {
      return res.status(400).json({ message: "Bạn đang có phiếu mượn chưa hoàn tất cho cuốn sách này!" });
    }

    const record = new BorrowRecord({ 
      user_id, 
      book_id, 
      expected_borrow_date,
      expected_return_date,
      status: 'pending' 
    });
    await record.save();

    await UserActivity.create({
      user_id: user_id,
      action_type: 'borrow',
      book_id: book_id
    });

    res.status(201).json({ message: "Gửi yêu cầu mượn thành công. Vui lòng chờ Admin duyệt!", record });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. [GET] Lấy tất cả phiếu mượn (Dành cho Admin Dashboard)
exports.getAllBorrowRequests = async (req, res) => {
  try {
    const { status, search } = req.query;
    let queryCondition = {};

    if (status && status !== 'all') {
      queryCondition.status = status;
    }

    let records = await BorrowRecord.find(queryCondition)
      .populate('user_id', 'username fullName email')
      .populate('book_id', 'title cover_image author shelf_location book_price') 
      .sort({ createdAt: -1 }); 

    if (search) {
      const keyword = search.toLowerCase();
      records = records.filter(record => {
        const username = record.user_id?.username?.toLowerCase() || record.user_id?.fullName?.toLowerCase() || '';
        const bookTitle = record.book_id?.title?.toLowerCase() || '';
        return username.includes(keyword) || bookTitle.includes(keyword);
      });
    }

    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. [PUT] Cập nhật trạng thái phiếu mượn (Dành cho Admin)
exports.updateBorrowStatus = async (req, res) => {
  try {
    const recordId = req.params.record_id || req.params.id; 
    const { status, fine, rejectReason } = req.body; // Bổ sung nhận rejectReason từ Frontend

    const record = await BorrowRecord.findById(recordId);
    if (!record) return res.status(404).json({ message: "Không tìm thấy phiếu mượn." });

    const book = await Book.findById(record.book_id);

    // ==========================================
    // TH1: ADMIN BẤM DUYỆT 
    // ==========================================
    if (status === 'approved' && record.status === 'pending') {
      if (!book || book.available_quantity < 1) {
        record.status = 'rejected';
        await record.save();
        return res.status(400).json({ message: "Từ chối duyệt: Sách này hiện đã hết trong kho!" });
      }

      const MAX_BORROW_LIMIT = 3; 
      const activeBorrowsCount = await BorrowRecord.countDocuments({
        user_id: record.user_id,
        status: { $in: ['approved', 'borrowed'] } 
      });
      
      if (activeBorrowsCount >= MAX_BORROW_LIMIT) {
        return res.status(400).json({ message: `Từ chối duyệt: Độc giả này đã đạt giới hạn mượn tối đa (${MAX_BORROW_LIMIT} cuốn)!` });
      }

      const overdueBooks = await BorrowRecord.findOne({
        user_id: record.user_id,
        $or: [
          { status: 'overdue' },
          { status: 'borrowed', due_date: { $lt: new Date() } } 
        ]
      });

      if (overdueBooks) {
        return res.status(400).json({ message: "Từ chối duyệt: Độc giả đang có sách mượn quá hạn chưa trả. Phải trả sách cũ trước!" });
      }

      book.available_quantity -= 1; 
      await record.save();
      
      record.status = 'approved';
      record.borrow_date = new Date(); 
      record.due_date = record.expected_return_date; 
    }
    
    // ==========================================
    // TH1.5: ĐỘC GIẢ ĐẾN LẤY SÁCH TRỰC TIẾP TẠI QUẦY
    // ==========================================
    else if (status === 'borrowed' && record.status === 'approved') {
      record.status = 'borrowed';
      record.borrow_date = new Date(); 
      record.due_date = record.expected_return_date; 

      await record.populate('user_id', 'fullName username email');
      await record.populate('book_id', 'title');

      try {
        sendBorrowConfirmationEmail(record);
      } catch (emailError) {
        console.error("Lỗi khi gửi email xác nhận giao sách:", emailError);
      }
    }
    
    // ==========================================
    // TH2: ADMIN CHỦ ĐỘNG TỪ CHỐI (ĐÃ ĐƯỢC NÂNG CẤP)
    // ==========================================
    else if (status === 'rejected' && record.status === 'pending') {
      record.status = 'rejected';
      
      // Lấy lý do từ chối do Frontend gửi lên (mặc định nếu trống)
      const finalRejectReason = rejectReason || "Chưa đáp ứng điều kiện mượn sách của thư viện.";

      // Nếu Model của bạn có trường lưu note/ghi chú thì có thể lưu lại
      if (record.note !== undefined) {
          record.note = finalRejectReason;
      }

      // Nạp thông tin Sách & Độc giả để chuẩn bị nội dung gửi Email
      await record.populate('user_id', 'fullName username email');
      await record.populate('book_id', 'title');

      // Chạy ngầm hàm gửi Email
      try {
        if (record.user_id?.email) {
            sendRejectionEmail(record, finalRejectReason);
        }
      } catch (emailErr) {
        console.error("Lỗi gửi mail từ chối:", emailErr);
      }
    }
    
    // ==========================================
    // TH3: ĐỘC GIẢ TRẢ SÁCH (CÓ XỬ LÝ PHẠT HƯ HỎNG & GỬI EMAIL)
    // ==========================================
    else if (status === 'returned' && (record.status === 'borrowed' || record.status === 'approved' || record.status === 'overdue')) {
      record.return_date = new Date();
      record.status = 'returned';

      let totalFineAmount = 0;
      let fineReasons = [];
      let daysLate = 0; // Biến lưu số ngày trễ

      // Tính phí phạt trả trễ
      if (record.due_date && record.return_date > record.due_date) {
        daysLate = Math.ceil((record.return_date - record.due_date) / (1000 * 60 * 60 * 24));
        if (daysLate > 0) {
          totalFineAmount += (daysLate * 5000);
          fineReasons.push(`Trả trễ ${daysLate} ngày`);
        }
      }

      // Tính phí phạt hư hỏng VÀ LÝ DO (Từ Frontend gửi lên)
      let damageReasonInput = '';
      if (fine && fine.amount) {
        const frontendFine = Number(fine.amount);
        if (frontendFine > 0) {
          totalFineAmount += frontendFine;
          damageReasonInput = fine.damageReason || 'Lý do khác';
          fineReasons.push(`Phạt: ${damageReasonInput}`);
        }
      }

      const paymentStatus = fine?.status || 'unpaid'; 

      // Ghi nhận tiền phạt & Trạng thái thanh toán
      if (totalFineAmount > 0) {
        record.fine = {
          amount: totalFineAmount,
          reason: fineReasons.join(' + '),
          status: paymentStatus 
        };

        // 🚨 NẾU CHƯA THANH TOÁN -> KHÓA QUYỀN MƯỢN SÁCH CỦA ĐỘC GIẢ
        if (paymentStatus === 'unpaid') {
          await User.findByIdAndUpdate(record.user_id, { status: 'locked' });
        }
      }

      if (book) {
        book.available_quantity += 1;
        await book.save();
      }

      // BỔ SUNG: Nạp thông tin Sách & Độc giả để chuẩn bị gửi Email
      await record.populate('user_id', 'fullName username email');
      await record.populate('book_id', 'title');

      // KÍCH HOẠT HÀM GỬI EMAIL XÁC NHẬN TRẢ SÁCH (Chạy ngầm)
      try {
        sendReturnConfirmationEmail(record, {
          daysLate,
          totalFineAmount,
          paymentStatus,
          damageReason: damageReasonInput
        });
      } catch (emailErr) {
        console.error("Lỗi gửi mail xác nhận trả sách:", emailErr);
      }

    } else {
      return res.status(400).json({ message: "Trạng thái cập nhật không hợp lệ với quy trình hiện tại." });
    }

    await record.save();
    res.status(200).json({ message: `Cập nhật trạng thái phiếu thành '${status}' thành công!`, record });
  } catch (error) {
    console.error("Lỗi Controller updateBorrowStatus:", error);
    res.status(500).json({ error: error.message });
  }
};

// 4. [GET] Lấy lịch sử mượn sách của cá nhân 
exports.getMyBorrowHistory = async (req, res) => {
  try {
    const records = await BorrowRecord.find({ user_id: req.user._id })
      .populate('book_id', 'title cover_image author')
      .sort({ createdAt: -1 }); 
    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 5. [GET] Thống kê số lượng phiếu mượn theo tháng (Admin)
exports.getMonthlyStats = async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();

    const stats = await BorrowRecord.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${year}-01-01T00:00:00.000Z`),
            $lte: new Date(`${year}-12-31T23:59:59.999Z`)
          }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          totalBorrows: { $sum: 1 },
          returnedBooks: { 
            $sum: { $cond: [{ $eq: ["$status", "returned"] }, 1, 0] } 
          },
          lateFines: { $sum: "$fine.amount" }
        }
      },
      { $sort: { _id: 1 } } 
    ]);

    const formattedStats = Array.from({ length: 12 }, (_, i) => {
      const monthData = stats.find(stat => stat._id === i + 1);
      return {
        name: `Tháng ${i + 1}`,
        total: monthData ? monthData.totalBorrows : 0,
        returned: monthData ? monthData.returnedBooks : 0,
        revenue: monthData ? monthData.lateFines : 0
      };
    });

    res.status(200).json(formattedStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 6. [GET] Thống kê số lượng mượn theo ngày
exports.getDailyStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Thiếu ngày bắt đầu hoặc kết thúc." });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const stats = await BorrowRecord.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      }
    ]);

    const dateArray = [];
    let currentDate = new Date(start);
    
    while (currentDate <= end) {
      const year = currentDate.getFullYear();
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const day = currentDate.getDate().toString().padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      const found = stats.find(s => s._id === dateString);
      dateArray.push({
        date: `${day}/${month}`,
        count: found ? found.count : 0,
        fullDate: dateString
      });
      
      currentDate.setDate(currentDate.getDate() + 1); 
    }

    res.status(200).json(dateArray);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// 7. [GET] Lấy danh sách các phiếu có phát sinh phí phạt (Admin)
// ==========================================
exports.getAllFines = async (req, res) => {
  try {
    // Chỉ lấy những phiếu có tiền phạt > 0
    const records = await BorrowRecord.find({ "fine.amount": { $gt: 0 } })
      .populate('user_id', 'username fullName email status')
      .populate('book_id', 'title')
      .sort({ createdAt: -1 });
    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// 8. [PUT] Xác nhận thanh toán phạt và Mở khóa tài khoản
// ==========================================
exports.payFine = async (req, res) => {
  try {
    const recordId = req.params.id;
    
    // Nạp sẵn dữ liệu Độc giả và Sách để dùng cho việc gửi Email
    const record = await BorrowRecord.findById(recordId)
      .populate('user_id', 'fullName username email')
      .populate('book_id', 'title');

    if (!record || !record.fine) {
      return res.status(404).json({ message: "Không tìm thấy thông tin phạt." });
    }

    // 1. CẬP NHẬT TRỰC TIẾP VÀO DATABASE (KHẮC PHỤC LỖI MONGOOSE KHÔNG NHẬN DIỆN OBJECT LỒNG)
    record.fine.status = 'paid';
    await BorrowRecord.findByIdAndUpdate(recordId, { 
      $set: { "fine.status": "paid" } 
    });

    // 2. KIỂM TRA ĐỂ TỰ ĐỘNG MỞ KHÓA TÀI KHOẢN
    // Thêm $ne (Not Equal) để loại trừ chính cái phiếu vừa thanh toán ra khỏi bộ đếm
    const remainingUnpaid = await BorrowRecord.countDocuments({
      user_id: record.user_id._id,
      _id: { $ne: recordId }, // <--- ĐÂY LÀ CHÌA KHÓA GIẢI QUYẾT LỖI
      $or: [
        { "fine.status": 'unpaid' },
        { status: 'overdue' }
      ]
    });

    // 3. Nếu KHÔNG còn khoản nợ nào khác -> Mở khóa thẻ ngay lập tức
    let unlockMessage = "";
    let isUnlocked = false; 

    if (remainingUnpaid === 0) {
      await User.findByIdAndUpdate(record.user_id._id, { status: 'active' });
      unlockMessage = "Tài khoản độc giả đã được hệ thống tự động Mở Khóa.";
      isUnlocked = true;
    } else {
      unlockMessage = `Độc giả vẫn còn ${remainingUnpaid} khoản phạt/quá hạn khác chưa xử lý.`;
    }

    // 4. CHẠY NGẦM HÀM GỬI EMAIL BIÊN LAI
    try {
      if (record.user_id?.email) {
        sendPaymentConfirmationEmail(record, isUnlocked);
      }
    } catch (emailErr) {
      console.error("Lỗi gửi mail biên lai thanh toán:", emailErr);
    }

    res.status(200).json({ 
      message: `Đã xác nhận thu tiền thành công! ${unlockMessage}`, 
      record 
    });
  } catch (error) {
    console.error("Lỗi xác nhận đóng phạt:", error);
    res.status(500).json({ error: error.message });
  }
};