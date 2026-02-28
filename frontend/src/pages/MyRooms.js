import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { roomService } from '../api/services';

const MyRooms = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyRooms();
  }, []);

  const fetchMyRooms = async () => {
    try {
      const response = await roomService.getMyRooms();
      setRooms(response.data || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
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
    return <div className="loading">Đang tải...</div>;
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
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#7f8c8d', marginBottom: '1rem' }}>
            Bạn chưa có phòng trọ nào
          </p>
          <Link to="/create-room" className="btn btn-primary">
            Đăng phòng đầu tiên
          </Link>
        </div>
      ) : (
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
                    <Link to={`/rooms/${room.id}`} className="btn btn-primary" style={{ marginRight: '0.5rem', padding: '0.5rem 1rem' }}>
                      Xem
                    </Link>
                    <Link to={`/edit-room/${room.id}`} className="btn btn-warning" style={{ marginRight: '0.5rem', padding: '0.5rem 1rem' }}>
                      Sửa
                    </Link>
                    <button 
                      onClick={() => handleDelete(room.id)}
                      className="btn btn-danger"
                      style={{ padding: '0.5rem 1rem' }}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyRooms;
