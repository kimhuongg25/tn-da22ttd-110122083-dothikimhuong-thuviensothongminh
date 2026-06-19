import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

// 1. IMPORT COMPONENT TÌM KIẾM THÔNG MINH
import SmartSearchBar from '../components/SmartSearchBar';

const HomePage = () => {
  const { user } = useContext(AuthContext);
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState('');

  // 2. TÁCH HÀM GỌI API ĐỂ CÓ THỂ TÁI SỬ DỤNG KHI "XÓA BỘ LỌC"
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [booksRes, categoriesRes] = await Promise.all([
        api.get('/books'),
        api.get('/categories')
      ]);
      setBooks(booksRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // 3. HÀM NHẬN KẾT QUẢ TỪ SMART SEARCH BAR TRUYỀN LÊN
  const handleSearchResults = (results) => {
    setBooks(results); // Cập nhật lại danh sách sách bằng dữ liệu tìm kiếm được
  };

  // 4. HÀM XÓA BỘ LỌC (Lấy lại toàn bộ sách ban đầu)
  const handleClearFilters = () => {
    setSelectedCategory('');
    fetchAllData(); 
  };

  // 5. LOGIC LỌC (Chỉ còn lọc theo Danh mục, việc tìm kiếm chữ/ảnh/giọng nói đã do Backend lo)
  const filteredBooks = books.filter(book => {
    const bookCatId = book.category_id?._id || book.category_id;
    return selectedCategory === '' || bookCatId === selectedCategory;
  });

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', fontFamily: "'Times New Roman', Times, serif" }}>
      <style>{`
        .book-card {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .book-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 20px -5px rgba(0,0,0,0.15), 0 8px 10px -5px rgba(0,0,0,0.04) !important;
        }
        .btn-detail {
          transition: background-color 0.2s ease, transform 0.1s ease;
        }
        .btn-detail:hover {
          background-color: #4338ca !important;
        }
        .btn-detail:active {
          transform: scale(0.96);
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;  
          overflow: hidden;
        }
        .genre-select:focus {
          border-color: #4f46e5 !important;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
          outline: none;
        }
      `}</style>

      {/* HERO BANNER */}
      <div style={{ backgroundColor: '#111827', color: 'white', padding: '60px 20px', textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: '800', margin: '0 0 15px 0', letterSpacing: '-0.02em' }}>
          Khám Phá <span style={{ color: '#818cf8' }}>Tri Thức</span>
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '18px', maxWidth: '600px', margin: '0 auto', lineHeight: '1.5' }}>
          Hệ thống thư viện thông minh. Tìm kiếm bằng văn bản, hình ảnh.
        </p>
      </div>

      <div style={{ padding: '0 20px 60px 20px', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* THANH TÌM KIẾM VÀ LỌC */}
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '30px', display: 'flex', gap: '15px', flexWrap: 'wrap', border: '1px solid #e5e7eb', alignItems: 'center' }}>
          
          <div style={{ flex: '1 1 500px' }}>
            {/* 6. NHÚNG SMART SEARCH BAR VÀO ĐÂY */}
            <SmartSearchBar onSearchResults={handleSearchResults} />
          </div>

          <div style={{ flex: '0 0 250px' }}>
            <select 
              className="genre-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px', cursor: 'pointer', backgroundColor: 'white', boxSizing: 'border-box', transition: 'all 0.2s', fontFamily: "'Times New Roman', Times, serif" }}
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>{cat.category_name}</option>
              ))}
            </select>
          </div>

          {/* Nút Xóa Bộ Lọc (Dành cho trường hợp muốn hủy kết quả tìm kiếm/lọc) */}
          <div style={{ flex: '0 0 auto' }}>
             <button 
                onClick={handleClearFilters} 
                style={{ padding: '12px 16px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', color: '#4b5563', fontWeight: 'bold', fontFamily: "'Times New Roman', Times, serif" }}
              >
                Tải lại
             </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '22px', color: '#1f2937', margin: 0, fontWeight: '700' }}>
            {selectedCategory !== '' ? 'Kết Quả Lọc' : '📚 Sách Mới Cập Nhật'}
          </h2>
          <span style={{ color: '#6b7280', fontSize: '14px', fontWeight: 'bold' }}>Tìm thấy {filteredBooks.length} cuốn</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#6b7280', fontSize: '18px', fontWeight: 'bold' }}>
            <div style={{ fontSize: '30px', marginBottom: '15px' }}>⏳</div>
            Đang tải dữ liệu sách...
          </div>
        ) : filteredBooks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', backgroundColor: 'white', borderRadius: '12px', color: '#6b7280', border: '1px dashed #d1d5db' }}>
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>🕵️‍♂️</div>
            <p style={{ fontSize: '16px', margin: 0, fontWeight: 'bold' }}>Không tìm thấy cuốn sách nào phù hợp với yêu cầu của bạn.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '25px' }}>
            {filteredBooks.map((book) => (
              <div 
                key={book._id} 
                className="book-card"
                style={{ backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' }}
              >
                <div 
                  onClick={() => navigate(`/book/${book._id}`)}
                  style={{ cursor: 'pointer', height: '320px', backgroundColor: '#f9fafb', position: 'relative' }}
                >
                  {book.cover_image ? (
                    <img src={book.cover_image} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '14px' }}>Chưa có ảnh</div>
                  )}
                  {(book.category_id?.category_name || book.genre) && (
                    <span style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: 'rgba(17, 24, 39, 0.8)', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', backdropFilter: 'blur(4px)' }}>
                      {book.category_id?.category_name || book.genre?.split(',')[0]}
                    </span>
                  )}
                </div>

                <div style={{ padding: '20px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 
                    onClick={() => navigate(`/book/${book._id}`)}
                    className="line-clamp-2" 
                    style={{ fontSize: '18px', margin: '0 0 8px 0', color: '#111827', cursor: 'pointer', lineHeight: '1.4', fontWeight: 'bold' }}
                    title={book.title}
                  >
                    {book.title}
                  </h3>
                  <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 15px 0', fontWeight: 'bold' }}>
                    {book.author}
                  </p>
                  
                  <div style={{ marginTop: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', fontSize: '13px', fontWeight: 'bold' }}>
                      <span style={{ 
                        display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', marginRight: '6px',
                        backgroundColor: book.available_quantity > 0 ? '#10b981' : '#ef4444' 
                      }}></span>
                      <span style={{ color: book.available_quantity > 0 ? '#059669' : '#dc2626' }}>
                        {book.available_quantity > 0 ? `Sẵn sàng mượn (${book.available_quantity})` : 'Tạm hết sách'}
                      </span>
                    </div>

                    <button 
                      className="btn-detail"
                      onClick={() => navigate(`/book/${book._id}`)} 
                      style={{ width: '100%', padding: '12px 0', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', fontFamily: "'Times New Roman', Times, serif" }}
                    >
                      Xem Chi Tiết
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;