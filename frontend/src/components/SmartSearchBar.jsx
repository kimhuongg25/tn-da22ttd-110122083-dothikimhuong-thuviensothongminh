import React, { useState, useRef } from 'react';
import api from '../services/api';

const SmartSearchBar = ({ onSearchResults }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef(null);

  // --- CẤP ĐỘ 1: TÌM KIẾM VĂN BẢN ĐA TRƯỜNG ---
  const handleTextSearch = async (keyword) => {
    if (!keyword.trim()) return;
    try {
      const res = await api.get(`/books/search?keyword=${keyword}`);
      onSearchResults(res.data); // Trả kết quả lên component cha để hiển thị
    } catch (error) {
      console.error("Lỗi tìm kiếm:", error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleTextSearch(searchTerm);
  };

  // --- CẤP ĐỘ 4: TÌM KIẾM BẰNG HÌNH ẢNH (OCR) ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await api.post('/books/search-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setSearchTerm(res.data.detectedText); // Hiển thị từ khóa AI đọc được từ ảnh
      onSearchResults(res.data.results); // Hiển thị danh sách sách trả về
    } catch (error) {
      alert(error.response?.data?.message || 'Không thể nhận diện hình ảnh này.');
    } finally {
      setIsAnalyzing(false);
      e.target.value = null; // Reset ô upload
    }
  };

  return (
    <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '700px', margin: '0 auto', fontFamily: "'Times New Roman', Times, serif" }}>
      <input 
        type="text" 
        placeholder="Nhập tên sách, tác giả hoặc mô tả..." 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyPress}
        style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '16px', outline: 'none', fontFamily: "'Times New Roman', Times, serif" }}
      />
      

      {/* Nút Upload Ảnh */}
      <button 
        onClick={() => fileInputRef.current.click()}
        title="Tìm kiếm bằng hình ảnh bìa sách"
        disabled={isAnalyzing}
        style={{ padding: '0 20px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#ffffff', cursor: 'pointer', fontSize: '20px', transition: '0.2s', opacity: isAnalyzing ? 0.6 : 1 }}
      >
        {isAnalyzing ? '⏳' : '📸'}
      </button>
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        style={{ display: 'none' }} 
      />

      {/* Nút Tìm Kiếm */}
      <button 
        onClick={() => handleTextSearch(searchTerm)}
        style={{ padding: '0 24px', borderRadius: '8px', border: 'none', backgroundColor: '#4f46e5', color: 'white', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', fontFamily: "'Times New Roman', Times, serif" }}
      >
        Tìm kiếm
      </button>
    </div>
  );
};

export default SmartSearchBar;