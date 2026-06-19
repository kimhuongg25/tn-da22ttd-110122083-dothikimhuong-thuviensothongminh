const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');

const { protect } = require('../middleware/authMiddleware');
const upload = require('../config/cloudinary'); // Dùng để lưu ảnh bìa thật lên Cloud

// BỔ SUNG: Import multer và cấu hình lưu tạm vào RAM cho AI đọc (OCR)
const multer = require('multer');
const uploadMemory = multer({ storage: multer.memoryStorage() });

// Khai báo middleware protect. Dùng 'optional' nghĩa là không có token vẫn cho xem/tìm, nhưng có token thì sẽ được lưu hành vi.
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protectOptional = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      console.log("Token không hợp lệ, tiếp tục như người dùng ẩn danh");
    }
  }
  next();
};

// ==========================================
// CÁC ROUTE CHO KHÁCH / ĐỘC GIẢ
// ==========================================
router.get('/', bookController.getAllBooks);
router.get('/search', protectOptional, bookController.searchBooks);

// MỚI: Route tìm kiếm bằng hình ảnh bìa (Sử dụng uploadMemory)
router.post('/search-image', uploadMemory.single('image'), bookController.searchByImage);

router.get('/:id', protectOptional, bookController.getBookById);

// ==========================================
// CÁC ROUTE DÀNH RIÊNG CHO ADMIN 
// ==========================================
router.post('/', protect, upload.single('cover_image'), bookController.createBook);
router.put('/:id', protect, upload.single('cover_image'), bookController.updateBook);
router.delete('/:id', protect, bookController.deleteBook);

module.exports = router;