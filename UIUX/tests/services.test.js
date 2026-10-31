import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { authService, roomService, bookingService, userService, ownerRegistrationRequestService as ownerService, demoService } from '../src/api/services.js';

class MemoryStorage {
  items = new Map();
  get length() { return this.items.size; }
  key(index) { return [...this.items.keys()][index] ?? null; }
  getItem(key) { return this.items.get(key) ?? null; }
  setItem(key, value) { this.items.set(key, String(value)); }
  removeItem(key) { this.items.delete(key); }
}
globalThis.localStorage = new MemoryStorage();
globalThis.sessionStorage = new MemoryStorage();
beforeEach(() => demoService.reset());
const login = (role) => demoService.switchRole(role);
const future = () => { const d = new Date(); d.setDate(d.getDate() + 7); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

test('registration requires the demo OTP; account survives a new session', async () => {
  const input = { name: 'Sinh viên mẫu', email: 'new@bigsix.test', password: '12345678', password_confirmation: '12345678' };
  await authService.register(input);
  await assert.rejects(authService.verifyRegistration({ email: input.email, code: '000000' }));
  const result = await authService.verifyRegistration({ email: input.email, code: '123456' });
  assert.equal(result.user.role, 'user');
  assert.equal('password' in result.user, false);
  await authService.logout();
  assert.equal(authService.isAuthenticated(), false);
  await authService.login(input.email, input.password);
  assert.equal(authService.getCurrentUser().email, input.email);
  await assert.rejects(authService.register(input), /đăng ký/);
});

test('room filters, pagination, owner permissions and CRUD', async () => {
  const rooms = await roomService.getRooms({ per_page: 50 });
  assert.equal(rooms.total, 14);
  const filtered = await roomService.getRooms({ city: 'Đà Nẵng', min_price: 3000000, per_page: 50 });
  assert.ok(filtered.data.every((room) => room.city === 'Đà Nẵng' && room.price >= 3000000));
  await login('user');
  await assert.rejects(roomService.createRoom({}), (error) => error.response.status === 403);
  await login('saler');
  await assert.rejects(roomService.updateRoom(6, { title: 'Không được sửa' }), (error) => error.response.status === 403);
  const input = { title: 'Tin kiểm thử', description: 'Nội dung', address: 'Địa chỉ mẫu', city: 'Đà Nẵng', district: 'Hải Châu', price: 0, area: 0, capacity: 1 };
  const room = await roomService.createRoom(input);
  assert.equal(room.owner_id, 2);
  assert.equal((await roomService.updateRoom(room.id, { title: 'Đã chỉnh sửa' })).title, 'Đã chỉnh sửa');
  await roomService.deleteRoom(room.id);
  await assert.rejects(roomService.getRoom(room.id), (error) => error.response.status === 404);
});

test('booking ownership, date validation and current status behavior', async () => {
  await login('user');
  await assert.rejects(bookingService.createBooking({ room_id: 1, start_date: '2020-01-01' }));
  await assert.rejects(bookingService.createBooking({ room_id: 15, start_date: future() }));
  const booking = await bookingService.createBooking({ room_id: 2, start_date: future(), rental_months: 3, notes: 'Mẫu' });
  assert.equal(booking.status, 'pending');
  assert.equal(booking.total_price, 2200000);
  assert.ok(booking.end_date > booking.start_date);
  await assert.rejects(bookingService.updateBooking(booking.id, 'approved'), (error) => error.response.status === 403);
  await login('saler');
  await bookingService.updateBooking(booking.id, 'approved');
  assert.equal((await roomService.getRoom(2)).status, 'rented');
  await bookingService.updateBooking(booking.id, 'completed');
  assert.equal((await roomService.getRoom(2)).status, 'rented');
  await login('user');
  const own = await bookingService.getBookings({ per_page: 50 });
  assert.ok(own.data.every((row) => row.user_id === 3));
  await bookingService.deleteBooking(booking.id);
  await assert.rejects(bookingService.getBooking(booking.id));
});

test('owner registration is unique while pending; admin review updates role', async () => {
  await login('user');
  const created = await ownerService.create({ id_number: 'DEMO000003', message: 'Đăng ký thử' });
  await assert.rejects(ownerService.create({ id_number: 'DEMO000003' }), /chờ duyệt/);
  await assert.rejects(ownerService.getAll(), (error) => error.response.status === 403);
  await login('admin');
  await ownerService.review(created.request.id, { status: 'approved', admin_note: 'Đã duyệt mẫu' });
  await assert.rejects(ownerService.review(created.request.id, { status: 'rejected' }), /xử lý/);
  assert.equal((await userService.getUser(3)).role, 'saler');
  await authService.login('user@bigsix.test', '12345678');
  assert.equal(authService.getCurrentUser().role, 'saler');
  assert.equal((await ownerService.getMyLatest()).status, 'approved');
});

test('profile changes and cascading deletion affect only local sample data', async () => {
  localStorage.setItem('unrelated-project-data', 'keep');
  await login('user');
  await userService.updateUser(3, { name: 'Tên mới', password: 'abcdefgh', password_confirmation: 'abcdefgh' });
  assert.equal(authService.getCurrentUser().name, 'Tên mới');
  await login('admin');
  await userService.deleteUser(2);
  assert.equal((await roomService.getRooms({ per_page: 50 })).data.some((room) => room.owner_id === 2), false);
  demoService.reset();
  assert.equal(localStorage.getItem('unrelated-project-data'), 'keep');
  assert.equal((await roomService.getRooms({ per_page: 50 })).total, 14);
});

test('end date uses calendar months without overflow at the end of a month', async () => {
  await login('user');
  const year = new Date().getFullYear() + 1;
  const booking = await bookingService.createBooking({ room_id: 1, start_date: `${year}-01-31`, rental_months: 1 });
  const daysInFebruary = new Date(Date.UTC(year, 2, 0)).getUTCDate();
  assert.equal(booking.end_date, `${year}-02-${daysInFebruary - 1}`);
});
