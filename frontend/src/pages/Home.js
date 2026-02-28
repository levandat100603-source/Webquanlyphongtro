import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="container">
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: '#2c3e50' }}>
          Hệ Thống Quản Lý Phòng Trọ
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#7f8c8d', marginBottom: '2rem' }}>
          Tìm kiếm và đăng cho thuê phòng trọ dễ dàng
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link to="/rooms" className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}>
            Tìm phòng trọ
          </Link>
          <Link to="/register" className="btn btn-success" style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}>
            Đăng ký ngay
          </Link>
        </div>
      </div>

      <div style={{ marginTop: '4rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#2c3e50' }}>
          Tính năng nổi bật
        </h2>
        <div className="cards-grid">
          <div className="card">
            <div className="card-content">
              <h3 className="card-title">Tìm kiếm dễ dàng</h3>
              <p className="card-text">
                Tìm kiếm phòng trọ theo khu vực, giá cả và tiện nghi một cách nhanh chóng
              </p>
            </div>
          </div>
          <div className="card">
            <div className="card-content">
              <h3 className="card-title">Đăng tin miễn phí</h3>
              <p className="card-text">
                Chủ nhà và môi giới có thể đăng tin cho thuê phòng trọ hoàn toàn miễn phí
              </p>
            </div>
          </div>
          <div className="card">
            <div className="card-content">
              <h3 className="card-title">Quản lý hiệu quả</h3>
              <p className="card-text">
                Hệ thống quản lý đặt phòng và người dùng một cách chuyên nghiệp
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
