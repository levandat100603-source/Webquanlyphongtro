import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FiHome, FiMapPin, FiMaximize2, FiUsers, FiPhone, FiShare2, FiMessageCircle, FiCopy, FiLink, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { roomService, bookingService, authService } from '../api/services';

const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';
const backendBaseUrl = apiBaseUrl.replace(/\/api\/?$/, '');

const resolveImageUrl = (value) => {
  const src = String(value || '').trim();
  if (!src) {
    return '';
  }
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
    return src;
  }
  return src.startsWith('/') ? `${backendBaseUrl}${src}` : `${backendBaseUrl}/${src}`;
};

const formatDateDisplay = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}/${month}/${year}`;
};

const formatIsoDateForDisplay = (isoDate) => {
  const text = String(isoDate || '').trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return '';
  }
  return `${match[3]}/${match[2]}/${match[1]}`;
};

const parseFlexibleDisplayDateToIso = (displayDate) => {
  const text = String(displayDate || '').trim();
  const match = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!match) {
    return '';
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return '';
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const RoomDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingData, setBookingData] = useState({
    start_date: '',
    rental_months: 1,
    full_name: '',
    phone: '',
    permanent_address: '',
    cccd: '',
    number_of_people: 1,
    number_of_vehicles: 0,
    notes: '',
  });
  const [startDateInput, setStartDateInput] = useState('');
  const [message, setMessage] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [shareMessage, setShareMessage] = useState('');
  const [isMagnifying, setIsMagnifying] = useState(false);
  const [magnifierPoint, setMagnifierPoint] = useState({ x: 50, y: 50 });
  const thumbsRef = useRef(null);
  const galleryStageRef = useRef(null);

  const fetchRoom = useCallback(async () => {
    try {
      const data = await roomService.getRoom(id);
      setRoom(data);
    } catch (error) {
      console.error('Error fetching room:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [room?.id]);

  useEffect(() => {
    if (!room?.id) {
      return;
    }

    const saved = localStorage.getItem('roomRecentViews');
    const previous = saved ? JSON.parse(saved) : [];
    const current = {
      id: room.id,
      title: room.title,
    };
    const next = [current, ...previous.filter((item) => item.id !== room.id)].slice(0, 8);
    localStorage.setItem('roomRecentViews', JSON.stringify(next));
  }, [room?.id, room?.title]);

  useEffect(() => {
    if (showBookingForm) {
      document.body.classList.add('booking-modal-open');
    } else {
      document.body.classList.remove('booking-modal-open');
    }

    return () => {
      document.body.classList.remove('booking-modal-open');
    };
  }, [showBookingForm]);

  const getEndDateIso = (startDateIso, rentalMonths) => {
    const startDate = new Date(`${startDateIso}T00:00:00`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + rentalMonths);
    endDate.setDate(endDate.getDate() - 1);

    return `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
  };

  const getContractEndDateDisplay = () => {
    const startDateIso = bookingData.start_date || parseFlexibleDisplayDateToIso(startDateInput);
    const monthsValue = Number(bookingData.rental_months || 0);

    if (!startDateIso || !Number.isFinite(monthsValue) || monthsValue < 1) {
      return '';
    }

    const endDateIso = getEndDateIso(startDateIso, monthsValue);
    return formatIsoDateForDisplay(endDateIso);
  };

  const buildBookingNotes = () => {
    const detailLines = [
      `Ngay bat dau: ${startDateInput || formatIsoDateForDisplay(bookingData.start_date)}`,
      `So thang thue: ${bookingData.rental_months}`,
      `Ngay ket thuc: ${getContractEndDateDisplay()}`,
      `Ho ten: ${bookingData.full_name}`,
      `So dien thoai: ${bookingData.phone}`,
      `Thuong tru: ${bookingData.permanent_address}`,
      `CCCD: ${bookingData.cccd}`,
      `So nguoi: ${bookingData.number_of_people}`,
      `So xe: ${bookingData.number_of_vehicles}`,
    ];

    if (bookingData.notes.trim()) {
      detailLines.push(`Ghi chu: ${bookingData.notes.trim()}`);
    }

    return detailLines.join('\n');
  };

  const handleBooking = async (e) => {
    e.preventDefault();

    const requiredFields = [
      bookingData.full_name,
      bookingData.phone,
      bookingData.permanent_address,
      bookingData.cccd,
    ];

    const peopleCount = Number(bookingData.number_of_people);
    const vehicleCount = Number(bookingData.number_of_vehicles);
    const monthsValue = Number(bookingData.rental_months || 0);
    const startDateIso = bookingData.start_date || parseFlexibleDisplayDateToIso(startDateInput);
    const parsedStartDate = startDateIso ? new Date(`${startDateIso}T00:00:00`) : null;

    if (requiredFields.some((field) => !String(field || '').trim())) {
      setMessage('Vui lòng nhập đầy đủ thông tin bắt buộc.');
      return;
    }

    if (!Number.isFinite(peopleCount) || peopleCount < 1) {
      setMessage('Số người phải từ 1 trở lên.');
      return;
    }

    if (!Number.isFinite(vehicleCount) || vehicleCount < 0) {
      setMessage('Số xe không hợp lệ.');
      return;
    }

    if (!Number.isFinite(monthsValue) || monthsValue < 1 || monthsValue > 120) {
      setMessage('Số tháng thuê phải từ 1 đến 120.');
      return;
    }

    if (!parsedStartDate || Number.isNaN(parsedStartDate.getTime())) {
      setMessage('Ngày bắt đầu không hợp lệ.');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    parsedStartDate.setHours(0, 0, 0, 0);
    if (parsedStartDate < today) {
      setMessage('Ngày bắt đầu phải từ hôm nay trở đi.');
      return;
    }

    const endDateIso = getEndDateIso(startDateIso, monthsValue);
    
    try {
      await bookingService.createBooking({
        room_id: id,
        start_date: startDateIso,
        end_date: endDateIso,
        rental_months: monthsValue,
        notes: buildBookingNotes(),
      });
      setMessage('Đặt phòng thành công! Vui lòng chờ phê duyệt.');
      setBookingData({
        start_date: '',
        rental_months: 1,
        full_name: '',
        phone: '',
        permanent_address: '',
        cccd: '',
        number_of_people: 1,
        number_of_vehicles: 0,
        notes: '',
      });
      setStartDateInput('');
      setShowBookingForm(false);
    } catch (error) {
      setMessage('Đặt phòng thất bại. Vui lòng thử lại.');
    }
  };

  const handleStartDateChange = (event) => {
    const value = event.target.value;
    setStartDateInput(value);

    const isoDate = parseFlexibleDisplayDateToIso(value);
    setBookingData((prev) => ({ ...prev, start_date: isoDate }));
  };

  const handleStartDateBlur = () => {
    const isoDate = parseFlexibleDisplayDateToIso(startDateInput);
    if (!isoDate) {
      return;
    }

    setStartDateInput(formatIsoDateForDisplay(isoDate));
    setBookingData((prev) => ({ ...prev, start_date: isoDate }));
  };

  const handleShareRoom = async () => {
    const shareData = {
      title: room?.title || 'Phòng trọ',
      text: `Xem phòng này: ${room?.title || ''}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
        setShareMessage('Đã sao chép link phòng.');
        setTimeout(() => setShareMessage(''), 2200);
      }
    } catch (error) {
      setShareMessage('Không thể chia sẻ lúc này.');
      setTimeout(() => setShareMessage(''), 2200);
    }
  };

  const copyText = async (text, successMessage) => {
    try {
      await navigator.clipboard.writeText(text);
      setShareMessage(successMessage);
      setTimeout(() => setShareMessage(''), 2200);
    } catch (error) {
      setShareMessage('Không thể sao chép lúc này.');
      setTimeout(() => setShareMessage(''), 2200);
    }
  };

  const isLogged = authService.isAuthenticated();
  const isOwner = isLogged && room && room.owner_id === authService.getCurrentUser()?.id;
  const isAdmin = isLogged && authService.isAdmin();
  const roomImages = Array.isArray(room?.images) ? room.images.map(resolveImageUrl).filter(Boolean) : [];
  const hasMultipleImages = roomImages.length > 1;
  const activeImage = roomImages[activeImageIndex];
  const ownerPhone = String(room?.owner?.phone || '').replace(/\D/g, '');
  const facebookProfileUrl = 'https://www.facebook.com/vandat100603';
  const zaloContactUrl = ownerPhone ? `https://zalo.me/${ownerPhone}` : 'https://zalo.me';
  const zaloQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(zaloContactUrl)}`;
  const roomStatus = room?.status || 'maintenance';
  const roomStatusLabel = roomStatus === 'available' ? 'Còn trống' : roomStatus === 'rented' ? 'Đã cho thuê' : 'Bảo trì';
  const summaryItems = [
    { label: 'Diện tích', value: `${room?.area || 0} m²`, icon: <FiMaximize2 size={14} /> },
    { label: 'Sức chứa', value: `${room?.capacity || 0} người`, icon: <FiUsers size={14} /> },
    { label: 'Địa chỉ', value: [room?.address, room?.district, room?.city].filter(Boolean).join(', '), icon: <FiMapPin size={14} /> },
  ];

  const goToPreviousImage = useCallback(() => {
    if (!hasMultipleImages) {
      return;
    }
    setActiveImageIndex((prev) => (prev - 1 + roomImages.length) % roomImages.length);
  }, [hasMultipleImages, roomImages.length]);

  const goToNextImage = useCallback(() => {
    if (!hasMultipleImages) {
      return;
    }
    setActiveImageIndex((prev) => (prev + 1) % roomImages.length);
  }, [hasMultipleImages, roomImages.length]);

  const scrollThumbStrip = (direction) => {
    if (!thumbsRef.current) {
      return;
    }
    thumbsRef.current.scrollBy({ left: direction * 220, behavior: 'smooth' });
  };

  const updateMagnifierPoint = (event) => {
    if (!galleryStageRef.current || !activeImage) {
      return;
    }

    const bounds = galleryStageRef.current.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;

    setMagnifierPoint({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  };

  useEffect(() => {
    if (!thumbsRef.current) {
      return;
    }
    const activeThumb = thumbsRef.current.querySelector('.room-thumb.active');
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeImageIndex]);

  useEffect(() => {
    if (!hasMultipleImages) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === 'ArrowLeft') {
        goToPreviousImage();
      } else if (event.key === 'ArrowRight') {
        goToNextImage();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goToPreviousImage, goToNextImage, hasMultipleImages]);

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  if (!room) {
    return <div className="loading">Không tìm thấy phòng trọ</div>;
  }

  return (
    <div className="container">
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="btn btn-primary">
          ← Quay lại
        </button>
      </div>

      <div className="panel room-detail">
        <div className="room-detail-shell">
          <div className="room-detail-main">
            <div className="room-detail-hero room-detail-card">
              <div className="room-detail-topline">
                <span className={`room-status-pill ${room.status}`}>{roomStatusLabel}</span>
                <div className="room-detail-actions-inline">
                  <button type="button" className="btn btn-neutral btn-sm" onClick={handleShareRoom} aria-label="Chia sẻ phòng">
                    <FiShare2 size={14} /> Chia sẻ
                  </button>
                  <button type="button" className="btn btn-neutral btn-sm" onClick={() => copyText(window.location.href, 'Đã sao chép link chia sẻ.')} aria-label="Sao chép link phòng">
                    <FiLink size={14} /> Copy link
                  </button>
                </div>
              </div>
              <h1 className="room-detail-title">{room.title}</h1>
              <div className="room-quick-meta">
                <span className="room-meta-item"><FiMapPin size={14} /> {room.city}</span>
                <span className="room-meta-item"><FiMaximize2 size={14} /> {room.area} m²</span>
                <span className="room-meta-item"><FiUsers size={14} /> {room.capacity} người</span>
              </div>
            </div>

            <div className="room-gallery-main room-detail-card">
              <div
                className={`card-image room-gallery-stage ${isMagnifying ? 'is-magnifying' : ''}`}
                ref={galleryStageRef}
                onMouseEnter={() => setIsMagnifying(true)}
                onMouseMove={updateMagnifierPoint}
                onMouseLeave={() => setIsMagnifying(false)}
              >
                {activeImage ? (
                  <img
                    key={`${room.id}-${activeImageIndex}`}
                    src={activeImage}
                    alt={`${room.title} - ảnh ${activeImageIndex + 1}`}
                    className="room-gallery-image"
                    style={{ transformOrigin: `${magnifierPoint.x}% ${magnifierPoint.y}%` }}
                  />
                ) : (
                  <div className="room-gallery-empty">Chưa có ảnh cho phòng này</div>
                )}

                {hasMultipleImages && (
                  <>
                    <button
                      type="button"
                      className="room-gallery-nav prev"
                      onClick={goToPreviousImage}
                      aria-label="Xem ảnh trước"
                    >
                      <FiChevronLeft size={26} />
                    </button>
                    <button
                      type="button"
                      className="room-gallery-nav next"
                      onClick={goToNextImage}
                      aria-label="Xem ảnh tiếp theo"
                    >
                      <FiChevronRight size={26} />
                    </button>
                    <div className="room-gallery-counter">{activeImageIndex + 1} / {roomImages.length}</div>
                  </>
                )}
              </div>

              {hasMultipleImages && (
                <div className="room-gallery-thumbs-wrap">
                  <button
                    type="button"
                    className="room-gallery-thumbs-nav"
                    onClick={() => scrollThumbStrip(-1)}
                    aria-label="Cuộn ảnh thu nhỏ sang trái"
                  >
                    <FiChevronLeft size={20} />
                  </button>
                  <div className="room-gallery-thumbs" ref={thumbsRef}>
                    {roomImages.map((image, index) => (
                      <button
                        key={`${room.id}-image-${index}`}
                        type="button"
                        className={`room-thumb ${index === activeImageIndex ? 'active' : ''}`}
                        onClick={() => setActiveImageIndex(index)}
                        aria-label={`Chọn ảnh ${index + 1}`}
                      >
                        <img src={image} alt={`${room.title} ${index + 1}`} />
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="room-gallery-thumbs-nav"
                    onClick={() => scrollThumbStrip(1)}
                    aria-label="Cuộn ảnh thu nhỏ sang phải"
                  >
                    <FiChevronRight size={20} />
                  </button>
                </div>
              )}
            </div>

            <div className="room-detail-card room-detail-section">
              <h3>Mô tả chi tiết</h3>
              <p className="muted-text">{room.description}</p>
            </div>

            <div className="room-detail-card room-detail-section">
              <h3>Địa chỉ</h3>
              <p className="detail-row"><strong><FiMapPin size={14} /> Địa chỉ:</strong> {room.address}</p>
              <p className="detail-row"><strong>Quận/Huyện:</strong> {room.district}</p>
              <p className="detail-row"><strong>Thành phố:</strong> {room.city}</p>
            </div>

            {Array.isArray(room.utilities) && room.utilities.length > 0 && (
              <div className="room-detail-card room-detail-section">
                <h3>Tiện ích</h3>
                <ul className="utility-list">
                  {room.utilities.map((utility, index) => (
                    <li key={index}>{utility}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <aside className="room-detail-sidebar">
            <div className="room-detail-card room-summary-card">
              <div className="room-summary-price">{Number(room.price).toLocaleString('vi-VN')} đ/tháng</div>
              <div className="room-summary-items">
                {summaryItems.map((item) => (
                  <div key={item.label} className="room-summary-row">
                    <span className="room-summary-label">{item.icon} {item.label}:</span>
                    <span className="room-summary-value">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="room-detail-card room-contact-card">
              <h3>Thông tin chủ nhà</h3>
              <p className="detail-row"><strong><FiHome size={14} /> Tên:</strong> {room.owner?.name}</p>
              <p className="detail-row"><strong>Số điện thoại:</strong> {room.owner?.phone || 'Chưa cập nhật'}</p>
              <div className="room-contact-actions">
                {room.owner?.phone && (
                  <a href={`tel:${room.owner.phone}`} className="btn btn-success btn-sm" aria-label="Gọi cho chủ nhà">
                    <FiPhone size={14} /> Gọi ngay
                  </a>
                )}
                {room.owner?.phone && (
                  <button
                    type="button"
                    className="btn btn-neutral btn-sm"
                    onClick={() => copyText(String(room.owner.phone), 'Đã sao chép số điện thoại.')}
                    aria-label="Sao chép số điện thoại chủ nhà"
                  >
                    <FiCopy size={14} /> Copy số
                  </button>
                )}
                {ownerPhone && (
                  <a href={`https://zalo.me/${ownerPhone}`} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" aria-label="Nhắn Zalo cho chủ nhà">
                    <FiMessageCircle size={14} /> Nhắn Zalo
                  </a>
                )}
                <a href="https://www.facebook.com/messages/" target="_blank" rel="noreferrer" className="btn btn-neutral btn-sm" aria-label="Mở Messenger">
                  <FiMessageCircle size={14} /> Messenger
                </a>
                <a href={facebookProfileUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" aria-label="Mở Facebook cá nhân">
                  <FiShare2 size={14} /> Facebook
                </a>
              </div>
              <div className="contact-qr-wrap">
                <p className="contact-qr-title">QR Zalo</p>
                <img src={zaloQrUrl} alt="QR Zalo" className="contact-qr-image" />
              </div>
              {shareMessage && <p className="helper-link">{shareMessage}</p>}
            </div>

            {room.status === 'available' && (
              <div className="room-detail-card booking-card">
                <h3>Đặt phòng</h3>

                {message && (
                  <div className={message.includes('thành công') ? 'success-message' : 'error-message'}>
                    {message}
                  </div>
                )}

                {!isLogged ? (
                  <div className="booking-guest">
                    <p>Vui lòng đăng nhập để đặt phòng</p>
                    <button onClick={() => navigate('/login')} className="form-button">
                      Đăng nhập
                    </button>
                    <p className="helper-link">
                      Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
                    </p>
                  </div>
                ) : (
                  <>
                    <button type="button" className="form-button" onClick={() => setShowBookingForm(true)}>
                      Đặt phòng ngay
                    </button>

                    {showBookingForm && (
                      <div className="booking-modal-overlay" onClick={() => setShowBookingForm(false)}>
                        <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
                          <div className="booking-modal-header">
                            <h4>Thông tin đặt phòng</h4>
                            <button
                              type="button"
                              className="booking-modal-close"
                              onClick={() => setShowBookingForm(false)}
                              aria-label="Đóng form đặt phòng"
                            >
                              ×
                            </button>
                          </div>

                          <form onSubmit={handleBooking}>
                            <div className="form-group">
                              <label className="form-label">Ngày bắt đầu đặt</label>
                              <input
                                type="text"
                                className="form-input"
                                value={startDateInput}
                                inputMode="numeric"
                                placeholder="dd/mm/yyyy"
                                onChange={handleStartDateChange}
                                onBlur={handleStartDateBlur}
                                required
                              />
                            </div>

                            <div className="form-group">
                              <label className="form-label">Số tháng thuê</label>
                              <input
                                type="number"
                                className="form-input"
                                min="1"
                                max="120"
                                value={bookingData.rental_months}
                                onChange={(e) => setBookingData({ ...bookingData, rental_months: e.target.value })}
                                required
                              />
                            </div>

                            <div className="form-group">
                              <label className="form-label">Ngày kết thúc tự động</label>
                              <input
                                type="text"
                                className="form-input"
                                value={getContractEndDateDisplay()}
                                placeholder="Tự động tính"
                                readOnly
                              />
                            </div>

                            <div className="form-group">
                              <label className="form-label">Họ tên</label>
                              <input
                                type="text"
                                className="form-input"
                                value={bookingData.full_name}
                                onChange={(e) => setBookingData({ ...bookingData, full_name: e.target.value })}
                                required
                              />
                            </div>

                            <div className="form-group">
                              <label className="form-label">Số điện thoại</label>
                              <input
                                type="tel"
                                className="form-input"
                                value={bookingData.phone}
                                onChange={(e) => setBookingData({ ...bookingData, phone: e.target.value })}
                                required
                              />
                            </div>

                            <div className="form-group">
                              <label className="form-label">Thường trú</label>
                              <input
                                type="text"
                                className="form-input"
                                value={bookingData.permanent_address}
                                onChange={(e) => setBookingData({ ...bookingData, permanent_address: e.target.value })}
                                required
                              />
                            </div>

                            <div className="form-group">
                              <label className="form-label">CCCD</label>
                              <input
                                type="text"
                                className="form-input"
                                value={bookingData.cccd}
                                onChange={(e) => setBookingData({ ...bookingData, cccd: e.target.value })}
                                required
                              />
                            </div>

                            <div className="form-group">
                              <label className="form-label">Số người</label>
                              <input
                                type="number"
                                className="form-input"
                                min="1"
                                value={bookingData.number_of_people}
                                onChange={(e) => setBookingData({ ...bookingData, number_of_people: e.target.value })}
                                required
                              />
                            </div>

                            <div className="form-group">
                              <label className="form-label">Số xe</label>
                              <input
                                type="number"
                                className="form-input"
                                min="0"
                                value={bookingData.number_of_vehicles}
                                onChange={(e) => setBookingData({ ...bookingData, number_of_vehicles: e.target.value })}
                                required
                              />
                            </div>

                            <div className="form-group">
                              <label className="form-label">Ghi chú</label>
                              <textarea
                                className="form-textarea"
                                value={bookingData.notes}
                                onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                                placeholder="Thêm ghi chú nếu có..."
                              />
                            </div>

                            <button type="submit" className="form-button">
                              Hoàn tất
                            </button>
                          </form>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {(isOwner || isAdmin) && (
              <div className="room-detail-card">
                <button
                  onClick={() => navigate(`/edit-room/${room.id}`)}
                  className="btn btn-primary btn-block"
                >
                  Chỉnh sửa
                </button>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default RoomDetail;
