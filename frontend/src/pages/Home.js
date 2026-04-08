import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const Home = () => {
  const { t } = useLanguage();

  return (
    <div className="container">
      <section className="home-hero">
        <h1 className="home-title">
          {t('home.heroTitle')}
        </h1>
        <p className="home-subtitle">
          {t('home.heroSubtitle')}
        </p>

        <div className="home-cta">
          <Link to="/rooms" className="btn btn-warning">
            {t('home.ctaExploreRooms')}
          </Link>
          <Link to="/register" className="btn btn-success">
            {t('home.ctaStartPosting')}
          </Link>
          <Link to="/dashboard" className="btn btn-primary">
            {t('home.ctaGoDashboard')}
          </Link>
        </div>

        <div className="home-stat-grid">
          <div className="home-stat">
            <h4>24/7</h4>
            <p>{t('home.statUptime')}</p>
          </div>
          <div className="home-stat">
            <h4>{t('home.statOnePlatformTitle')}</h4>
            <p>{t('home.statOnePlatformDesc')}</p>
          </div>
          <div className="home-stat">
            <h4>Realtime</h4>
            <p>{t('home.statRealtime')}</p>
          </div>
          <div className="home-stat">
            <h4>Scalable</h4>
            <p>{t('home.statScalable')}</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-title">{t('home.featureTitle')}</h2>
        <p className="section-subtitle">
          {t('home.featureSubtitle')}
        </p>
        <div className="cards-grid">
          <div className="card">
            <div className="card-content">
              <h3 className="card-title">{t('home.featureSearchTitle')}</h3>
              <p className="card-text">
                {t('home.featureSearchDesc')}
              </p>
            </div>
          </div>
          <div className="card">
            <div className="card-content">
              <h3 className="card-title">{t('home.featureManageTitle')}</h3>
              <p className="card-text">
                {t('home.featureManageDesc')}
              </p>
            </div>
          </div>
          <div className="card">
            <div className="card-content">
              <h3 className="card-title">{t('home.featureDashboardTitle')}</h3>
              <p className="card-text">
                {t('home.featureDashboardDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
