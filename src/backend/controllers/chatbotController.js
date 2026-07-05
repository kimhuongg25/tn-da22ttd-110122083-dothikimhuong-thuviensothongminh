const { GoogleGenerativeAI } = require("@google/generative-ai");
const Book = require('../models/Book');
const User = require('../models/User');
const BorrowRecord = require('../models/BorrowRecord');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==========================================
// 1. TRỢ LÝ AI DÀNH CHO ĐỘC GIẢ (USER)
// ==========================================
exports.chatWithAI = async (req, res) => {
  try {
    const { message, history, username } = req.body;
    if (!message) return res.status(400).json({ error: "Vui lòng nhập câu hỏi." });

    const books = await Book.find().select('title author available_quantity shelf_location genre book_price');
    const bookListText = books.map(b => 
      `- "${b.title}" (Tác giả: ${b.author}) | Thể loại: ${b.genre} | Số lượng: ${b.available_quantity} | Kệ: ${b.shelf_location} | Giá đền: ${b.book_price}đ`
    ).join('\n');

    let historyText = "";
    if (history && history.length > 0) {
      const realHistory = history.filter(msg => msg.text !== "Xin chào! Mình là Trợ lý AI của Smart Library. Bạn cần tìm sách gì hay muốn hỏi về nội quy thư viện không?");
      if (realHistory.length > 0) {
        historyText = "\nLỊCH SỬ TRÒ CHUYỆN:\n" + realHistory.slice(-6).map(msg => `${msg.isBot ? 'Bot' : 'Người dùng'}: ${msg.text}`).join('\n');
      }
    }

    const userGreeting = username ? `Đang trò chuyện với độc giả: ${username}.` : `Đang trò chuyện với khách.`;

    const systemPrompt = `
      Bạn là "Smart Librarian" - Trợ lý ảo AI của thư viện. ${userGreeting}
      
      NỘI QUY: Mượn tối đa 14 ngày, phạt 5.000đ/ngày trễ, hỏng đền 50-100% giá sách.
      
      KHO SÁCH HIỆN TẠI:
      ${bookListText}
      ${historyText}

      HƯỚNG DẪN: Trả lời ngắn gọn, thân thiện. Luôn báo số lượng và vị trí kệ nếu khách hỏi tìm sách.
      Câu hỏi: "${message}"
      Trả lời:
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(systemPrompt);
    res.status(200).json({ reply: result.response.text() });
  } catch (error) {
    console.error("Lỗi AI User:", error);
    res.status(500).json({ error: "Hệ thống AI đang bận. Vui lòng thử lại sau!" });
  }
};

// ==========================================
// 2. TRỢ LÝ AI DÀNH CHO QUẢN TRỊ VIÊN (ADMIN)
// ==========================================
exports.adminChatWithAI = async (req, res) => {
  try {
    const { message, history, username } = req.body;
    if (!message) return res.status(400).json({ error: "Vui lòng nhập câu hỏi." });

    // A. Lấy thống kê tổng quan
    const totalBooks = await Book.countDocuments();
    const totalUsers = await User.countDocuments({ role: 'user' });
    const pendingBorrowsCount = await BorrowRecord.countDocuments({ status: 'pending' });
    
    // B. Lấy chi tiết phiếu chờ duyệt
    const pendingDetails = await BorrowRecord.find({ status: 'pending' })
      .populate('user_id', 'username')
      .populate('book_id', 'title');
    const pendingText = pendingDetails.map(p => `- Phiếu ${p._id}: ${p.user_id?.username} đang chờ duyệt mượn cuốn "${p.book_id?.title}"`).join('\n') || "Không có phiếu chờ duyệt.";

    // C. Lấy chi tiết sách quá hạn
    const overdueDetails = await BorrowRecord.find({
        due_date: { $lt: new Date() },
        status: { $ne: 'returned' }
    }).populate('user_id', 'username').populate('book_id', 'title');
    const overdueText = overdueDetails.map(p => `- Độc giả ${p.user_id?.username} trễ hạn cuốn "${p.book_id?.title}" (Hạn: ${new Date(p.due_date).toLocaleDateString()})`).join('\n') || "Không có sách quá hạn.";

    // D. Lấy xu hướng đọc
    const trendingGenres = await BorrowRecord.aggregate([
      { $lookup: { from: 'books', localField: 'book_id', foreignField: '_id', as: 'book' } },
      { $unwind: '$book' },
      { $group: { _id: '$book.genre', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 }
    ]);
    const trendText = trendingGenres.map(g => `${g._id} (${g.count} lượt)`).join(', ');

    // E. Lấy danh mục sách và độc giả
    const books = await Book.find().select('title available_quantity shelf_location');
    const bookListText = books.map(b => `- "${b.title}" | Tồn: ${b.available_quantity} | Kệ: ${b.shelf_location}`).join('\n');
    
    const users = await User.find({ role: 'user' }).select('username email');
    const userListText = users.map(u => `- ${u.username} (${u.email})`).join('\n');

    // F. Xử lý lịch sử
    let historyText = "";
    if (history && history.length > 0) {
      const realHistory = history.filter(msg => msg.text !== "Xin chào Admin! Mình là Trợ lý Quản trị. Sếp cần xem báo cáo, thống kê hay tra cứu kho sách hôm nay?");
      if (realHistory.length > 0) {
        historyText = "\nLỊCH SỬ TRÒ CHUYỆN:\n" + realHistory.slice(-6).map(msg => `${msg.isBot ? 'Bot' : 'Admin'}: ${msg.text}`).join('\n');
      }
    }

    // G. Nạp dữ liệu vào System Prompt
    const systemPrompt = `
      Bạn là "Admin Assistant" - Trợ lý AI CẤP CAO của Ban Quản trị. Sếp: ${username}.

      [THỐNG KÊ TỔNG QUAN]
      - Kho sách: ${totalBooks} cuốn | Độc giả: ${totalUsers} người
      - Xu hướng đọc (Top 3): ${trendText}

      [CHI TIẾT PHIẾU CHỜ DUYỆT (${pendingBorrowsCount} phiếu)]
      ${pendingText}

      [DANH SÁCH VI PHẠM - SÁCH QUÁ HẠN (${overdueDetails.length} cuốn)]
      ${overdueText}

      [DANH SÁCH ĐỘC GIẢ]
      ${userListText}

      [DANH SÁCH KHO SÁCH]
      ${bookListText}

      ${historyText}

      NHIỆM VỤ: Dựa chính xác vào các số liệu trên để báo cáo khi sếp hỏi. Tra cứu đúng tên, đúng sách đang nợ hoặc chờ duyệt. Trả lời chuyên nghiệp.
      Câu lệnh: "${message}"
      Trả lời:
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(systemPrompt);
    res.status(200).json({ reply: result.response.text() });
  } catch (error) {
    console.error("Lỗi AI Admin:", error);
    res.status(500).json({ error: "Lỗi kết nối AI Quản trị." });
  }
};