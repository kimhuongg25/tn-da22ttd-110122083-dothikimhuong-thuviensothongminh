import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import BookDetailPage from './pages/BookDetailPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import ManageBorrowsPage from './pages/ManageBorrowsPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ManageCategoriesPage from './pages/ManageCategoriesPage';

// Import 2 trang quản lý mới
import ManageUsersPage from './pages/ManageUsersPage'; 
import ManageReviewsPage from './pages/ManageReviewsPage'; 

// IMPORT CHATBOT WIDGET VÀO APP
import ChatbotWidget from './components/ChatbotWidget';

// Import component ScrollToTop (Xử lý reset cuộn khi chuyển trang)
import ScrollToTop from './components/ScrollToTop';
import ManageFinesPage from './pages/ManageFinesPage';

// IMPORT COMPONENT NỘI QUY THƯ VIỆN (DẤU ?) MỚI TẠO
import LibraryRules from './components/LibraryRules';

// BỔ SUNG: IMPORT NÚT MŨI TÊN ĐẨY LÊN ĐẦU TRANG VỪA TẠO
import ScrollToTopButton from './components/ScrollToTopButton';


function App() {
  return (
    <Router>
      {/* CÓ SẴN: Tự động kéo lên đầu trang khi chuyển qua đường dẫn (route) mới */}
      <ScrollToTop />
      
      <Navbar /> 
      <Routes>
        {/* CÁC ROUTE CỦA NGƯỜI DÙNG */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/book/:id" element={<BookDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        {/* CÁC ROUTE CỦA QUẢN TRỊ VIÊN */}
        <Route path="/admin" element={<AdminDashboardPage />} /> 
        <Route path="/admin/books" element={<AdminPage />} /> 
        <Route path="/admin/borrows" element={<ManageBorrowsPage />} /> 
        
        {/* Route kết nối 2 trang mới */}
        <Route path="/admin/users" element={<ManageUsersPage />} /> 
        <Route path="/admin/reviews" element={<ManageReviewsPage />} />
        
        <Route path="/admin/categories" element={<ManageCategoriesPage />} />
        <Route path="/admin/fines" element={<ManageFinesPage />} />
      </Routes>
      
      {/* ĐẶT CHATBOT Ở ĐÂY (Nằm ngoài Routes để nó luôn hiển thị ở mọi trang) */}
      <ChatbotWidget />
      
      {/* ĐẶT NÚT NỘI QUY Ở ĐÂY (Sẽ trôi nổi ở góc dưới bên trái) */}
      <LibraryRules />

      {/* BỔ SUNG: NÚT MŨI TÊN CUỘN TRANG (Trôi nổi ở góc dưới bên phải, trên Chatbot) */}
      <ScrollToTopButton />
      
    </Router>
  );
}

export default App;