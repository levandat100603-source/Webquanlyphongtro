import api from './api';

export const authService = {
  async register(data) {
    const response = await api.post('/register', data);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async login(email, password) {
    const response = await api.post('/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async logout() {
    await api.post('/logout');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  async getMe() {
    const response = await api.get('/me');
    return response.data;
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated() {
    return !!localStorage.getItem('token');
  },

  isAdmin() {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  },

  isSaler() {
    const user = this.getCurrentUser();
    return user?.role === 'saler';
  },
};

export const roomService = {
  async getRooms(params = {}) {
    const response = await api.get('/rooms', { params });
    return response.data;
  },

  async getRoom(id) {
    const response = await api.get(`/rooms/${id}`);
    return response.data;
  },

  async createRoom(data) {
    const response = await api.post('/rooms', data);
    return response.data;
  },

  async updateRoom(id, data) {
    const response = await api.put(`/rooms/${id}`, data);
    return response.data;
  },

  async deleteRoom(id) {
    const response = await api.delete(`/rooms/${id}`);
    return response.data;
  },

  async getMyRooms() {
    const response = await api.get('/my-rooms');
    return response.data;
  },
};

export const bookingService = {
  async getBookings() {
    const response = await api.get('/bookings');
    return response.data;
  },

  async getBooking(id) {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  },

  async createBooking(data) {
    const response = await api.post('/bookings', data);
    return response.data;
  },

  async updateBooking(id, status) {
    const response = await api.put(`/bookings/${id}`, { status });
    return response.data;
  },

  async deleteBooking(id) {
    const response = await api.delete(`/bookings/${id}`);
    return response.data;
  },
};

export const userService = {
  async getUsers() {
    const response = await api.get('/users');
    return response.data;
  },

  async getUser(id) {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  async updateUser(id, data) {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  async deleteUser(id) {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};
