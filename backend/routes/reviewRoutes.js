const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

// Cần token để thêm đánh giá
router.post('/', protect, reviewController.addReview);

// Xem đánh giá của 1 cuốn sách qua ID sách (không cần token)
router.get('/:book_id', reviewController.getBookReviews);

router.get('/admin/all', protect, reviewController.getAllReviewsAdmin);
// Xóa một đánh giá vi phạm (Dành cho Admin)
router.put('/:id/toggle-visibility', protect, reviewController.toggleReviewVisibilityAdmin);
router.put('/:id', protect, reviewController.updateReview);
router.delete('/:id', protect, reviewController.deleteReview);
module.exports = router;