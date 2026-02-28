import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../api/services';

const Navbar = () => {
  const navigate = useNavigate();
  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getCurrentUser();

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link to="/rooms" className="navbar-brand">
          Room Rental
        </Link>
        <ul className="navbar-menu">
          <li><Link to="/rooms" className="navbar-link">Phòng trọ</Link></li>
          
          {isAuthenticated ? (
            <>
              <li><Link to="/dashboard" className="navbar-link">Dashboard</Link></li>
              
              {(user?.role === 'saler' || user?.role === 'admin') && (
                <>
                  <li><Link to="/my-rooms" className="navbar-link">Phòng của tôi</Link></li>
                  <li><Link to="/create-room" className="navbar-link">Đăng phòng</Link></li>
                </>
              )}
              
              <li><Link to="/bookings" className="navbar-link">Đặt phòng</Link></li>
              
              {user?.role === 'admin' && (
                <li><Link to="/users" className="navbar-link">Người dùng</Link></li>
              )}
              
              <li><Link to="/profile" className="navbar-link">Hồ sơ ({user?.name})</Link></li>
              <li>
                <button onClick={handleLogout} className="navbar-button">
                  Đăng xuất
                </button>
              </li>
            </>
          ) : (
            <>
              <li><Link to="/login" className="navbar-button">Đăng nhập</Link></li>
              <li><Link to="/register" className="navbar-button">Đăng ký</Link></li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
