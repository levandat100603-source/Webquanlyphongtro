import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { roomService } from '../api/services';

const RoomList = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    city: '',
    min_price: '',
    max_price: '',
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await roomService.getRooms(filters);
      setRooms(response.data || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRooms();
  };

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Danh sách phòng trọ</h1>
      </div>

      <div className="search-filters">
        <form onSubmit={handleSearch}>
          <div className="search-filters-grid">
            <div className="form-group">
              <input
                type="text"
                name="search"
                className="form-input"
                placeholder="Tìm kiếm..."
                value={filters.search}
                onChange={handleFilterChange}
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                name="city"
                className="form-input"
                placeholder="Thành phố"
                value={filters.city}
                onChange={handleFilterChange}
              />
            </div>
            <div className="form-group">
              <input
                type="number"
                name="min_price"
                className="form-input"
                placeholder="Giá tối thiểu"
                value={filters.min_price}
                onChange={handleFilterChange}
              />
            </div>
            <div className="form-group">
              <input
                type="number"
                name="max_price"
                className="form-input"
                placeholder="Giá tối đa"
                value={filters.max_price}
                onChange={handleFilterChange}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Tìm kiếm
          </button>
        </form>
      </div>

      {rooms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#7f8c8d' }}>
          Không tìm thấy phòng trọ nào
        </div>
      ) : (
        <div className="cards-grid">
          {rooms.map((room) => (
            <div key={room.id} className="card">
              <div className="card-image" />
              <div className="card-content">
                <h3 className="card-title">{room.title}</h3>
                <p className="card-text">📍 {room.address}, {room.district}, {room.city}</p>
                <p className="card-text">📐 Diện tích: {room.area} m²</p>
                <p className="card-text">👥 Sức chứa: {room.capacity} người</p>
                <div className="card-price">{Number(room.price).toLocaleString('vi-VN')} đ/tháng</div>
                <Link to={`/rooms/${room.id}`} className="card-button">
                  Xem chi tiết
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoomList;
