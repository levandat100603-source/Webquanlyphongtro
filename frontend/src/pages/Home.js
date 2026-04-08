import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="container">
      <section className="home-hero">
        <h1 className="home-title">
          Nền tảng cho thuê trọ minh bạch, dễ vận hành và sẵn sàng mở rộng quy mô
        </h1>
        <p className="home-subtitle">
          Từ tìm kiếm phòng theo khu vực, giá, tiện ích cho đến quản lý booking và chủ trọ trên cùng một hệ thống, trải nghiệm mượt trên cả desktop và mobile.
        </p>

        <div className="home-cta">
          <Link to="/rooms" className="btn btn-warning">
            Khám phá phòng trọ
          </Link>
          <Link to="/register" className="btn btn-success">
            Bắt đầu đăng tin
          </Link>
          <Link to="/dashboard" className="btn btn-primary">
            Vào bảng điều khiển
          </Link>
        </div>

        <div className="home-stat-grid">
          <div className="home-stat">
            <h4>24/7</h4>
            <p>Hệ thống hoạt động liên tục</p>
          </div>
          <div className="home-stat">
            <h4>1 nền tảng</h4>
            <p>Cho người thuê, chủ trọ, admin</p>
          </div>
          <div className="home-stat">
            <h4>Realtime</h4>
            <p>Cập nhật trạng thái booking</p>
          </div>
          <div className="home-stat">
            <h4>Scalable</h4>
            <p>Phù hợp phát triển dự án lớn</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-title">Tính năng trọng tâm</h2>
        <p className="section-subtitle">
          Tập trung vào trải nghiệm sử dụng thực tế trong ngành cho thuê trọ.
        </p>
        <div className="cards-grid">
          <div className="card">
            <div className="card-content">
              <h3 className="card-title">Tìm phòng theo nhu cầu</h3>
              <p className="card-text">
                Bộ lọc theo thành phố, mức giá, tình trạng phòng giúp người thuê ra quyết định nhanh hơn.
              </p>
            </div>
          </div>
          <div className="card">
            <div className="card-content">
              <h3 className="card-title">Quản lý tin đăng tập trung</h3>
              <p className="card-text">
                Chủ trọ và môi giới theo dõi phòng đã đăng, tình trạng còn trống, lịch sử giao dịch trong một nơi.
              </p>
            </div>
          </div>
          <div className="card">
            <div className="card-content">
              <h3 className="card-title">Dashboard vận hành rõ ràng</h3>
              <p className="card-text">
                Theo dõi booking, người dùng, phòng trọ bằng giao diện trực quan để vận hành ở quy mô lớn.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
