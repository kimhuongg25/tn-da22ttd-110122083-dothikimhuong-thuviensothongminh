import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import axios from 'axios';

// =======================================================
// COMPONENT TỰ BUILD: DROPDOWN THÔNG MINH CÓ THANH TÌM KIẾM
// =======================================================
const SearchableDropdown = ({ options = [], value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedLabel = options.find(o => o.value === value)?.label || '';

  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    o.value.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Ô hiển thị chính */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%', padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: '8px',
          backgroundColor: '#f9fafb', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', fontFamily: "'Times New Roman', Times, serif", minHeight: '46px', boxSizing: 'border-box'
        }}
      >
        <span style={{ color: selectedLabel ? '#111827' : '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '15px' }}>
          {selectedLabel || placeholder}
        </span>
        <span style={{ color: '#9ca3af', fontSize: '12px' }}>▼</span>
      </div>

      {/* Menu thả xuống chứa ô tìm kiếm */}
      {isOpen && (
        <>
          {/* Lớp phủ vô hình để bắt sự kiện click ra ngoài vùng Dropdown */}
          <div 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }} 
            onClick={() => { setIsOpen(false); setSearch(''); }} 
          />
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
            backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: '280px', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '10px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', borderRadius: '8px 8px 0 0' }}>
              <input
                type="text"
                autoFocus
                placeholder="🔍 Nhập từ khóa để lọc..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #4f46e5', outline: 'none', boxSizing: 'border-box', fontFamily: "'Times New Roman', Times, serif", fontSize: '14px' }}
              />
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, overflowY: 'auto', flex: 1 }}>
              {filteredOptions.length > 0 ? filteredOptions.map(opt => (
                <li
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  style={{ padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: '15px', color: '#374151', fontFamily: "'Times New Roman', Times, serif" }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#e0e7ff'; e.currentTarget.style.color = '#4338ca'; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#374151'; }}
                >
                  {opt.label}
                </li>
              )) : (
                <li style={{ padding: '12px 14px', color: '#6b7280', textAlign: 'center', fontStyle: 'italic', fontSize: '14px' }}>Không có gợi ý phù hợp</li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

// =======================================================
// COMPONENT CHÍNH CỦA TRANG
// =======================================================
const AdminPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');

  // LOGIC LỌC SÁCH NÂNG CẤP: TÌM KIẾM TOÀN CẦU (GLOBAL MULTI-FIELD SEARCH)
  const filteredBooks = books.filter(book => {
    const searchLower = searchTerm.toLowerCase().trim();
    if (!searchLower) return true;

    const categoryName = book.category_id?.category_name || 
                         categories.find(c => c._id === book.category_id)?.category_name || 
                         book.genre || '';

    const priceStr = book.book_price ? book.book_price.toString() : '0';
    const quantityStr = book.available_quantity ? book.available_quantity.toString() : '0';
    const publishYearStr = book.publish_year ? book.publish_year.toString() : '';

    return (
      (book.title && book.title.toLowerCase().includes(searchLower)) ||
      (book.author && book.author.toLowerCase().includes(searchLower)) ||
      (categoryName && categoryName.toLowerCase().includes(searchLower)) ||
      (book.publisher && book.publisher.toLowerCase().includes(searchLower)) ||
      (publishYearStr && publishYearStr.includes(searchLower)) ||
      (priceStr && priceStr.includes(searchLower)) ||
      (book.shelf_location && book.shelf_location.toLowerCase().includes(searchLower)) ||
      (quantityStr && quantityStr.includes(searchLower))
    );
  });
  
  const [categories, setCategories] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editBookId, setEditBookId] = useState(null);
  const [coverFile, setCoverFile] = useState(null);

  const [zone, setZone] = useState('Khu A');
  const [shelf, setShelf] = useState('Kệ 01');
  const [tier, setTier] = useState('Ngăn 01');

  const [newBook, setNewBook] = useState({
    title: '', author: '', description: '', available_quantity: 1, cover_image: '',
    publish_year: '', publisher: '', genre: '', page_count: '',
    shelf_location: '', book_price: 50000, category_id: '' 
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      alert('Truy cập bị từ chối. Chỉ dành cho Quản trị viên!');
      navigate('/');
      return;
    }
    fetchBooks();
    fetchCategories(); 
  }, [user, navigate]);

  const fetchBooks = async () => {
    try {
      const res = await api.get('/books');
      setBooks(res.data);
    } catch (error) {
      console.error('Lỗi khi tải danh sách sách', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (error) {
      console.error("Không lấy được danh mục sách", error);
    }
  };

  const handleAutoFill = async () => {
    if (!newBook.title) {
      return alert('Vui lòng nhập Tên sách trước khi tra cứu!');
    }
    
    setIsSearching(true);
    const searchQuery = encodeURIComponent(newBook.title);

    const getShortDescription = (desc) => {
      if (!desc) return 'Chưa có mô tả cho cuốn sách này.';
      let text = '';
      if (typeof desc === 'string') text = desc;
      else if (typeof desc === 'object') text = desc.value || desc.text || JSON.stringify(desc);
      text = text.replace(/<\/?[^>]+(>|$)/g, "");
      if (!text.trim()) return 'Chưa có mô tả cho cuốn sách này.';
      if (text.length > 250) return text.substring(0, 250).trim() + '...';
      return text;
    };

    try {
      const googleRes = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=intitle:${searchQuery}`);
      if (googleRes.data.items && googleRes.data.items.length > 0) {
        const bookData = googleRes.data.items[0].volumeInfo;
        setNewBook(prev => ({
          ...prev,
          author: bookData.authors ? bookData.authors.join(', ') : 'Chưa rõ',
          description: getShortDescription(bookData.description),
          cover_image: bookData.imageLinks?.thumbnail || '',
          publish_year: bookData.publishedDate ? bookData.publishedDate.substring(0, 4) : '',
          publisher: bookData.publisher || '',
          genre: bookData.categories ? bookData.categories[0] : '', 
          page_count: bookData.pageCount || ''
        }));
        setIsSearching(false);
        return alert('🎉 Đã tìm thấy thông tin tự động từ Google Books! Vui lòng tự chọn Danh Mục phù hợp ở ô bên dưới.');
      }
    } catch (googleError) {
      console.warn("Google API bị quá tải. Đang tự động chuyển sang OpenLibrary...");
    }

    try {
      const openLibRes = await axios.get(`https://openlibrary.org/search.json?title=${searchQuery}&limit=1`);
      if (openLibRes.data.docs && openLibRes.data.docs.length > 0) {
        const bookData = openLibRes.data.docs[0];
        const coverImageUrl = bookData.cover_i ? `https://covers.openlibrary.org/b/id/${bookData.cover_i}-L.jpg` : '';
        let openLibDesc = '';
        if (bookData.key) {
          try {
            const detailRes = await axios.get(`https://openlibrary.org${bookData.key}.json`);
            openLibDesc = detailRes.data.description || '';
          } catch (e) {
            console.warn("Không lấy được mô tả chi tiết từ OpenLibrary");
          }
        }
        setNewBook(prev => ({
          ...prev,
          author: bookData.author_name ? bookData.author_name.join(', ') : 'Chưa rõ',
          description: getShortDescription(openLibDesc),
          cover_image: coverImageUrl,
          publish_year: bookData.first_publish_year ? bookData.first_publish_year.toString() : '',
          publisher: bookData.publisher ? bookData.publisher[0] : '',
          genre: bookData.subject ? bookData.subject.slice(0, 3).join(', ') : '',
          page_count: bookData.number_of_pages_median || ''
        }));
        setIsSearching(false);
        return alert('⚠️ Đã lấy dữ liệu từ OpenLibrary. Vui lòng tự chọn Danh Mục phù hợp ở ô bên dưới.');
      } else {
        alert('Không tìm thấy thông tin cuốn sách này trên cả 2 hệ thống!');
      }
    } catch (openLibError) {
      console.error("Lỗi toàn tập:", openLibError);
      alert('Lỗi kết nối mạng. Vui lòng thử lại sau.');
    }
    setIsSearching(false);
  };

  const handleEditClick = (book) => {
    setIsEditing(true);
    setEditBookId(book._id);
    setCoverFile(null); 
    
    if (book.shelf_location && book.shelf_location.includes(' - ')) {
      const parts = book.shelf_location.split(' - ');
      setZone(parts[0] || 'Khu A');
      setShelf(parts[1] || 'Kệ 01');
      setTier(parts[2] || 'Ngăn 01');
    } else {
      setZone('Khu A');
      setShelf('Kệ 01');
      setTier('Ngăn 01');
    }

    setNewBook({
      title: book.title || '',
      author: book.author || '',
      description: book.description || '',
      available_quantity: book.available_quantity || 1, 
      cover_image: book.cover_image || '', 
      publish_year: book.publish_year || '',
      publisher: book.publisher || '',
      genre: book.genre || '',
      page_count: book.page_count || '',
      shelf_location: book.shelf_location || '',
      book_price: book.book_price || 50000,
      category_id: book.category_id?._id || book.category_id || '' 
    });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const handleSubmitBook = async (e) => {
    e.preventDefault();
    
    if (!newBook.category_id) {
      return alert("Vui lòng chọn Danh Mục Hệ Thống!");
    }

    const finalShelfLocation = `${zone} - ${shelf} - ${tier}`;

    const formData = new FormData();
    formData.append('title', newBook.title);
    formData.append('author', newBook.author);
    formData.append('description', newBook.description);
    formData.append('available_quantity', Number(newBook.available_quantity) || 1);
    formData.append('publish_year', newBook.publish_year);
    formData.append('publisher', newBook.publisher);
    formData.append('genre', newBook.genre); 
    formData.append('page_count', newBook.page_count);
    formData.append('shelf_location', finalShelfLocation); 
    formData.append('book_price', Number(newBook.book_price) || 50000);
    formData.append('category_id', newBook.category_id);

    if (coverFile) {
      formData.append('cover_image', coverFile);
    } else if (newBook.cover_image) {
      formData.append('cover_image', newBook.cover_image); 
    }

    try {
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (isEditing) {
        await api.put(`/books/${editBookId}`, formData, config);
        alert('Cập nhật thông tin sách thành công!');
      } else {
        await api.post('/books', formData, config);
        alert('Thêm sách mới thành công!');
      }
      resetForm();
      fetchBooks();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi khi lưu sách');
    }
  };

  const resetForm = () => {
    setShowAddForm(false);
    setIsEditing(false);
    setEditBookId(null);
    setCoverFile(null);
    setZone('Khu A');
    setShelf('Kệ 01');
    setTier('Ngăn 01');
    setNewBook({ title: '', author: '', description: '', available_quantity: 1, cover_image: '', publish_year: '', publisher: '', genre: '', page_count: '', shelf_location: '', book_price: 50000, category_id: '' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa cuốn sách này khỏi hệ thống?')) {
      try {
        await api.delete(`/books/${id}`);
        alert('Xóa sách thành công!');
        fetchBooks();
      } catch (error) {
        alert(error.response?.data?.message || 'Lỗi khi xóa sách');
      }
    }
  };

  if (!user || user.role !== 'admin') return null;

  const categoryOptions = categories.map(c => ({ value: c._id, label: c.category_name }));
  
  const zoneOptions = [
    { value: 'Khu A', label: 'Khu A (CNTT & Lập trình)' },
    { value: 'Khu B', label: 'Khu B (Toán & KH cơ bản)' },
    { value: 'Khu C', label: 'Khu C (Quản trị & Kinh tế)' },
    { value: 'Khu D', label: 'Khu D (Luật & Chính trị)' },
    { value: 'Khu E', label: 'Khu E (Văn học - Nghệ thuật)' },
    { value: 'Khu F', label: 'Khu F (Ngoại ngữ - Từ điển)' },
  ];

  const shelfOptions = [...Array(30)].map((_, i) => {
    const num = (i + 1).toString().padStart(2, '0');
    return { value: `Kệ ${num}`, label: `Kệ ${num}` };
  });

  const tierOptions = [
    { value: 'Ngăn 01', label: 'Ngăn 01' },
    { value: 'Ngăn 02', label: 'Ngăn 02' },
    { value: 'Ngăn 03', label: 'Ngăn 03' },
    { value: 'Ngăn 04', label: 'Ngăn 04' },
    { value: 'Ngăn 05', label: 'Ngăn 05' },
    { value: 'Ngăn 06', label: 'Ngăn 06' },
    { value: 'Ngăn 07', label: 'Ngăn 07' },
    { value: 'Ngăn 08', label: 'Ngăn 08' },
    { value: 'Ngăn 09', label: 'Ngăn 09' },
    { value: 'Ngăn 10', label: 'Ngăn 10' },
  ];

  const inputStyle = { width: '100%', padding: '12px 14px', marginTop: '6px', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: '#f9fafb', fontSize: '15px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s ease-in-out', fontFamily: "'Times New Roman', Times, serif" };
  const labelStyle = { fontWeight: '600', color: '#374151', fontSize: '14px' };
  const btnStyle = { padding: '10px 16px', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Times New Roman', Times, serif" };

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '30px 20px', fontFamily: "'Times New Roman', Times, serif" }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ color: '#111827', fontSize: '28px', fontWeight: '800', margin: '0 0 8px 0' }}>Bảng Điều Khiển Quản Trị</h2>
          <p style={{ color: '#6b7280', margin: '0 0 20px 0', fontSize: '15px' }}>Quản lý hệ thống thư viện thông minh của bạn.</p>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={{ ...btnStyle, backgroundColor: '#4f46e5', color: 'white', boxShadow: '0 4px 6px rgba(79, 70, 229, 0.2)' }}>
              <span style={{ marginRight: '8px' }}>📦</span> Quản Lý Kho Sách
            </button>
            <button onClick={() => navigate('/admin/categories')} style={{ ...btnStyle, backgroundColor: '#ffffff', color: '#4b5563', border: '1px solid #d1d5db', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <span style={{ marginRight: '8px' }}>🗂️</span> Danh Mục Sách
            </button>
            <button onClick={() => navigate('/admin/borrows')} style={{ ...btnStyle, backgroundColor: '#ffffff', color: '#4b5563', border: '1px solid #d1d5db', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <span style={{ marginRight: '8px' }}>📋</span> Quản Lý Phiếu Mượn
            </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '20px 24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
          <h3 style={{ margin: 0, color: '#1f2937', fontSize: '18px', fontFamily: "'Times New Roman', Times, serif" }}>Kho Sách Hiện Tại</h3>
          
          <div style={{ flex: '1', minWidth: '320px', maxWidth: '480px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ flex: '1', position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>🔍</span>
              <input 
                type="text" 
                placeholder="Tìm kiếm theo tên, tác giả, kệ, giá..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', fontFamily: "'Times New Roman', Times, serif", fontSize: '15px', backgroundColor: '#f9fafb', boxSizing: 'border-box' }}
              />
            </div>
            
            <button 
              type="button" 
              onClick={() => setSearchTerm('')} 
              style={{ ...btnStyle, backgroundColor: '#ffffff', color: '#4b5563', border: '1px solid #d1d5db', padding: '10px 14px', whiteSpace: 'nowrap', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
            >
              ⬅ Quay về
            </button>
          </div>

          <button onClick={() => showAddForm ? resetForm() : setShowAddForm(true)} style={{ ...btnStyle, backgroundColor: showAddForm ? '#f3f4f6' : '#10b981', color: showAddForm ? '#374151' : 'white', boxShadow: showAddForm ? 'none' : '0 4px 6px rgba(16, 185, 129, 0.2)' }}>
            {showAddForm ? 'Thoát' : '+ Thêm Sách Mới'}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleSubmitBook} style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', marginBottom: '30px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 20px 0', color: '#111827', fontSize: '18px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
              {isEditing ? 'Sửa Thông Tin Sách' : 'Nhập Sách Mới'}
            </h4>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Tên sách (Nhập chính xác để tra cứu):</label>
                <input type="text" value={newBook.title} onChange={(e) => setNewBook({...newBook, title: e.target.value})} required style={{ ...inputStyle, border: '2px solid #4f46e5', backgroundColor: '#fff' }} placeholder="VD: Đắc Nhân Tâm..." />
              </div>
              {!isEditing && (
                <button type="button" onClick={handleAutoFill} disabled={isSearching} style={{ ...btnStyle, backgroundColor: '#8b5cf6', color: 'white', height: '46px', padding: '0 24px', boxShadow: '0 4px 6px rgba(139, 92, 246, 0.25)' }}>
                  {isSearching ? 'Đang tìm...' : '⚡ AI Tự Động Điền'}
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div><label style={labelStyle}>Tác giả:</label><input type="text" value={newBook.author} onChange={(e) => setNewBook({...newBook, author: e.target.value})} required style={inputStyle} /></div>
              
              <div style={{ marginTop: '6px' }}>
                <label style={labelStyle}>🗂️ Danh Mục Hệ Thống:</label>
                <div style={{ marginTop: '6px' }}>
                  <SearchableDropdown 
                    options={categoryOptions}
                    value={newBook.category_id}
                    onChange={(val) => setNewBook({...newBook, category_id: val})}
                    placeholder="-- Bấm vào để chọn hoặc tìm kiếm --"
                  />
                </div>
                {newBook.genre && <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>AI Gợi ý: {newBook.genre}</p>}
              </div>

              <div><label style={labelStyle}>Nhà xuất bản:</label><input type="text" value={newBook.publisher} onChange={(e) => setNewBook({...newBook, publisher: e.target.value})} style={inputStyle} /></div>
              <div><label style={labelStyle}>Năm xuất bản:</label><input type="text" value={newBook.publish_year} onChange={(e) => setNewBook({...newBook, publish_year: e.target.value})} style={inputStyle} /></div>
              <div><label style={labelStyle}>Số trang:</label><input type="number" value={newBook.page_count} onChange={(e) => setNewBook({...newBook, page_count: e.target.value})} style={inputStyle} /></div>
              <div><label style={labelStyle}>Số lượng kho:</label><input type="number" min="1" value={newBook.available_quantity} onChange={(e) => setNewBook({...newBook, available_quantity: e.target.value})} required style={inputStyle} /></div>
              
              <div>
                <label style={labelStyle}>💰 Giá trị sách (VNĐ):</label>
                <input type="number" min="0" value={newBook.book_price} onChange={(e) => setNewBook({...newBook, book_price: e.target.value})} required style={inputStyle} />
              </div>

              <div style={{ marginBottom: '16px', gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#374151', fontSize: '14px' }}>
                  📍 Vị trí lưu trữ sách (Khu - Kệ - Ngăn)
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <SearchableDropdown options={zoneOptions} value={zone} onChange={setZone} placeholder="Chọn Khu..." />
                  </div>
                  <div style={{ flex: 1 }}>
                    <SearchableDropdown options={shelfOptions} value={shelf} onChange={setShelf} placeholder="Chọn Kệ..." />
                  </div>
                  <div style={{ flex: 1 }}>
                    <SearchableDropdown options={tierOptions} value={tier} onChange={setTier} placeholder="Chọn Ngăn..." />
                  </div>
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
                  * Kết quả lưu thực tế: <strong style={{ color: '#4f46e5' }}>{zone} - {shelf} - {tier}</strong>
                </p>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>🖼️ Ảnh bìa sách:</label>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginTop: '6px' }}>
                  <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files[0])} style={{ ...inputStyle, marginTop: 0, flex: 1, padding: '9px', cursor: 'pointer' }} />
                  <span style={{ color: '#6b7280', fontWeight: 'bold', fontSize: '13px' }}>HOẶC</span>
                  <input type="text" value={newBook.cover_image} onChange={(e) => setNewBook({...newBook, cover_image: e.target.value})} style={{ ...inputStyle, marginTop: 0, flex: 1 }} placeholder="Nhập/dán link URL ảnh vào đây..." />
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: '20px' }}>
              <label style={labelStyle}>Mô tả nội dung:</label>
              <textarea value={newBook.description} onChange={(e) => setNewBook({...newBook, description: e.target.value})} style={{ ...inputStyle, height: '100px', resize: 'vertical' }} />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '25px', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
              <button type="button" onClick={resetForm} style={{ ...btnStyle, backgroundColor: '#f3f4f6', color: '#4b5563', marginRight: '12px' }}>Hủy bỏ</button>
              <button type="submit" style={{ ...btnStyle, backgroundColor: isEditing ? '#f59e0b' : '#4f46e5', color: 'white', padding: '12px 30px' }}>
                {isEditing ? '💾 Cập Nhật Sách' : '☁️ Tải Sách Lên Đám Mây'}
              </button>
            </div>
          </form>
        )}

        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1100px', fontFamily: "'Times New Roman', Times, serif" }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#475569', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sách & Tác Giả</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#475569', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Danh Mục</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#475569', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Thông Tin XB</th>
                  <th style={{ padding: '16px', textAlign: 'right', color: '#475569', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Giá Trị</th>
                  <th style={{ padding: '16px', textAlign: 'center', color: '#475569', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vị Trí Kệ</th>
                  <th style={{ padding: '16px', textAlign: 'center', color: '#475569', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kho</th>
                  <th style={{ padding: '16px', textAlign: 'center', color: '#475569', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hành Động</th>
                </tr>
              </thead>
              <tbody style={{ divideY: '1px solid #f1f5f9' }}>
                {filteredBooks.map((book) => (
                  <tr key={book._id} style={{ borderBottom: '1px solid #f8fafc', transition: 'all 0.2s', ':hover': { backgroundColor: '#f1f5f9' } }}>
                    
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ width: '45px', height: '65px', borderRadius: '6px', backgroundColor: '#e2e8f0', overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                          {book.cover_image ? (
                            <img src={book.cover_image} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#94a3b8' }}>Trống</div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '16px', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={book.title}>
                            {book.title}
                          </div>
                          <div style={{ color: '#64748b', fontSize: '14px', marginTop: '4px', fontStyle: 'italic' }}>
                            {book.author}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td style={{ padding: '16px' }}>
                      <span style={{ backgroundColor: '#e0e7ff', color: '#4338ca', padding: '6px 12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', display: 'inline-block' }}>
                        {book.category_id?.category_name || categories.find(c => c._id === book.category_id)?.category_name || book.genre || 'Chưa phân loại'}
                      </span>
                    </td>
                    
                    <td style={{ padding: '16px', color: '#475569', fontSize: '14px' }}>
                      <div style={{ fontWeight: '600', color: '#334155' }}>{book.publisher || 'Chưa rõ NXB'}</div>
                      <div style={{ color: '#94a3b8', marginTop: '4px' }}>
                        {book.publish_year ? `${book.publish_year}` : ''} 
                        {book.page_count ? ` • ${book.page_count} trang` : ''}
                      </div>
                    </td>

                    <td style={{ padding: '16px', textAlign: 'right', color: '#0f172a', fontWeight: '700', fontSize: '15px' }}>
                      {book.book_price ? book.book_price.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                    </td>
                    
                    <td style={{ padding: '12px 15px', textAlign: 'center', minWidth: '200px' }}>
                      {book.shelf_location && book.shelf_location.includes(' - ') ? (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {book.shelf_location.split(' - ').map((part, index) => (
                            <span key={index} style={{ 
                              padding: '4px 8px', 
                              borderRadius: '6px', 
                              fontSize: '12px', 
                              fontWeight: 'bold',
                              backgroundColor: index === 0 ? '#dbeafe' : index === 1 ? '#f3e8ff' : '#fef3c7',
                              color: index === 0 ? '#1e40af' : index === 1 ? '#7e22ce' : '#92400e',
                              border: `1px solid ${index === 0 ? '#bfdbfe' : index === 1 ? '#e9d5ff' : '#fde68a'}`,
                              fontFamily: "'Times New Roman', Times, serif"
                            }}>
                              {part}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '14px' }}>
                          {book.shelf_location || 'Chưa xếp kệ'}
                        </span>
                      )}
                    </td>
                    
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '32px', height: '32px', borderRadius: '50%', backgroundColor: book.available_quantity > 0 ? '#10b981' : '#ef4444', color: 'white', fontSize: '14px', fontWeight: '700', padding: '0 8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                        {book.available_quantity}
                      </div>
                    </td>

                    <td style={{ padding: '16px', textAlign: 'center', minWidth: '110px' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                        <button onClick={() => handleEditClick(book)} style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', color: '#3b82f6', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', outline: 'none' }} title="Sửa">
                          ✏️
                        </button>
                        <button onClick={() => handleDelete(book._id)} style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', outline: 'none' }} title="Xóa">
                          🗑️
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
                {filteredBooks.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>
                      <div style={{ fontSize: '45px', marginBottom: '15px' }}>{searchTerm ? '🕵️‍♂️' : '📚'}</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', fontFamily: "'Times New Roman', Times, serif" }}>
                        {searchTerm ? `Không tìm thấy sách nào khớp với từ khóa "${searchTerm}"` : 'Chưa có sách nào trong kho.'}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminPage;