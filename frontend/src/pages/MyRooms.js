import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus } from 'react-icons/fi';
import { roomService } from '../api/services';

const MyRooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    fetchMyRooms();

    const savedNotice = localStorage.getItem('myRoomsNotice');
    if (savedNotice) {
      setNotice(savedNotice);
      localStorage.removeItem('myRoomsNotice');
    }
  }, []);

  const fetchMyRooms = async () => {
    const extractRooms = (payload) => {
      if (Array.isArray(payload)) {
        return payload;
      }

      if (Array.isArray(payload?.data)) {
        return payload.data;
      }

      if (Array.isArray(payload?.data?.data)) {
        return payload.data.data;
      }

      return [];
    };

    try {
      const response = await roomService.getMyRooms();
      setRooms(extractRooms(response));
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phòng này?')) {
      return;
    }

    try {
      await roomService.deleteRoom(id);
      setRooms(rooms.filter(room => room.id !== id));
    } catch (error) {
      alert('Xóa phòng thất bại');
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Phòng trọ của tôi</h1>
        </div>
        <div className="skeleton-table">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={`my-room-skeleton-${index}`} className="skeleton-table-row">
              <div className="skeleton-shimmer skeleton-line" />
              <div className="skeleton-shimmer skeleton-line" />
              <div className="skeleton-shimmer skeleton-line" />
              <div className="skeleton-shimmer skeleton-line sm" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Phòng trọ của tôi</h1>
        <Link to="/create-room" className="btn btn-primary">
          + Đăng phòng mới
        </Link>
      </div>

      {rooms.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏠</div>
          <h3 className="empty-state-title">Bạn chưa đăng phòng nào</h3>
          <p className="empty-state-description">
            Bắt đầu kiếm doanh thu ngay bằng cách đăng phòng của bạn lên nền tảng.
          </p>
          <div className="empty-state-actions">
            <Link to="/create-room" className="btn btn-primary" aria-label="Đăng phòng mới">
              <FiPlus size={16} /> Đăng phòng đầu tiên
            </Link>
          </div>
        </div>
      ) : (
        <>
        {notice && <div className="success-message">{notice}</div>}
        <div className="table">
          <table>
            <thead>
              <tr>
                <th>Tiêu đề</th>
                <th>Địa chỉ</th>
                <th>Giá</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id}>
                  <td>{room.title}</td>
                  <td>{room.address}, {room.city}</td>
                  <td>{Number(room.price).toLocaleString('vi-VN')} đ</td>
                  <td>
                    <span className={`badge ${
                      room.status === 'available' ? 'badge-success' : 
                      room.status === 'rented' ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {room.status === 'available' ? 'Còn trống' : 
                       room.status === 'rented' ? 'Đã cho thuê' : 'Bảo trì'}
                    </span>
                  </td>
                  <td>
                    <div className="action-group">
                      <Link to={`/rooms/${room.id}`} className="btn btn-primary" aria-label={`Xem chi tiết phòng ${room.title}`}>
                        Xem
                      </Link>
                      <Link to={`/edit-room/${room.id}`} className="btn btn-warning" aria-label={`Sửa phòng ${room.title}`}>
                        Sửa
                      </Link>
                      <button 
                        onClick={() => handleDelete(room.id)}
                        className="btn btn-danger"
                        aria-label={`Xóa phòng ${room.title}`}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
};

export default MyRooms;
