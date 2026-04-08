import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMoon, FiSun } from 'react-icons/fi';
import { authService } from '../api/services';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const navigate = useNavigate();
  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getCurrentUser();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      setIsMenuOpen(false);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleCloseMenu = () => {
    setIsMenuOpen(false);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link to="/rooms" className="navbar-brand" onClick={handleCloseMenu}>
          TroHub
        </Link>

        <button
          type="button"
          className="navbar-toggle"
          aria-label="Mở hoặc đóng menu"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? '✕' : '☰'}
        </button>

        <ul className={`navbar-menu ${isMenuOpen ? 'is-open' : ''}`}>
          <li>
            <button type="button" className="navbar-icon-button" onClick={toggleTheme} aria-label="Đổi giao diện sáng tối">
              {theme === 'light' ? <FiMoon size={17} /> : <FiSun size={17} />}
            </button>
          </li>
          <li><Link to="/rooms" className="navbar-link" onClick={handleCloseMenu}>Phòng trọ</Link></li>
          
          {isAuthenticated ? (
            <>
              <li><Link to="/dashboard" className="navbar-link" onClick={handleCloseMenu}>Dashboard</Link></li>
              
              {(user?.role === 'saler' || user?.role === 'admin') && (
                <>
                  <li><Link to="/my-rooms" className="navbar-link" onClick={handleCloseMenu}>Phòng của tôi</Link></li>
                  <li><Link to="/create-room" className="navbar-link" onClick={handleCloseMenu}>Đăng phòng</Link></li>
                </>
              )}
              
              <li><Link to="/bookings" className="navbar-link" onClick={handleCloseMenu}>Đặt phòng</Link></li>
              
              {user?.role === 'admin' && (
                <li><Link to="/users" className="navbar-link" onClick={handleCloseMenu}>Người dùng</Link></li>
              )}
              
              <li><Link to="/profile" className="navbar-link" onClick={handleCloseMenu}>Hồ sơ ({user?.name})</Link></li>
              <li>
                <button onClick={handleLogout} className="navbar-button">
                  Đăng xuất
                </button>
              </li>
            </>
          ) : (
            <>
              <li><Link to="/login" className="navbar-button secondary" onClick={handleCloseMenu}>Đăng nhập</Link></li>
              <li><Link to="/register" className="navbar-button" onClick={handleCloseMenu}>Đăng ký</Link></li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
