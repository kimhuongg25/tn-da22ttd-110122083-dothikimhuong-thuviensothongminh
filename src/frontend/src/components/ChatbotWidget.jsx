import React, { useState, useRef, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const ChatbotWidget = () => {
  const { user } = useContext(AuthContext); 
  
  // KIỂM TRA ROLE VÀ THIẾT LẬP GIAO DIỆN
  const isAdmin = user?.role === 'admin';
  const themeColor = isAdmin ? '#dc2626' : '#4f46e5'; // Admin màu Đỏ, User màu Xanh
  const botName = isAdmin ? 'Trợ lý Quản trị (Admin AI)' : 'Smart Librarian';
  const welcomeText = isAdmin 
    ? "Xin chào Admin! Mình là Trợ lý Quản trị. Sếp cần xem báo cáo, thống kê hay tra cứu kho sách hôm nay?"
    : "Xin chào! Mình là Trợ lý AI của Smart Library. Bạn cần tìm sách gì hay muốn hỏi về nội quy thư viện không?";
  const apiUrl = isAdmin ? '/chatbot/admin' : '/chatbot';
  
  // SỬA Ở ĐÂY: Tạo tên khóa lưu trữ riêng biệt theo ID của từng user thay vì role
  const storageKey = `chat_history_${user?._id || 'guest'}`;

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 1. KHỞI TẠO STATE TIN NHẮN TỪ LOCAL STORAGE
  const [messages, setMessages] = useState(() => {
    const savedChat = localStorage.getItem(storageKey);
    if (savedChat) {
      return JSON.parse(savedChat);
    }
    return [{ text: welcomeText, isBot: true }];
  });

  // 2. XỬ LÝ KHI CHUYỂN TÀI KHOẢN (Nạp lại đúng lịch sử của tài khoản đó)
  useEffect(() => {
    const savedChat = localStorage.getItem(storageKey);
    if (savedChat) {
      setMessages(JSON.parse(savedChat));
    } else {
      setMessages([{ text: welcomeText, isBot: true }]);
    }
  }, [user, welcomeText, storageKey]);

  // 3. LƯU VÀO LOCAL STORAGE MỖI KHI CÓ TIN NHẮN MỚI
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  // Tự động cuộn xuống tin nhắn cuối
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    const currentHistory = [...messages]; 

    setMessages(prev => [...prev, { text: userMsg, isBot: false }]);
    setInput('');
    setIsLoading(true);

    try {
      // Gọi API tương ứng với Role
      const res = await api.post(apiUrl, { 
        message: userMsg,
        history: currentHistory, 
        username: user?.username || '' 
      });
      
      setMessages(prev => [...prev, { text: res.data.reply, isBot: true }]);
    } catch (error) {
      setMessages(prev => [...prev, { text: "Xin lỗi, kết nối AI đang bị lỗi. Bạn thử lại sau nhé!", isBot: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. HÀM XÓA LỊCH SỬ CHAT
  const handleClearChat = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện này?")) {
      const resetMsg = [{ text: welcomeText, isBot: true }];
      setMessages(resetMsg);
      localStorage.setItem(storageKey, JSON.stringify(resetMsg));
    }
  };

  const formatText = (text) => text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#/g, '');

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: themeColor, color: 'white', border: 'none', boxShadow: `0 4px 12px ${themeColor}80`, cursor: 'pointer', fontSize: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s' }}
        >
          {isAdmin ? '📊' : '🤖'}
        </button>
      )}

      {isOpen && (
        <div style={{ 
          width: '380px', height: '550px', backgroundColor: 'white', borderRadius: '16px', 
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', 
          overflow: 'hidden', border: '1px solid #e5e7eb',
          fontFamily: '"Times New Roman", Times, serif'
        }}>
          
          {/* Header */}
          <div style={{ backgroundColor: themeColor, padding: '15px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>{isAdmin ? '📊' : '🤖'}</span>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px' }}>{botName}</h4>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                  {user ? `Xin chào, ${user.username}` : 'Trực tuyến'}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {/* Nút Xóa Lịch Sử */}
              <button onClick={handleClearChat} style={{ background: 'none', border: 'none', color: 'white', fontSize: '15px', cursor: 'pointer', opacity: 0.9 }} title="Xóa lịch sử chat">
                🗑️
              </button>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>✖</button>
            </div>
          </div>

          {/* Body Chat */}
          <div style={{ flex: 1, padding: '15px', overflowY: 'auto', backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: msg.isBot ? 'flex-start' : 'flex-end' }}>
                <div style={{ maxWidth: '85%', padding: '12px 16px', borderRadius: '12px', fontSize: '15px', lineHeight: '1.6', whiteSpace: 'pre-wrap', backgroundColor: msg.isBot ? '#ffffff' : themeColor, color: msg.isBot ? '#111827' : '#ffffff', border: msg.isBot ? '1px solid #e5e7eb' : 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  {formatText(msg.text)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '10px 14px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', fontSize: '14px', color: '#6b7280', fontStyle: 'italic' }}>
                  Đang phân tích dữ liệu...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} style={{ padding: '15px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '10px', backgroundColor: '#ffffff' }}>
            <input 
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              placeholder={isAdmin ? "Hỏi báo cáo, thống kê..." : "Nhập câu hỏi tại đây..."} 
              style={{ flex: 1, padding: '12px 16px', borderRadius: '25px', border: '1px solid #d1d5db', outline: 'none', fontSize: '15px', backgroundColor: '#f3f4f6', fontFamily: '"Times New Roman", Times, serif' }}
            />
            <button type="submit" disabled={isLoading || !input.trim()} style={{ backgroundColor: themeColor, color: 'white', border: 'none', borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: (isLoading || !input.trim()) ? 0.5 : 1, transition: '0.2s' }}>
              ➤
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;