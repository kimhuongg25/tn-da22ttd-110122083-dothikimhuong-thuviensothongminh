import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import * as XLSX from 'xlsx'; 

const ManageBorrowsPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [borrows, setBorrows] = useState([]);

  // --- 1. STATE DÀNH RIÊNG CHO TÌM KIẾM VÀ LỌC ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // --- 2. STATE DÀNH RIÊNG CHO HỘP THOẠI TRẢ SÁCH (MODAL) ---
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('paid'); 
  
  // LOGIC MỚI: State quản lý lý do và mức phạt tự động
  const [damageLevel, setDamageLevel] = useState('none');
  const [customReason, setCustomReason] = useState('');
  const [damageFine, setDamageFine] = useState(0); 

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      alert('Truy cập bị từ chối. Chỉ dành cho Quản trị viên!');
      navigate('/');
      return;
    }
    fetchBorrows();
  }, [user, navigate]);

  const fetchBorrows = async () => {
    try {
      const res = await api.get('/borrows/admin/list');
      setBorrows(res.data);
    } catch (error) {
      console.error('Lỗi khi tải danh sách phiếu mượn', error);
    }
  };

  const filteredBorrows = borrows.filter(record => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (record.user_id?._id || '').toLowerCase().includes(searchLower) ||
      (record.user_id?.fullName || '').toLowerCase().includes(searchLower) ||
      (record.user_id?.username || '').toLowerCase().includes(searchLower) ||
      (record.user_id?.email || '').toLowerCase().includes(searchLower) ||
      (record.book_id?.title || '').toLowerCase().includes(searchLower);
    
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = async (record, newStatus) => {
    if (newStatus === 'approved') {
      if (!window.confirm('Xác nhận duyệt cho mượn cuốn sách này?')) return;
    } 
    else if (newStatus === 'rejected') {
      if (!window.confirm('Từ chối yêu cầu mượn sách này?')) return;
    } 
    else if (newStatus === 'returned') {
      setCurrentRecord(record);
      // Reset toàn bộ form phạt khi mở hộp thoại mới
      setDamageLevel('none');
      setCustomReason('');
      setDamageFine(0); 
      setPaymentStatus('paid'); 
      setIsReturnModalOpen(true); 
      return; 
    }

    try {
      await api.put(`/borrows/admin/status/${record._id}`, { status: newStatus });
      alert('Cập nhật trạng thái thành công!');
      fetchBorrows(); 
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi khi cập nhật trạng thái');
    }
  };

  // HÀM XỬ LÝ KHI CHỌN MỨC ĐỘ HƯ HỎNG TỪ DROPDOWN
  const handleDamageLevelChange = (e) => {
    const level = e.target.value;
    setDamageLevel(level);
    
    const bookPrice = currentRecord?.book_id?.book_price || 0;
    if (bookPrice === 0 && level !== 'none' && level !== 'other') {
      alert("⚠️ Hệ thống chưa có dữ liệu giá gốc của cuốn sách này. Vui lòng nhập số tiền phạt thủ công!");
    }

    switch (level) {
      case 'none':
        setDamageFine(0);
        setCustomReason('');
        break;
      case 'minor':
        setDamageFine(bookPrice * 0.2); // Phạt 20%
        break;
      case 'moderate':
        setDamageFine(bookPrice * 0.5); // Phạt 50%
        break;
      case 'severe':
        setDamageFine(bookPrice * 1.0); // Phạt 100% (Mất sách)
        break;
      case 'other':
        setDamageFine(0); // Để Admin tự gõ
        break;
      default:
        setDamageFine(0);
    }
  };

  const submitReturnBook = async () => {
    try {
      // Xác định lý do chuỗi text cuối cùng để gửi xuống DB
      let finalReason = '';
      if (damageLevel === 'minor') finalReason = 'Rách bìa / Trầy xước nhẹ';
      else if (damageLevel === 'moderate') finalReason = 'Rách, mất vài trang / Ướt sách';
      else if (damageLevel === 'severe') finalReason = 'Mất sách / Hư hỏng hoàn toàn';
      else if (damageLevel === 'other') finalReason = customReason;

      if (damageLevel === 'other' && Number(damageFine) > 0 && !customReason.trim()) {
        return alert("Vui lòng nhập lý do phạt tùy chỉnh!");
      }

      await api.put(`/borrows/admin/status/${currentRecord._id}`, { 
        status: 'returned',
        fine: { 
          amount: Number(damageFine) || 0,
          status: paymentStatus,
          damageReason: finalReason 
        } 
      });
      
      alert(paymentStatus === 'unpaid' ? 'Đã thu hồi sách. Tài khoản độc giả đã bị Khóa do nợ tiền phạt!' : 'Đã xác nhận trả sách và thanh toán thành công!');
      
      setIsReturnModalOpen(false);
      fetchBorrows(); 
    } catch (error) {
      console.error("Lỗi trả sách:", error);
      alert(error.response?.data?.message || 'Lỗi khi xác nhận trả sách');
    }
  };

  const calculateOverdueInfo = () => {
    if (!currentRecord || !currentRecord.due_date) return { days: 0, fine: 0 };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(currentRecord.due_date);
    dueDate.setHours(0, 0, 0, 0);
    
    const timeDiff = today.getTime() - dueDate.getTime();
    const daysLate = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (daysLate > 0) {
      return { days: daysLate, fine: daysLate * 5000 };
    }
    return { days: 0, fine: 0 };
  };

  const handleExportExcel = () => {
    if (filteredBorrows.length === 0) {
      return alert("Không có dữ liệu để xuất!");
    }

    const excelData = filteredBorrows.map((record, index) => ({
      'STT': index + 1,
      'Mã Phiếu': record._id.substring(record._id.length - 6).toUpperCase(),
      'Tên Độc Giả': record.user_id?.fullName || record.user_id?.username || 'Ẩn danh',
      'Email Độc Giả': record.user_id?.email || 'Không có',
      'Tên Sách': record.book_id?.title || 'Sách đã xóa',
      'Vị Trí Kệ': record.book_id?.shelf_location || 'Chưa xác định',
      'Ngày Tạo Phiếu': new Date(record.createdAt).toLocaleDateString('vi-VN'),
      'Trạng Thái': record.status === 'pending' ? 'Chờ duyệt' : 
                    record.status === 'approved' ? 'Đã duyệt' : 
                    record.status === 'borrowed' ? 'Đang mượn' : 
                    record.status === 'returned' ? 'Đã trả' : 'Bị từ chối',
      'Tiền Phạt (VNĐ)': record.fine?.amount || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Danh_Sach_Phieu_Muon");

    const colWidths = [
      { wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 30 }, 
      { wch: 35 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `Bao_Cao_Phieu_Muon_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`);
  };

  const renderStatusBadge = (status) => {
    const badgeStyle = { padding: '6px 12px', borderRadius: '9999px', fontSize: '13px', fontWeight: 'bold' };
    switch(status) {
      case 'pending': return <span style={{ ...badgeStyle, backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>⏳ Chờ Duyệt</span>;
      case 'approved': return <span style={{ ...badgeStyle, backgroundColor: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe' }}>🔵 Đã Duyệt</span>;
      case 'borrowed': return <span style={{ ...badgeStyle, backgroundColor: '#f3e8ff', color: '#9333ea', border: '1px solid #e9d5ff' }}>📚 Đang Mượn</span>;
      case 'returned': return <span style={{ ...badgeStyle, backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' }}>✅ Đã Trả</span>;
      case 'rejected': return <span style={{ ...badgeStyle, backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>❌ Đã Hủy</span>;
      case 'overdue': return <span style={{ ...badgeStyle, backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}>⚠️ Quá Hạn</span>;
      default: return status;
    }
  };

  const actionBtnStyle = {
    padding: '8px 14px', border: 'none', borderRadius: '6px', cursor: 'pointer',
    fontWeight: 'bold', fontSize: '14px', transition: 'all 0.2s ease', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    fontFamily: "'Times New Roman', Times, serif"
  };

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '30px 20px', fontFamily: "'Times New Roman', Times, serif" }}>
      <div style={{ maxWidth: '1300px', margin: '0 auto', position: 'relative' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
          <div>
            <h2 style={{ color: '#111827', fontSize: '32px', fontWeight: '800', margin: '0 0 8px 0' }}>
              📋 Quản Lý Phiếu Mượn
            </h2>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '16px' }}>Kiểm duyệt và theo dõi trạng thái sách của độc giả.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={handleExportExcel} style={{ padding: '10px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)', fontFamily: "'Times New Roman', Times, serif" }}>
              <span style={{ marginRight: '8px' }}>📊</span> Xuất Báo Cáo Excel
            </button>
            <Link to="/admin" style={{ textDecoration: 'none', backgroundColor: '#ffffff', color: '#4b5563', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', border: '1px solid #d1d5db', display: 'flex', alignItems: 'center', fontFamily: "'Times New Roman', Times, serif" }}>
              <span style={{ marginRight: '8px' }}>⬅</span> Về Bảng Điều Khiển
            </Link>
          </div>
        </div>

        {/* KHU VỰC TÌM KIẾM & LỌC */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', fontSize: '15px', fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>🔍 Tìm kiếm phiếu mượn</label>
            <input 
              type="text" 
              placeholder="Nhập ID, Họ tên, Email độc giả hoặc Tên sách..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none', boxSizing: 'border-box', fontSize: '15px', fontFamily: "'Times New Roman', Times, serif" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '15px', fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>🏷️ Lọc theo trạng thái</label>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none', backgroundColor: '#f9fafb', cursor: 'pointer', fontSize: '15px', fontFamily: "'Times New Roman', Times, serif" }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">⏳ Chờ duyệt</option>
              <option value="approved">🔵 Đã duyệt</option>
              <option value="borrowed">📚 Đang mượn (Chưa trả)</option>
              <option value="returned">✅ Đã trả</option>
              <option value="rejected">❌ Đã hủy</option>
            </select>
          </div>
        </div>

        {/* BẢNG DỮ LIỆU */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1100px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '16px 20px', textAlign: 'left', color: '#374151', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>Người Mượn</th>
                  <th style={{ padding: '16px 20px', textAlign: 'left', color: '#374151', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>Tên Sách</th>
                  <th style={{ padding: '16px 20px', textAlign: 'center', color: '#374151', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>Hạn Trả</th>
                  <th style={{ padding: '16px 20px', textAlign: 'center', color: '#374151', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>Trạng Thái</th>
                  <th style={{ padding: '16px 20px', textAlign: 'center', color: '#374151', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>Hành Động</th>
                </tr>
              </thead>
              <tbody style={{ divideY: '1px solid #e5e7eb' }}>
                {filteredBorrows.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280', fontSize: '16px' }}>
                      Không tìm thấy phiếu mượn nào phù hợp với điều kiện tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  filteredBorrows.map(record => (
                    <tr key={record._id} style={{ borderBottom: '1px solid #e5e7eb', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ color: '#111827', fontWeight: 'bold', fontSize: '16px' }}>{record.user_id?.fullName || record.user_id?.username || 'User ẩn'}</div>
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>{record.user_id?.email}</div>
                        <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>ID: {record.user_id?._id?.substring(0, 8)}...</div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ color: '#374151', fontWeight: 'bold', fontSize: '16px', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={record.book_id?.title}>
                          {record.book_id?.title || 'Sách đã xóa'}
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'center', color: '#4b5563', fontSize: '15px' }}>
                        {record.due_date ? new Date(record.due_date).toLocaleDateString('vi-VN') : '---'}
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        {renderStatusBadge(record.status)}
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'center', minWidth: '220px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          
                          {/* Đang chờ duyệt */}
                          {record.status === 'pending' && (
                            <>
                              <button onClick={() => handleUpdateStatus(record, 'approved')} style={{ ...actionBtnStyle, backgroundColor: '#4f46e5', color: 'white' }}>Duyệt</button>
                              <button onClick={() => handleUpdateStatus(record, 'rejected')} style={{ ...actionBtnStyle, backgroundColor: '#ffffff', color: '#ef4444', border: '1px solid #fca5a5' }}>Từ chối</button>
                            </>
                          )}

                          {/* Đã duyệt (Chờ lấy sách) */}
                          {record.status === 'approved' && (
                            <button onClick={() => handleUpdateStatus(record, 'borrowed')} style={{ ...actionBtnStyle, backgroundColor: '#8b5cf6', color: 'white' }}>Xác nhận Giao sách</button>
                          )}

                          {/* Đang cầm sách (Chờ trả) hoặc Quá hạn */}
                          {(record.status === 'borrowed' || record.status === 'overdue') && (
                            <button onClick={() => handleUpdateStatus(record, 'returned')} style={{ ...actionBtnStyle, backgroundColor: '#10b981', color: 'white' }}>Nhận Lại Sách</button>
                          )}

                          {/* Đã kết thúc */}
                          {(record.status === 'returned' || record.status === 'rejected') && (
                            <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '15px' }}>Đã xử lý xong</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- GIAO DIỆN HỘP THOẠI TRẢ SÁCH (TỰ ĐỘNG TÍNH TOÁN THEO LÝ DO) --- */}
      {isReturnModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '16px', width: '500px', maxWidth: '90%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e5e7eb' }}>
            
            <h3 style={{ marginTop: 0, color: '#111827', fontSize: '24px', fontWeight: 'bold', borderBottom: '2px solid #f3f4f6', paddingBottom: '15px', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '26px', marginRight: '10px' }}>✅</span> Xác nhận Thu Hồi Sách
            </h3>
            
            <div style={{ marginBottom: '20px', fontSize: '16px', color: '#374151', lineHeight: '1.8' }}>
              <p style={{ margin: '5px 0' }}>Độc giả: <strong>{currentRecord?.user_id?.fullName || currentRecord?.user_id?.username}</strong></p>
              <p style={{ margin: '5px 0' }}>Tên sách: <strong style={{ color: '#4f46e5' }}>{currentRecord?.book_id?.title}</strong></p>
              <p style={{ margin: '5px 0' }}>Giá sách: <strong style={{ color: '#10b981' }}>{(currentRecord?.book_id?.book_price || 0).toLocaleString('vi-VN')} VNĐ</strong></p>
              
              <div style={{ backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb', marginTop: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Ngày đến hạn:</span>
                  <strong>{currentRecord?.due_date ? new Date(currentRecord.due_date).toLocaleDateString('vi-VN') : '---'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Ngày trả thực tế:</span>
                  <strong>{new Date().toLocaleDateString('vi-VN')}</strong>
                </div>
                
                {/* HIỂN THỊ TỰ ĐỘNG SỐ NGÀY TRỄ VÀ TIỀN PHẠT */}
                {calculateOverdueInfo().days > 0 ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#dc2626' }}>
                      <span>Số ngày trễ:</span>
                      <strong>{calculateOverdueInfo().days} ngày</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                      <span>Phạt trả trễ (5k/ngày):</span>
                      <strong>{calculateOverdueInfo().fine.toLocaleString()} VNĐ</strong>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: '#059669', fontWeight: 'bold', marginTop: '10px' }}>
                    ✨ Độc giả trả sách đúng hạn
                  </div>
                )}
              </div>
            </div>

            {/* KHU VỰC MỚI: CHỌN LÝ DO ĐỂ TỰ ĐỘNG TÍNH TIỀN */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151', fontSize: '15px' }}>Tình trạng sách khi trả:</label>
              
              <select 
                value={damageLevel}
                onChange={handleDamageLevelChange}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '2px solid #e5e7eb', outline: 'none', fontSize: '16px', boxSizing: 'border-box', marginBottom: '10px', backgroundColor: '#f9fafb', cursor: 'pointer', fontFamily: "'Times New Roman', Times, serif" }}
              >
                <option value="none">Sách nguyên vẹn (Không phạt)</option>
                <option value="minor">Rách bìa / Trầy xước nhẹ (Phạt 20%)</option>
                <option value="moderate">Rách, mất vài trang / Ướt sách (Phạt 50%)</option>
                <option value="severe">Mất sách / Hư hỏng hoàn toàn (Phạt 100%)</option>
                <option value="other">Lý do khác</option>
              </select>

              {/* Nếu chọn Lý do khác -> Hiện ô nhập lý do */}
              {damageLevel === 'other' && (
                <input 
                  type="text" 
                  value={customReason} 
                  onChange={(e) => setCustomReason(e.target.value)} 
                  placeholder="Ghi chú chi tiết lý do hư hỏng..."
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '2px solid #fca5a5', outline: 'none', fontSize: '16px', boxSizing: 'border-box', backgroundColor: '#fff1f2', color: '#991b1b', marginBottom: '10px', fontFamily: "'Times New Roman', Times, serif" }}
                />
              )}

              {/* Ô Tiền phạt (Tự động điền nhưng vẫn cho phép sửa chữa thủ công) */}
              {damageLevel !== 'none' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
                  <span style={{ backgroundColor: '#f3f4f6', padding: '12px 15px', color: '#4b5563', fontWeight: 'bold', borderRight: '1px solid #d1d5db' }}>Tiền phạt:</span>
                  <input 
                    type="number" 
                    min="0"
                    value={damageFine} 
                    onChange={(e) => setDamageFine(e.target.value)} 
                    style={{ flex: 1, border: 'none', padding: '12px 14px', outline: 'none', fontSize: '16px', color: '#dc2626', fontWeight: 'bold', fontFamily: "'Times New Roman', Times, serif" }}
                  />
                  <span style={{ padding: '0 15px', color: '#6b7280', fontWeight: 'bold' }}>VNĐ</span>
                </div>
              )}
            </div>

            {/* TỔNG TIỀN PHẠT & LỰA CHỌN THANH TOÁN */}
            {(calculateOverdueInfo().fine + Number(damageFine) > 0) && (
              <div style={{ backgroundColor: '#fff1f2', padding: '15px', borderRadius: '8px', border: '1px solid #fecdd3', marginBottom: '25px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', color: '#be123c', fontWeight: 'bold', marginBottom: '15px' }}>
                  <span>TỔNG TIỀN CẦN THU:</span>
                  <span>{(calculateOverdueInfo().fine + Number(damageFine)).toLocaleString()} VNĐ</span>
                </div>
                
                <label style={{ display: 'block', fontWeight: 'bold', color: '#9f1239', marginBottom: '10px' }}>Trạng thái thu tiền phạt:</label>
                <div style={{ display: 'flex', gap: '15px', flexDirection: 'column' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#065f46', fontWeight: 'bold' }}>
                    <input type="radio" value="paid" checked={paymentStatus === 'paid'} onChange={() => setPaymentStatus('paid')} style={{ transform: 'scale(1.2)' }}/>
                    Đã thanh toán đủ (Hoàn tất giao dịch)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#9f1239', fontWeight: 'bold' }}>
                    <input type="radio" value="unpaid" checked={paymentStatus === 'unpaid'} onChange={() => setPaymentStatus('unpaid')} style={{ transform: 'scale(1.2)' }}/>
                    Chưa nộp phạt (Khóa tài khoản mượn sách)
                  </label>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setIsReturnModalOpen(false)} style={{ padding: '10px 20px', border: '1px solid #d1d5db', backgroundColor: '#ffffff', color: '#374151', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s', fontFamily: "'Times New Roman', Times, serif" }}>
                Hủy bỏ
              </button>
              <button onClick={submitReturnBook} style={{ padding: '10px 20px', border: 'none', backgroundColor: '#10b981', color: '#ffffff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)', fontFamily: "'Times New Roman', Times, serif" }}>
                Xác nhận Hoàn Tất
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ManageBorrowsPage;