## Room Rental Management System - Backend

### Technology Stack
- Laravel 10
- MySQL
- Laravel Sanctum for API authentication

### Installation

1. Install dependencies:
```bash
composer install
```

2. Copy environment file:
```bash
copy .env.example .env
```

3. Generate application key:
```bash
php artisan key:generate
```

4. Configure database in `.env` file:
```
DB_DATABASE=room_rental
DB_USERNAME=root
DB_PASSWORD=your_password
```

5. Run migrations and seeders:
```bash
php artisan migrate --seed
```

6. Start the development server:
```bash
php artisan serve
```

The API will be available at `http://localhost:8000`

### Default Users
- Admin: admin@roomrental.com / password
- Saler: saler@roomrental.com / password
- User: user@roomrental.com / password

### API Endpoints

#### Authentication
- POST `/api/register` - Register new user
- POST `/api/login` - Login
- POST `/api/logout` - Logout (authenticated)
- GET `/api/me` - Get current user (authenticated)

#### Rooms
- GET `/api/rooms` - List all available rooms (public)
- GET `/api/rooms/{id}` - Get room details (public)
- POST `/api/rooms` - Create room (saler/admin only)
- PUT `/api/rooms/{id}` - Update room (owner/admin)
- DELETE `/api/rooms/{id}` - Delete room (owner/admin)
- GET `/api/my-rooms` - Get owner's rooms (saler/admin)

#### Bookings
- GET `/api/bookings` - List bookings (role-based)
- POST `/api/bookings` - Create booking (authenticated)
- GET `/api/bookings/{id}` - Get booking details
- PUT `/api/bookings/{id}` - Update booking status (owner/admin)
- DELETE `/api/bookings/{id}` - Delete booking

#### Users
- GET `/api/users` - List all users (admin only)
- GET `/api/users/{id}` - Get user details
- PUT `/api/users/{id}` - Update user (self/admin)
- DELETE `/api/users/{id}` - Delete user (admin only)

### User Roles
- **Admin**: Full access to all features
- **Saler**: Can create and manage rooms, manage bookings for their rooms
- **User**: Can browse rooms and create bookings
