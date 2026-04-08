-- Room Rental Management System
-- MySQL Database Schema

-- Tạo database nếu chưa tồn tại
CREATE DATABASE IF NOT EXISTS room_rental CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Sử dụng database
USE room_rental;

-- Drop tables nếu tồn tại (để reset)
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS personal_access_tokens;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS users;

-- Tạo bảng users
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    email_verified_at TIMESTAMP NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user', 'saler') NOT NULL DEFAULT 'user',
    phone VARCHAR(255) NULL,
    address TEXT NULL,
    remember_token VARCHAR(100) NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tạo bảng rooms
CREATE TABLE rooms (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    district VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    area DECIMAL(8, 2) NOT NULL,
    capacity INT NOT NULL DEFAULT 1,
    utilities JSON NULL,
    images JSON NULL,
    status ENUM('available', 'rented', 'maintenance') NOT NULL DEFAULT 'available',
    owner_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tạo bảng bookings
CREATE TABLE bookings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    room_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    status ENUM('pending', 'approved', 'rejected', 'cancelled', 'completed') NOT NULL DEFAULT 'pending',
    total_price DECIMAL(10, 2) NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tạo bảng personal_access_tokens (cho Laravel Sanctum)
CREATE TABLE personal_access_tokens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tokenable_type VARCHAR(255) NOT NULL,
    tokenable_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    abilities TEXT NULL,
    last_used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX personal_access_tokens_tokenable_type_tokenable_id_index (tokenable_type, tokenable_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tạo bảng password_reset_tokens
CREATE TABLE password_reset_tokens (
    email VARCHAR(255) PRIMARY KEY,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert dữ liệu mẫu
-- Admin User (password: password)
INSERT INTO users (name, email, password, role, phone, created_at, updated_at) VALUES
('Admin User', 'admin@roomrental.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', '0123456789', NOW(), NOW());

-- Saler User (password: password)
INSERT INTO users (name, email, password, role, phone, created_at, updated_at) VALUES
('Saler User', 'saler@roomrental.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'saler', '0123456788', NOW(), NOW());

-- Regular User (password: password)
INSERT INTO users (name, email, password, role, phone, created_at, updated_at) VALUES
('Regular User', 'user@roomrental.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', '0123456787', NOW(), NOW());

-- Thêm user owner khác
INSERT INTO users (name, email, password, role, phone, created_at, updated_at) VALUES
('Nguyễn Văn A', 'nguyenvana@roomrental.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'saler', '0987654321', NOW(), NOW()),
('Trần Thị B', 'tranthib@roomrental.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'saler', '0912345678', NOW(), NOW()),
('Lê Minh C', 'leminhc@roomrental.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'saler', '0901234567', NOW(), NOW());

-- Insert sample rooms (HỒ CHÍ MINH - 12 phòng)
INSERT INTO rooms (title, description, address, city, district, price, area, capacity, utilities, status, owner_id, created_at, updated_at) VALUES
('Phòng trọ cao cấp quận 1', 'Phòng trọ đầy đủ tiện nghi, gần trường đại học và chợ, an ninh 24/7', '123 Lê Lợi', 'Hồ Chí Minh', 'Quận 1', 3500000.00, 25.00, 2, '["Wifi", "Máy lạnh", "Tủ lạnh", "Máy giặt", "Ban công"]', 'available', 2, NOW(), NOW()),
('Phòng trọ giá rẻ Bình Thạnh', 'Phòng sạch sẽ, an ninh tốt, gần chợ Tân Bình', '456 Xô Viết Nghệ Tĩnh', 'Hồ Chí Minh', 'Bình Thạnh', 2000000.00, 20.00, 2, '["Wifi", "Giường", "Tủ quần áo", "Bàn học"]', 'available', 2, NOW(), NOW()),
('Studio sang trọng quận 3', 'Studio hiện đại, view đẹp, có bếp đầy đủ', '789 Võ Văn Tần', 'Hồ Chí Minh', 'Quận 3', 5000000.00, 35.00, 2, '["Wifi", "Máy lạnh", "Tủ lạnh", "Máy giặt", "Bếp", "Ban công"]', 'available', 3, NOW(), NOW()),
('Căn hộ mini Thủ Đức', 'Căn hộ nhỏ gọn, tiện lợi, giá phải chăng', '321 Võ Văn Kiệt', 'Hồ Chí Minh', 'Thủ Đức', 2500000.00, 22.00, 1, '["Wifi", "Máy lạnh", "Tủ lạnh"]', 'rented', 3, NOW(), NOW()),
('Phòng trọ tập thể Gò Vấp', 'Phòng tập thể an toàn, gần trường học', '555 Quang Trung', 'Hồ Chí Minh', 'Gò Vấp', 1500000.00, 18.00, 3, '["Wifi", "Giường", "Quạt"]', 'available', 2, NOW(), NOW()),
('Nhà riêng quận 2', 'Nhà riêng 1 trệt 1 lầu, có sân nhỏ', '888 Lâm Văn Bền', 'Hồ Chí Minh', 'Quận 2', 6000000.00, 50.00, 4, '["Wifi", "Máy lạnh", "Tủ lạnh", "Máy giặt", "Bếp", "Ban công", "Sân"]', 'maintenance', 4, NOW(), NOW()),
('Phòng đại học Dĩ An', 'Gần trường ĐH Bách Khoa, phòng sạch sẽ', '234 Nguyễn An Ninh', 'Hồ Chí Minh', 'Bình Dương', 1800000.00, 20.00, 2, '["Wifi", "Giường tầng", "Tủ lạnh nhỏ"]', 'available', 4, NOW(), NOW()),
('Chung cư mini Quân 7', 'Chung cư mini hiện đại, gần CV Tao Đàn', '678 Lê Đại Hành', 'Hồ Chí Minh', 'Quận 7', 4200000.00, 28.00, 2, '["Wifi", "Máy lạnh", "Tủ lạnh", "Máy giặt", "Bếp"]', 'available', 3, NOW(), NOW()),
('Phòng trọ kiến trúc hiện đại q.1', 'Phòng mới xây dựng, thiết kế tối ưu', '999 Nguyễn Hữu Cảnh', 'Hồ Chí Minh', 'Quận 1', 3800000.00, 26.00, 2, '["Wifi", "Máy lạnh", "Tủ lạnh", "Máy giặt", "Ban công", "Cửa sổ lớn"]', 'available', 2, NOW(), NOW()),
('Căn hộ cho sinh viên', 'Gần các trường đại học, giáp ranh Q1 Q3', '345 Cách Mạng Tháng 8', 'Hồ Chí Minh', 'Quận 3', 2200000.00, 21.00, 2, '["Wifi", "Máy lạnh", "Giường"]', 'rented', 3, NOW(), NOW()),
('Penthouse quận Bình Thạnh', 'View sông Sài Gòn, rất sang trọng', '567 Hoàng Sa', 'Hồ Chí Minh', 'Bình Thạnh', 8000000.00, 55.00, 3, '["Wifi", "Máy lạnh", "Tủ lạnh", "Máy giặt", "Bếp", "Ban công lớn", "Máy tắm nước nóng"]', 'available', 4, NOW(), NOW()),
('Phòng trọ vệ sinh cao Quận 4', 'Vệ sinh tốt, an ninh cam kết 24/24', '111 Đặng Văn Ngữ', 'Hồ Chí Minh', 'Quận 4', 2300000.00, 19.00, 2, '["Wifi", "Máy lạnh", "Tủ quần áo"]', 'available', 2, NOW(), NOW()),

-- Insert sample rooms (HÀ NỘI - 8 phòng)
('Phòng trọ Cầu Giấy', 'Phòng gần trường ĐH Công Nghệ, an toàn', '100 Trần Duy Hưng', 'Hà Nội', 'Cầu Giấy', 2800000.00, 24.00, 2, '["Wifi", "Máy lạnh", "Tủ lạnh", "Máy giặt"]', 'available', 3, NOW(), NOW()),
('Studio Hoan Kiếm', 'Studio nhỏ gọn, vị trí trung tâm', '200 Đại Cồ Việt', 'Hà Nội', 'Hoàn Kiếm', 4000000.00, 30.00, 1, '["Wifi", "Máy lạnh", "Tủ lạnh", "Bếp"]', 'available', 2, NOW(), NOW()),
('Phòng tập thể Thanh Xuân', 'Phòng rộng thoáng, gần chợ Yên Hoà', '300 Nguyễn Chí Thanh', 'Hà Nội', 'Thanh Xuân', 1900000.00, 22.00, 3, '["Wifi", "Giường tầng", "Quạt gió"]', 'available', 4, NOW(), NOW()),
('Nhà riêng Ba Đình', 'Nhà riêng 2 tầng, có bếp riêng', '400 Hoàng Minh Giám', 'Hà Nội', 'Ba Đình', 5500000.00, 45.00, 4, '["Wifi", "Máy lạnh", "Tủ lạnh", "Máy giặt", "Bếp"]', 'available', 3, NOW(), NOW()),
('Căn hộ Tây Hồ', 'Căn hộ view hồ, không gian xanh', '500 Võ Chí Công', 'Hà Nội', 'Tây Hồ', 3200000.00, 28.00, 2, '["Wifi", "Máy lạnh", "Tủ lạnh", "Máy giặt", "Ban công"]', 'rented', 2, NOW(), NOW()),
('Phòng trọ Long Biên', 'Phòng mới, giá rẻ, gần cầu Long Biên', '600 Nguyễn Văn Linh', 'Hà Nội', 'Long Biên', 1600000.00, 18.00, 2, '["Wifi", "Giường", "Tủ quần áo"]', 'available', 4, NOW(), NOW()),
('Studio hiện đại Đống Đa', 'Studio mới xây, đầy đủ tiện nghi', '700 Giải Phóng', 'Hà Nội', 'Đống Đa', 3100000.00, 26.00, 2, '["Wifi", "Máy lạnh", "Tủ lạnh", "Máy giặt"]', 'available', 3, NOW(), NOW()),
('Phòng trọ Hai Bà Trưng', 'Phòng thoáng mát, gần phố cổ', '800 Hàng Bông', 'Hà Nội', 'Hoàn Kiếm', 2600000.00, 21.00, 2, '["Wifi", "Máy lạnh", "Tủ lạnh"]', 'maintenance', 2, NOW(), NOW()),

-- Insert sample rooms (ĐÀ NẴNG - 5 phòng)
('Phòng trọ Hải Châu', 'Phòng gần biển, không khí thoáng mát', '150 Bạch Đằng', 'Đà Nẵng', 'Hải Châu', 2100000.00, 22.00, 2, '["Wifi", "Máy lạnh", "Tủ lạnh"]', 'available', 3, NOW(), NOW()),
('Chung cư mini Thanh Khê', 'Căn hộ mini hiện đại, gần cơ quan', '250 Ngô Quyền', 'Đà Nẵng', 'Thanh Khê', 2700000.00, 25.00, 2, '["Wifi", "Máy lạnh", "Tủ lạnh", "Máy giặt"]', 'available', 4, NOW(), NOW()),
('Nhà riêng Cẩm Lệ', 'Nhà riêng xinh, gần công viên', '350 Trần Hưng Đạo', 'Đà Nẵng', 'Cẩm Lệ', 3500000.00, 35.00, 3, '["Wifi", "Máy lạnh", "Tủ lạnh", "Máy giặt", "Bếp"]', 'available', 3, NOW(), NOW()),
('Studio biển Sơn Trà', 'Studio view biển, đẹp lắm', '450 Điện Biên Phủ', 'Đà Nẵng', 'Sơn Trà', 3800000.00, 28.00, 1, '["Wifi", "Máy lạnh", "Tủ lạnh", "Bếp"]', 'rented', 2, NOW(), NOW()),
('Phòng trọ Ngũ Hành Sơn', 'Phòng yên tĩnh, gần bãi biển', '550 Lê Đình Lý', 'Đà Nẵng', 'Ngũ Hành Sơn', 2000000.00, 20.00, 2, '["Wifi", "Máy lạnh", "Giường"]', 'available', 4, NOW(), NOW());


-- Insert sample bookings
INSERT INTO bookings (room_id, user_id, start_date, end_date, status, total_price, notes, created_at, updated_at) VALUES
(1, 1, '2026-01-15', '2026-04-15', 'completed', 10500000.00, 'Khách hàng hài lòng', NOW(), NOW()),
(1, 3, '2026-04-20', NULL, 'approved', 3500000.00, 'Booking tháng 4', NOW(), NOW()),
(2, 1, '2026-02-01', '2026-05-01', 'approved', 6000000.00, 'Đã thanh toán cọc', NOW(), NOW()),
(4, 3, '2026-03-10', NULL, 'approved', 2500000.00, 'Khách mới', NOW(), NOW()),
(5, 1, '2026-03-15', '2026-06-15', 'completed', 4500000.00, 'Hết hạn hợp đồng', NOW(), NOW()),
(10, 3, '2026-02-20', NULL, 'approved', 2200000.00, 'Sinh viên', NOW(), NOW()),
(14, 1, '2026-01-01', '2026-03-31', 'completed', 8400000.00, 'Khách dài hạn', NOW(), NOW()),
(16, 3, '2026-03-25', NULL, 'pending', 1900000.00, 'Chờ xác nhận', NOW(), NOW()),
(19, 1, '2026-02-10', '2026-04-10', 'completed', 4200000.00, 'Hợp đồng kỳ', NOW(), NOW()),
(21, 3, '2026-04-05', NULL, 'approved', 2100000.00, 'Booking mới', NOW(), NOW());


CREATE TABLE IF NOT EXISTS migrations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    migration VARCHAR(255) NOT NULL,
    batch INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO migrations (migration, batch) VALUES
('2024_01_01_000000_create_users_table', 1),
('2024_01_01_000001_create_rooms_table', 1),
('2024_01_01_000002_create_bookings_table', 1),
('2024_01_01_000003_create_personal_access_tokens_table', 1),
('2024_01_01_000004_create_password_reset_tokens_table', 1);

-- Hiển thị thông tin chi tiết
SELECT 'Database setup completed successfully!' as Status;
SELECT COUNT(*) as 'Tổng Users' FROM users;
SELECT COUNT(*) as 'Tổng Rooms' FROM rooms;
SELECT COUNT(*) as 'Tổng Bookings' FROM bookings;
SELECT city, COUNT(*) as 'Số phòng' FROM rooms GROUP BY city;
SELECT status, COUNT(*) as 'Số phòng' FROM rooms GROUP BY status;
