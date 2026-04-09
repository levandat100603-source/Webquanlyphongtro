import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMoon, FiSun } from 'react-icons/fi';
import { authService } from '../api/services';
import { useLanguage } from '../contexts/LanguageContext';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const { language, setLanguage, t } = useLanguage();
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
    } catch (error) {
        console.error("Lỗi logout:", error);
    } finally {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
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
        <div className="navbar-left">
          <Link to="/rooms" className="navbar-brand" onClick={handleCloseMenu}>
            BigSix
          </Link>

          <div className="navbar-quick-controls">
            <button type="button" className="navbar-icon-button" onClick={toggleTheme} aria-label={t('nav.toggleTheme')}>
              {theme === 'light' ? <FiMoon size={17} /> : <FiSun size={17} />}
            </button>

            <button
              type="button"
              className="navbar-language-toggle"
              onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
              aria-label={language === 'vi' ? t('common.languageEn') : t('common.languageVi')}
            >
              {language === 'vi' ? 'EN' : 'VI'}
            </button>
          </div>
        </div>

        <button
          type="button"
          className="navbar-toggle"
          aria-label={t('nav.toggleMenu')}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? '✕' : '☰'}
        </button>

        <ul className={`navbar-menu ${isMenuOpen ? 'is-open' : ''}`}>
          <li><Link to="/rooms" className="navbar-link" onClick={handleCloseMenu}>{t('nav.rooms')}</Link></li>
          
          {isAuthenticated ? (
            <>
              <li><Link to="/dashboard" className="navbar-link" onClick={handleCloseMenu}>{t('nav.dashboard')}</Link></li>
              
              {(user?.role === 'saler' || user?.role === 'admin') && (
                <>
                  <li><Link to="/my-rooms" className="navbar-link" onClick={handleCloseMenu}>{t('nav.myRooms')}</Link></li>
                  <li><Link to="/create-room" className="navbar-link" onClick={handleCloseMenu}>{t('nav.createRoom')}</Link></li>
                </>
              )}
              
              <li><Link to="/bookings" className="navbar-link" onClick={handleCloseMenu}>{t('nav.bookings')}</Link></li>
              
              {user?.role === 'admin' && (
                <li><Link to="/users" className="navbar-link" onClick={handleCloseMenu}>{t('nav.users')}</Link></li>
              )}
              
              <li><Link to="/profile" className="navbar-link" onClick={handleCloseMenu}>{t('nav.profile')}</Link></li>
              <li>
                <button onClick={handleLogout} className="navbar-button">
                  {t('nav.logout')}
                </button>
              </li>
            </>
          ) : (
            <>
              <li><Link to="/login" className="navbar-button secondary" onClick={handleCloseMenu}>{t('nav.login')}</Link></li>
              <li><Link to="/register" className="navbar-button" onClick={handleCloseMenu}>{t('nav.register')}</Link></li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
