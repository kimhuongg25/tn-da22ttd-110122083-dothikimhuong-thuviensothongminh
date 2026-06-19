import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const BookDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [book, setBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  // 1. STATE ĐIỀU KHIỂN SỬA ĐÁNH GIÁ (INLINE EDITING)
  const [editingId, setEditingId] = useState(null); 
  const [editComment, setEditComment] = useState('');
  const [editRating, setEditRating] = useState(5);

  // STATE ĐIỀU KHIỂN FORM MƯỢN SÁCH
  const [showBorrowForm, setShowBorrowForm] = useState(false);
  const [borrowDate, setBorrowDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [isBorrowing, setIsBorrowing] = useState(false);

  // 2. TÁCH HÀM LẤY ĐÁNH GIÁ ĐỂ TÁI SỬ DỤNG
  const fetchReviews = useCallback(async () => {
    try {
      const reviewRes = await api.get(`/reviews/${id}`);
      setReviews(reviewRes.data);
    } catch (error) {
      console.error('Lỗi khi tải đánh giá:', error);
    }
  }, [id]);

  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        const bookRes = await api.get(`/books/${id}`);
        setBook(bookRes.data);
        fetchReviews(); // Gọi hàm lấy đánh giá
      } catch (error) {
        console.error('Lỗi khi tải chi tiết sách:', error);
      }
    };
    fetchBookDetails();
  }, [id, fetchReviews]);

  // ==========================================
  // CÁC HÀM XỬ LÝ ĐÁNH GIÁ CỦA ĐỘC GIẢ
  // ==========================================

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert("Vui lòng đăng nhập để đánh giá.");

    try {
      await api.post('/reviews', { book_id: id, rating, comment });
      alert("Đánh giá thành công!");
      setComment(''); 
      setRating(5);
      fetchReviews(); // Cập nhật lại danh sách ngay lập tức
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi khi gửi đánh giá");
    }
  };

  const handleStartEdit = (review) => {
    setEditingId(review._id);
    setEditComment(review.comment);
    setEditRating(review.rating);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditComment('');
  };

  const handleUpdateReview = async (reviewId) => {
    if (!editComment.trim()) return alert("Vui lòng nhập nội dung đánh giá.");
    
    try {
      const res = await api.put(`/reviews/${reviewId}`, {
        rating: Number(editRating),
        comment: editComment
      });
      alert(res.data.message);
      setEditingId(null); 
      fetchReviews(); 
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi khi cập nhật đánh giá");
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài đánh giá này không?")) return;
    
    try {
      const res = await api.delete(`/reviews/${reviewId}`);
      alert(res.data.message);
      fetchReviews(); 
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi khi xóa đánh giá");
    }
  };

  // ==========================================
  // CÁC HÀM XỬ LÝ MƯỢN SÁCH & YÊU THÍCH
  // ==========================================

  const handleOpenBorrowForm = () => {
    if (!user) {
      alert("Bạn cần đăng nhập để mượn sách!");
      return navigate('/login');
    }
    setShowBorrowForm(true);
  };

  const submitBorrowRequest = async (e) => {
    e.preventDefault();
    if (!borrowDate || !returnDate) return alert('Vui lòng chọn đầy đủ ngày!');
    if (new Date(returnDate) < new Date(borrowDate)) return alert('Ngày trả không hợp lệ!');

    setIsBorrowing(true);
    try {
      await api.post('/borrows', { 
        book_id: id,
        expected_borrow_date: borrowDate,
        expected_return_date: returnDate
      });
      
      alert("🎉 Đã tạo phiếu mượn thành công! Vui lòng chờ Thư viện phê duyệt.");
      setShowBorrowForm(false); 
      setBorrowDate('');
      setReturnDate('');
      
      // Tải lại dữ liệu sách để cập nhật số lượng
      const bookRes = await api.get(`/books/${id}`);
      setBook(bookRes.data);
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi khi tạo phiếu mượn");
    } finally {
      setIsBorrowing(false);
    }
  };

  const handleFavorite = async () => {
    if (!user) {
      alert("Bạn cần đăng nhập để yêu thích sách!");
      return navigate('/login');
    }
    try {
      const res = await api.post('/users/favorites', { book_id: id });
      alert(res.data.message);
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi khi cập nhật yêu thích");
    }
  };

  if (!book) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f3f4f6' }}>
      <h2 style={{ color: '#4b5563', fontFamily: "'Times New Roman', Times, serif" }}>Đang tải dữ liệu...</h2>
    </div>
  );

  const cardStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
    padding: '30px',
    marginBottom: '30px'
  };

  const labelStyle = {
    fontSize: '14px', color: '#6b7280', fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'block'
  };

  const valueStyle = {
    fontSize: '16px', color: '#111827', fontWeight: '500', margin: '0 0 16px 0'
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '40px 20px', fontFamily: "'Times New Roman', Times, serif" }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        <button 
          onClick={() => navigate('/')} 
          style={{ marginBottom: '20px', padding: '10px 16px', backgroundColor: '#ffffff', color: '#4b5563', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', fontFamily: "'Times New Roman', Times, serif" }}
        >
          <span style={{ marginRight: '8px' }}>⬅</span> Quay lại Trang chủ
        </button>

        <div style={{ ...cardStyle, display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
          
          <div style={{ flex: '1 1 300px', maxWidth: '350px' }}>
            <div style={{ width: '100%', aspectRatio: '2/3', backgroundColor: '#f3f4f6', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
              {book.cover_image ? (
                <img src={book.cover_image} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '18px' }}>Chưa có ảnh bìa</div>
              )}
            </div>
          </div>
          
          <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '20px', marginBottom: '20px' }}>
              <h1 style={{ color: '#111827', fontSize: '32px', fontWeight: '800', margin: '0 0 10px 0', lineHeight: '1.2' }}>{book.title}</h1>
              <p style={{ color: '#4f46e5', fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{book.author}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div><span style={labelStyle}>Thể loại</span><p style={valueStyle}>{book.genre || "Đang cập nhật"}</p></div>
              <div><span style={labelStyle}>Nhà xuất bản</span><p style={valueStyle}>{book.publisher || "Đang cập nhật"}</p></div>
              <div><span style={labelStyle}>Năm xuất bản</span><p style={valueStyle}>{book.publish_year || "Đang cập nhật"}</p></div>
              <div><span style={labelStyle}>Số trang</span><p style={valueStyle}>{book.page_count ? `${book.page_count} trang` : "Đang cập nhật"}</p></div>
            </div>

            <div style={{ marginTop: '10px', backgroundColor: '#ecfdf5', padding: '12px 15px', borderRadius: '8px', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '20px', marginRight: '12px' }}>📍</span>
              <div>
                <span style={{ fontSize: '13px', color: '#065f46', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Vị trí kệ sách</span>
                <span style={{ color: '#047857', fontSize: '16px', fontWeight: 'bold' }}>
                  {book.shelf_location ? book.shelf_location : 'Chưa xác định (Vui lòng hỏi thủ thư)'}
                </span>
              </div>
            </div>

            <div style={{ marginTop: '15px', backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
              <span style={labelStyle}>Tóm tắt nội dung</span>
              <p style={{ color: '#4b5563', fontSize: '16px', lineHeight: '1.6', margin: 0, textAlign: 'justify' }}>
                {book.description || "Chưa có mô tả chi tiết cho cuốn sách này."}
              </p>
            </div>
            
            <div style={{ marginTop: 'auto', paddingTop: '30px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <span style={{ fontSize: '16px', color: '#4b5563', fontWeight: 'bold' }}>Trạng thái kho: </span>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: book.available_quantity > 0 ? '#10b981' : '#ef4444' }}>
                  {book.available_quantity > 0 ? `Còn ${book.available_quantity} cuốn` : 'Tạm hết sách'}
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                {user?.role === 'admin' ? (
                  <button 
                    onClick={() => navigate('/admin')}
                    style={{ padding: '14px 28px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', boxShadow: '0 4px 6px rgba(245, 158, 11, 0.3)', fontFamily: "'Times New Roman', Times, serif" }}
                  >
                    ✏️ Quản lý & Chỉnh sửa sách
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={handleFavorite}
                      style={{ padding: '14px 20px', backgroundColor: '#ffffff', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', transition: 'all 0.2s', fontFamily: "'Times New Roman', Times, serif" }}
                    >
                      ❤️ Yêu Thích
                    </button>
                    
                    <button 
                      onClick={handleOpenBorrowForm}
                      disabled={book.available_quantity < 1}
                      style={{ 
                        padding: '14px 28px', 
                        backgroundColor: book.available_quantity < 1 ? '#d1d5db' : '#4f46e5', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '8px', 
                        cursor: book.available_quantity < 1 ? 'not-allowed' : 'pointer', 
                        fontWeight: 'bold',
                        fontSize: '16px',
                        boxShadow: book.available_quantity < 1 ? 'none' : '0 4px 6px rgba(79, 70, 229, 0.3)',
                        fontFamily: "'Times New Roman', Times, serif"
                      }}
                    >
                      {book.available_quantity < 1 ? '⏳ HẾT SÁCH' : '📚 TẠO PHIẾU MƯỢN'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ======================================= */}
        {/* KHU VỰC ĐÁNH GIÁ TỪ ĐỘC GIẢ */}
        {/* ======================================= */}
        <div style={cardStyle}>
          <h3 style={{ color: '#111827', fontSize: '22px', fontWeight: 'bold', margin: '0 0 25px 0', borderBottom: '2px solid #f3f4f6', paddingBottom: '10px' }}>
            Đánh giá từ độc giả ({reviews.length})
          </h3>
          
          {/* FORM THÊM ĐÁNH GIÁ MỚI */}
          {user?.role === 'admin' ? (
            <div style={{ backgroundColor: '#fffbeb', padding: '20px', borderRadius: '8px', border: '1px solid #fde047', color: '#b45309', marginBottom: '40px', fontWeight: 'bold' }}>
              ⚠️ Bạn đang đăng nhập bằng tài khoản Quản trị viên. Tính năng tương tác bình luận và mượn sách chỉ dành cho Độc giả.
            </div>
          ) : user?.role === 'user' ? (
            <form onSubmit={handleReviewSubmit} style={{ marginBottom: '40px', backgroundColor: '#f9fafb', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#374151', fontSize: '18px' }}>Viết đánh giá của bạn</h4>
              
              <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ fontWeight: 'bold', color: '#4b5563', fontSize: '15px' }}>Chất lượng sách:</label>
                <select 
                  value={rating} 
                  onChange={(e) => setRating(e.target.value)} 
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none', fontWeight: 'bold', color: '#f59e0b', backgroundColor: '#fff', cursor: 'pointer', fontFamily: "'Times New Roman', Times, serif" }}
                >
                  <option value="5">⭐⭐⭐⭐⭐ Tuyệt vời</option>
                  <option value="4">⭐⭐⭐⭐ Rất tốt</option>
                  <option value="3">⭐⭐⭐ Khá ổn</option>
                  <option value="2">⭐⭐ Tạm được</option>
                  <option value="1">⭐ Thất vọng</option>
                </select>
              </div>

              <textarea 
                placeholder="Chia sẻ cảm nhận của bạn về cuốn sách này..." 
                value={comment} 
                onChange={(e) => setComment(e.target.value)} 
                required 
                style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', height: '100px', resize: 'vertical', fontSize: '16px', boxSizing: 'border-box', marginBottom: '15px', fontFamily: "'Times New Roman', Times, serif" }} 
              />
              
              <div style={{ textAlign: 'right' }}>
                <button type="submit" style={{ padding: '12px 24px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', fontFamily: "'Times New Roman', Times, serif" }}>
                  Gửi Đánh Giá
                </button>
              </div>
            </form>
          ) : (
            <div style={{ backgroundColor: '#fffedd', padding: '15px 20px', borderRadius: '8px', border: '1px solid #fde047', color: '#854d0e', marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold' }}>Vui lòng đăng nhập để để lại đánh giá cho cuốn sách này.</span>
              <button onClick={() => navigate('/login')} style={{ padding: '8px 16px', backgroundColor: '#ca8a04', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontFamily: "'Times New Roman', Times, serif" }}>Đăng nhập</button>
            </div>
          )}

          {/* DANH SÁCH ĐÁNH GIÁ (CÓ CHỨC NĂNG SỬA/XÓA) */}
          {reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
              <span style={{ fontSize: '40px', display: 'block', marginBottom: '10px' }}>💬</span>
              <span style={{ fontWeight: 'bold' }}>Chưa có đánh giá nào. Hãy là người đầu tiên nhận xét cuốn sách này!</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {reviews.map((rev) => {
                const isOwner = user && rev.user_id?._id === user._id;
                const isCurrentEditing = editingId === rev._id;

                return (
                  <div key={rev._id} style={{ display: 'flex', gap: '15px', paddingBottom: '20px', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ width: '45px', height: '45px', backgroundColor: '#e0e7ff', color: '#4f46e5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', flexShrink: 0 }}>
                      {(rev.user_id?.fullName || rev.user_id?.username || 'U').charAt(0).toUpperCase()}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <strong style={{ color: '#111827', fontSize: '16px' }}>{rev.user_id?.fullName || rev.user_id?.username || 'Người dùng ẩn danh'}</strong>
                        <span style={{ color: '#9ca3af', fontSize: '14px' }}>
                          {new Date(rev.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>

                      {/* NẾU ĐANG BẤM SỬA BÀI NÀY */}
                      {isCurrentEditing ? (
                        <div style={{ backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px', border: '1px dashed #d1d5db', marginTop: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                            <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Sửa số sao:</label>
                            <select 
                              value={editRating} 
                              onChange={(e) => setEditRating(e.target.value)}
                              style={{ padding: '6px', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: "'Times New Roman', Times, serif" }}
                            >
                              {[5, 4, 3, 2, 1].map(num => <option key={num} value={num}>{num} sao</option>)}
                            </select>
                          </div>
                          <textarea 
                            value={editComment}
                            onChange={(e) => setEditComment(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #4f46e5', minHeight: '80px', boxSizing: 'border-box', fontFamily: "'Times New Roman', Times, serif", fontSize: '15px', marginBottom: '10px' }}
                          />
                          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => handleUpdateReview(rev._id)} style={{ backgroundColor: '#10b981', color: 'white', padding: '6px 14px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontFamily: "'Times New Roman', Times, serif" }}>
                              Lưu
                            </button>
                            <button onClick={handleCancelEdit} style={{ backgroundColor: '#9ca3af', color: 'white', padding: '6px 14px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontFamily: "'Times New Roman', Times, serif" }}>
                              Hủy
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* HIỂN THỊ BÌNH THƯỜNG */
                        <>
                          <div style={{ color: '#fbbf24', fontSize: '16px', marginBottom: '8px' }}>
                            {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                          </div>
                          <p style={{ margin: 0, color: '#4b5563', fontSize: '16px', lineHeight: '1.5', fontStyle: rev.status === 'hidden' ? 'italic' : 'normal' }}>
                            {rev.comment}
                          </p>

                          {/* HIỂN THỊ 2 NÚT THAO TÁC NẾU LÀ CHÍNH CHỦ */}
                          {isOwner && (
                            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                              <button 
                                onClick={() => handleStartEdit(rev)}
                                style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', padding: 0, fontFamily: "'Times New Roman', Times, serif" }}
                              >
                                ✏️ Sửa bài
                              </button>
                              <button 
                                onClick={() => handleDeleteReview(rev._id)}
                                style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', padding: 0, fontFamily: "'Times New Roman', Times, serif" }}
                              >
                                🗑️ Xóa bài
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* MODAL POP-UP TẠO PHIẾU MƯỢN SÁCH */}
      {showBorrowForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', width: '100%', maxWidth: '450px', position: 'relative' }}>
            
            <button 
              onClick={() => setShowBorrowForm(false)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}
            >
              ✖
            </button>

            <h3 style={{ color: '#1976d2', marginTop: 0, fontSize: '24px', textAlign: 'center', fontWeight: 'bold' }}>📝 Tạo Phiếu Mượn</h3>
            <p style={{ textAlign: 'center', color: '#4b5563', fontWeight: 'bold', marginBottom: '20px' }}>{book.title}</p>
            
            <form onSubmit={submitBorrowRequest} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ fontWeight: 'bold', color: '#374151', display: 'block', marginBottom: '8px' }}>Ngày dự kiến đến lấy sách:</label>
                <input 
                  type="date" 
                  value={borrowDate} 
                  min={today}
                  onChange={(e) => {
                    setBorrowDate(e.target.value);
                    if (returnDate && new Date(returnDate) < new Date(e.target.value)) {
                      setReturnDate('');
                    }
                  }} 
                  style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box', fontFamily: "'Times New Roman', Times, serif", fontSize: '16px' }} 
                  required 
                />
              </div>

              <div>
                <label style={{ fontWeight: 'bold', color: '#374151', display: 'block', marginBottom: '8px' }}>Ngày dự kiến trả sách:</label>
                <input 
                  type="date" 
                  value={returnDate} 
                  min={borrowDate || today}
                  onChange={(e) => setReturnDate(e.target.value)} 
                  style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box', fontFamily: "'Times New Roman', Times, serif", fontSize: '16px' }} 
                  required 
                  disabled={!borrowDate} 
                />
              </div>

              <button 
                type="submit" 
                disabled={isBorrowing}
                style={{ 
                  backgroundColor: '#10b981', color: 'white', padding: '14px', 
                  border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', 
                  cursor: isBorrowing ? 'not-allowed' : 'pointer', marginTop: '10px',
                  fontFamily: "'Times New Roman', Times, serif"
                }}
              >
                {isBorrowing ? 'Đang gửi...' : 'Xác Nhận Đăng Ký'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default BookDetailPage;