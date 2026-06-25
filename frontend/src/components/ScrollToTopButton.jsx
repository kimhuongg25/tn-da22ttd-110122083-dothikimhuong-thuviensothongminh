import React, { useState, useEffect } from 'react';

const ScrollToTopButton = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Hiển thị nút khi cuộn xuống quá 300px
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!showScrollTop) return null;

  return (
    <button
      onClick={scrollToTop}
      style={{
        position: 'fixed',
        bottom: '100px', // Nằm trên Chatbot một chút
        right: '25px',
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: '#4f46e5',
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justify: 'center',
        zIndex: 9999, // Đảm bảo luôn nổi lên trên cùng mọi trang
        transition: 'all 0.2s ease-in-out'
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      title="Cuộn lên đầu trang"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="26px" height="26px">
        <path d="M12 2L4 10h5v12h6V10h5L12 2z" />
      </svg>
    </button>
  );
};

export default ScrollToTopButton;