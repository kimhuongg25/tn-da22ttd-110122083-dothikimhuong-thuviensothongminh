const Review = require('../models/Review');
const UserActivity = require('../models/UserActivity');

// [POST] Thêm đánh giá mới (Bắt buộc đăng nhập)
exports.addReview = async (req, res) => {
  try {
    const { book_id, rating, comment } = req.body;
    const user_id = req.user._id;

    // 1. Kiểm tra xem người dùng đã đánh giá cuốn sách này chưa
    const alreadyReviewed = await Review.findOne({ user_id, book_id });
    if (alreadyReviewed) {
      return res.status(400).json({ message: "Bạn đã đánh giá cuốn sách này rồi." });
    }

    // 2. Lưu đánh giá vào Database (Thành công ở bước này)
    const newReview = await Review.create({ user_id, book_id, rating, comment });

    // 3. Nạp thông tin người dùng (Cách viết an toàn 100% cho mọi phiên bản Mongoose)
    const populatedReview = await Review.findById(newReview._id).populate('user_id', 'fullName username');

    // 4. Ghi nhận hành vi bằng một khối Try-Catch độc lập
    // Nếu chữ 'rate' chưa được khai báo trong Model UserActivity, nó sẽ chỉ báo lỗi nhẹ trong Terminal chứ KHÔNG làm sập màn hình của người dùng.
    try {
      await UserActivity.create({
        user_id: user_id,
        action_type: 'rate',
        book_id: book_id
      });
    } catch (activityError) {
      console.log("⚠️ Cảnh báo nhẹ: Không thể lưu UserActivity. Vui lòng kiểm tra lại cấu hình Enum trong Model UserActivity.", activityError.message);
    }

    // 5. Trả về thành công
    res.status(201).json({ message: "Đánh giá thành công", review: populatedReview });
  } catch (error) {
    console.error("Lỗi Backend addReview:", error);
    res.status(500).json({ error: error.message });
  }
};

// [GET] Lấy danh sách đánh giá của 1 cuốn sách (Ai cũng xem được)
exports.getBookReviews = async (req, res) => {
  try {
    const { book_id } = req.params;
    
    // Chỉ lấy những đánh giá có trạng thái 'visible' (Đang hiển thị)
    const reviews = await Review.find({ book_id, status: 'visible' })
      .populate('user_id', 'fullName username'); 
      
    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// CHỨC NĂNG NÂNG CẤP: DÀNH CHO ĐỘC GIẢ (CHÍNH CHỦ)
// ==========================================

// [PUT] Độc giả cập nhật đánh giá cá nhân
exports.updateReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const { rating, comment } = req.body;
    const user_id = req.user._id; // Lấy từ Token bảo mật

    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ message: "Không tìm thấy nội dung đánh giá." });

    // Kiểm tra bảo mật: ID người sửa phải trùng với ID người viết đánh giá
    if (review.user_id.toString() !== user_id.toString()) {
      return res.status(403).json({ message: "Bạn không có quyền chỉnh sửa đánh giá này!" });
    }

    // Tiến hành cập nhật nội dung mới
    review.rating = rating;
    review.comment = comment;
    await review.save();

    // Nạp lại thông tin người dùng để đồng bộ Frontend
    await review.populate('user_id', 'fullName username');

    res.status(200).json({ message: "Cập nhật đánh giá thành công!", review });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// [DELETE] Độc giả tự xóa đánh giá cá nhân
exports.deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const user_id = req.user._id;

    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ message: "Không tìm thấy nội dung đánh giá." });

    // Kiểm tra bảo mật: Chỉ chính chủ mới có quyền xóa bài
    if (review.user_id.toString() !== user_id.toString()) {
      return res.status(403).json({ message: "Bạn không có quyền xóa đánh giá này!" });
    }

    // Xóa hoàn toàn bản ghi khỏi Database
    await Review.findByIdAndDelete(reviewId);

    res.status(200).json({ message: "Đã xóa bài đánh giá của bạn thành công." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// CÁC HÀM DÀNH RIÊNG CHO QUẢN TRỊ VIÊN (ADMIN)
// ==========================================

// [GET] Lấy tất cả đánh giá trên toàn hệ thống
exports.getAllReviewsAdmin = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('user_id', 'fullName username email')
      .populate('book_id', 'title cover_image')
      .sort({ createdAt: -1 }); 
      
    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// [PUT] Ẩn / Hiện đánh giá (Thay thế cho hàm xóa của Admin)
exports.toggleReviewVisibilityAdmin = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Không tìm thấy đánh giá" });
    
    // Đảo ngược trạng thái
    review.status = review.status === 'visible' ? 'hidden' : 'visible';
    await review.save();

    const actionText = review.status === 'hidden' ? 'đã ẩn' : 'đã hiển thị lại';
    res.status(200).json({ message: `Đánh giá này ${actionText} thành công!` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};