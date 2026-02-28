import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import RoomList from './pages/RoomList';
import RoomDetail from './pages/RoomDetail';
import CreateRoom from './pages/CreateRoom';
import EditRoom from './pages/EditRoom';
import MyRooms from './pages/MyRooms';
import BookingList from './pages/BookingList';
import Dashboard from './pages/Dashboard';
import UserList from './pages/UserList';
import Profile from './pages/Profile';
import { authService } from './api/services';

const PrivateRoute = ({ children, roles = [] }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" />;
  }

  if (roles.length > 0) {
    const user = authService.getCurrentUser();
    if (!roles.includes(user?.role)) {
      return <Navigate to="/" />;
    }
  }

  return children;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/rooms" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/rooms" element={<RoomList />} />
          <Route path="/rooms/:id" element={<RoomDetail />} />
          
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          
          <Route path="/create-room" element={
            <PrivateRoute roles={['saler', 'admin']}>
              <CreateRoom />
            </PrivateRoute>
          } />
          
          <Route path="/edit-room/:id" element={
            <PrivateRoute roles={['saler', 'admin']}>
              <EditRoom />
            </PrivateRoute>
          } />
          
          <Route path="/my-rooms" element={
            <PrivateRoute roles={['saler', 'admin']}>
              <MyRooms />
            </PrivateRoute>
          } />
          
          <Route path="/bookings" element={
            <PrivateRoute>
              <BookingList />
            </PrivateRoute>
          } />
          
          <Route path="/users" element={
            <PrivateRoute roles={['admin']}>
              <UserList />
            </PrivateRoute>
          } />
          
          <Route path="/profile" element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          } />

          <Route path="*" element={<Navigate to="/rooms" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
