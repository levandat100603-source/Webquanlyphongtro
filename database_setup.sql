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

-- Insert sample rooms
INSERT INTO rooms (title, description, address, city, district, price, area, capacity, utilities, status, owner_id, created_at, updated_at) VALUES
('Phòng trọ cao cấp quận 1', 'Phòng trọ đầy đủ tiện nghi, gần trường đại học và chợ', '123 Lê Lợi', 'Hồ Chí Minh', 'Quận 1', 3500000.00, 25.00, 2, '["Wifi", "Máy lạnh", "Tủ lạnh", "Máy giặt"]', 'available', 2, NOW(), NOW()),
('Phòng trọ giá rẻ Bình Thạnh', 'Phòng sạch sẽ, an ninh tốt', '456 Xô Viết Nghệ Tĩnh', 'Hồ Chí Minh', 'Bình Thạnh', 2000000.00, 20.00, 2, '["Wifi", "Giường", "Tủ quần áo"]', 'available', 2, NOW(), NOW()),
('Studio sang trọng quận 3', 'Studio hiện đại, view đẹp', '789 Võ Văn Tần', 'Hồ Chí Minh', 'Quận 3', 5000000.00, 35.00, 2, '["Wifi", "Máy lạnh", "Tủ lạnh", "Máy giặt", "Bếp", "Ban công"]', 'available', 2, NOW(), NOW());

-- Tạo migrations table để Laravel tracking
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

-- Hiển thị thông tin
SELECT 'Database setup completed successfully!' as Status;
SELECT COUNT(*) as 'Total Users' FROM users;
SELECT COUNT(*) as 'Total Rooms' FROM rooms;
