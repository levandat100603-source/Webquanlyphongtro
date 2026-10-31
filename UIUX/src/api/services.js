// All services run in the browser. There is no HTTP client, server, SQL or database.
import { createSeed, PREFIX, DEMO_PASSWORD, DEMO_OTP } from './seed.js';

const DATA_KEY = PREFIX + 'data:v1';
const clone = (value) => JSON.parse(JSON.stringify(value));
const now = () => new Date().toISOString();
const nextId = (items) => Math.max(0, ...items.map((item) => Number(item.id))) + 1;
const cleanUser = (user) => { if (!user) return null; const { password, ...safe } = user; return clone(safe); };
const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();

function fail(message, status = 422, errors = {}) {
  const error = new Error(message);
  error.response = { status, data: { message, errors } };
  throw error;
}
function read() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DATA_KEY));
    if (parsed?.version === 1 && Array.isArray(parsed.users) && Array.isArray(parsed.rooms)) return parsed;
  } catch { /* initialize only the demo namespace */ }
  const seed = createSeed();
  write(seed);
  return seed;
}
function write(data) {
  try { localStorage.setItem(DATA_KEY, JSON.stringify(data)); }
  catch { fail('Bộ nhớ trình duyệt đã đầy. Hãy giảm số ảnh hoặc đặt lại dữ liệu mẫu.', 507); }
}
function session(data = read()) {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(PREFIX + 'user')); } catch { return null; }
  if (!localStorage.getItem(PREFIX + 'token')) return null;
  return data.users.find((user) => user.id === saved?.id) || null;
}
function requireUser(data) {
  const user = session(data);
  if (!user) fail('Vui lòng đăng nhập để tiếp tục.', 401);
  return user;
}
function requireAdmin(data) {
  const user = requireUser(data);
  if (user.role !== 'admin') fail('Bạn không có quyền thực hiện thao tác này.', 403);
  return user;
}
function activate(user) {
  const safe = cleanUser(user);
  const token = 'uiux-demo-session-' + user.id;
  localStorage.setItem(PREFIX + 'token', token);
  localStorage.setItem(PREFIX + 'user', JSON.stringify(safe));
  return { user: safe, token, token_type: 'Demo' };
}
function paginate(items, params = {}, fallback = 15) {
  const perPage = Math.max(1, Math.min(50, Number(params.per_page) || fallback));
  const page = Math.max(1, Number(params.page) || 1);
  return { data: clone(items.slice((page - 1) * perPage, page * perPage)), total: items.length, current_page: page, per_page: perPage, last_page: Math.max(1, Math.ceil(items.length / perPage)) };
}
const findRoom = (data, id) => { const room = data.rooms.find((item) => item.id === Number(id)); if (!room) fail('Không tìm thấy phòng.', 404); return room; };
const findBooking = (data, id) => { const item = data.bookings.find((row) => row.id === Number(id)); if (!item) fail('Không tìm thấy đơn đặt.', 404); return item; };
const withOwner = (data, room) => ({ ...clone(room), owner: cleanUser(data.users.find((user) => user.id === room.owner_id)) });
const withBooking = (data, item) => ({ ...clone(item), room: data.rooms.find((room) => room.id === item.room_id) ? withOwner(data, findRoom(data, item.room_id)) : null, user: cleanUser(data.users.find((user) => user.id === item.user_id)) });
const withRequest = (data, request) => ({ ...clone(request), user: cleanUser(data.users.find((user) => user.id === request.user_id)), reviewer: cleanUser(data.users.find((user) => user.id === request.reviewed_by)) });

export const authService = {
  async register(input) {
    const data = read();
    const email = String(input.email || '').trim().toLowerCase();
    if (!input.name?.trim() || !/^\S+@\S+\.\S+$/.test(email)) fail('Vui lòng nhập họ tên và email hợp lệ.');
    if (data.users.some((user) => user.email.toLowerCase() === email)) fail('Email này đã được đăng ký.');
    if (String(input.password || '').length < 8 || input.password !== input.password_confirmation) fail('Mật khẩu cần ít nhất 8 ký tự và xác nhận phải trùng khớp.');
    if (input.role && !['user', 'saler'].includes(input.role)) fail('Vai trò không hợp lệ.');
    data.pending = data.pending.filter((item) => item.email !== email);
    data.pending.push({ ...clone(input), email, role: input.role || 'user', expires: Date.now() + 600000 });
    write(data);
    return { email, expires_in_minutes: 10, message: `Mã xác nhận mô phỏng là ${DEMO_OTP}. Không gửi email thật.` };
  },
  async verifyRegistration(input) {
    const data = read();
    const email = String(input.email || '').trim().toLowerCase();
    const pending = data.pending.find((item) => item.email === email);
    if (!pending || pending.expires < Date.now()) fail('Mã xác nhận không tồn tại hoặc đã hết hạn.');
    if (String(input.code) !== DEMO_OTP) fail('Mã xác nhận không đúng. Mã mô phỏng: ' + DEMO_OTP);
    if (data.users.some((user) => user.email === email)) fail('Email này đã được đăng ký.');
    const user = { id: nextId(data.users), name: pending.name.trim(), email, password: pending.password, role: pending.role, phone: pending.phone || '', address: pending.address || '', created_at: now(), updated_at: now() };
    data.users.push(user);
    data.pending = data.pending.filter((item) => item.email !== email);
    write(data);
    return activate(user);
  },
  async resendRegistrationCode(input) {
    const data = read(); const email = String(input.email || '').trim().toLowerCase();
    const pending = data.pending.find((item) => item.email === email);
    if (!pending) fail('Không có đăng ký chờ xác nhận.');
    pending.expires = Date.now() + 600000; write(data);
    return { email, expires_in_minutes: 10, message: 'Mã xác nhận mô phỏng: ' + DEMO_OTP };
  },
  async login(email, password) {
    const user = read().users.find((row) => row.email.toLowerCase() === String(email).trim().toLowerCase() && row.password === password);
    if (!user) fail('Email hoặc mật khẩu chưa đúng.');
    return activate(user);
  },
  async logout() { localStorage.removeItem(PREFIX + 'token'); localStorage.removeItem(PREFIX + 'user'); },
  async getMe() { return cleanUser(requireUser(read())); },
  getCurrentUser() { return cleanUser(session()); },
  isAuthenticated() { return Boolean(session()); },
  isAdmin() { return session()?.role === 'admin'; },
  isSaler() { return session()?.role === 'saler'; },
};

async function imageData(file) {
  if (file.size > 2 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) fail('Ảnh phải là JPG, PNG hoặc WebP, tối đa 2 MB.');
  const raw = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Không đọc được ảnh.')); reader.readAsDataURL(file); });
  const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('Ảnh không hợp lệ.')); img.src = raw; });
  const ratio = Math.min(1, 960 / image.width, 720 / image.height);
  const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.width * ratio)); canvas.height = Math.max(1, Math.round(image.height * ratio));
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.76);
}
async function roomInput(input, previous = null) {
  const form = typeof FormData !== 'undefined' && input instanceof FormData;
  const values = form ? Object.fromEntries(input.entries()) : { ...input };
  const result = { ...(previous || {}), ...values };
  for (const key of ['title', 'description', 'address', 'city', 'district']) {
    if (!String(result[key] || '').trim()) fail('Vui lòng nhập đầy đủ thông tin phòng.');
    result[key] = String(result[key]).trim();
  }
  for (const key of ['price', 'area', 'capacity']) {
    if (result[key] === '' || result[key] == null || !Number.isFinite(Number(result[key])) || Number(result[key]) < (key === 'capacity' ? 1 : 0)) fail('Giá, diện tích hoặc sức chứa không hợp lệ.');
    result[key] = Number(result[key]);
  }
  if (!Number.isInteger(result.capacity)) fail('Sức chứa phải là số nguyên.');
  if (form) {
    result.utilities = input.getAll('utilities[]');
    const existing = input.getAll('images[]');
    const files = input.getAll('image_files[]').filter((file) => file && typeof file !== 'string' && file.size > 0);
    if (existing.length + files.length > 12) fail('Mỗi tin có tối đa 12 ảnh.');
    result.images = [...existing, ...await Promise.all(files.map(imageData))];
    if (!input.has('images[]') && !input.has('image_files[]') && previous) result.images = previous.images;
  } else {
    result.utilities = Array.isArray(result.utilities) ? result.utilities : [];
    result.images = Array.isArray(result.images) ? result.images : [];
  }
  if (result.images.length > 12) fail('Mỗi tin có tối đa 12 ảnh.');
  result.latitude = Number(result.latitude) || 16.0605;
  result.longitude = Number(result.longitude) || 108.2156;
  result.status = result.status || 'available';
  if (!['available', 'rented', 'maintenance'].includes(result.status)) fail('Trạng thái phòng không hợp lệ.');
  for (const key of Object.keys(result)) if (key.includes('[]') || key === '_method') delete result[key];
  return result;
}

export const roomService = {
  async getRooms(params = {}) {
    const data = read();
    let rooms = data.rooms.filter((room) => room.status === (params.status || 'available'));
    if (params.city) rooms = rooms.filter((room) => normalize(room.city).includes(normalize(params.city)));
    if (params.district) rooms = rooms.filter((room) => normalize(room.district).includes(normalize(params.district)));
    if (params.search) rooms = rooms.filter((room) => normalize([room.title, room.address, room.city, room.district].join(' ')).includes(normalize(params.search)));
    if (params.min_price !== '' && params.min_price != null) rooms = rooms.filter((room) => room.price >= Number(params.min_price));
    if (params.max_price !== '' && params.max_price != null) rooms = rooms.filter((room) => room.price <= Number(params.max_price));
    return paginate(rooms.sort((a, b) => b.id - a.id).map((room) => withOwner(data, room)), params, 12);
  },
  async getRoom(id) { const data = read(); return withOwner(data, findRoom(data, id)); },
  async createRoom(input) {
    const data = read(); const user = requireUser(data);
    if (!['saler', 'admin'].includes(user.role)) fail('Chỉ Chủ trọ hoặc Admin được đăng phòng.', 403);
    const room = { ...await roomInput(input), id: nextId(data.rooms), owner_id: user.id, created_at: now(), updated_at: now() };
    data.rooms.push(room); write(data); return withOwner(data, room);
  },
  async updateRoom(id, input) {
    const data = read(); const user = requireUser(data); const room = findRoom(data, id);
    if (room.owner_id !== user.id && user.role !== 'admin') fail('Không có quyền sửa phòng này.', 403);
    const edited = await roomInput(input, room);
    Object.assign(room, edited, { id: room.id, owner_id: room.owner_id, updated_at: now() });
    write(data); return withOwner(data, room);
  },
  async deleteRoom(id) {
    const data = read(); const user = requireUser(data); const room = findRoom(data, id);
    if (room.owner_id !== user.id && user.role !== 'admin') fail('Không có quyền xóa phòng này.', 403);
    data.rooms = data.rooms.filter((item) => item.id !== room.id);
    data.bookings = data.bookings.filter((item) => item.room_id !== room.id);
    write(data); return { message: 'Đã xóa tin phòng.' };
  },
  async getMyRooms(params = {}) { const data = read(); const user = requireUser(data); if (!['admin', 'saler'].includes(user.role)) fail('Không có quyền quản lý tin.', 403); return paginate(data.rooms.filter((room) => room.owner_id === user.id).sort((a, b) => b.id - a.id).map((room) => withOwner(data, room)), params, 12); },
};

function dateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return null;
  const parsed = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? parsed : null;
}
function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function endAfterMonths(start, months) {
  const source = dateOnly(start); const day = source.getUTCDate();
  const target = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, last)); target.setUTCDate(target.getUTCDate() - 1);
  return target.toISOString().slice(0, 10);
}
export const bookingService = {
  async getBookings(params = {}) {
    const data = read(); const user = requireUser(data);
    const items = data.bookings.filter((item) => user.role === 'admin' || (user.role === 'saler' ? data.rooms.some((room) => room.id === item.room_id && room.owner_id === user.id) : item.user_id === user.id));
    return paginate(items.sort((a, b) => b.id - a.id).map((item) => withBooking(data, item)), params);
  },
  async getBooking(id) {
    const data = read(); const user = requireUser(data); const item = findBooking(data, id);
    if (user.role !== 'admin' && item.user_id !== user.id && findRoom(data, item.room_id).owner_id !== user.id) fail('Không có quyền xem đơn.', 403);
    return withBooking(data, item);
  },
  async createBooking(input) {
    const data = read(); const user = requireUser(data); const room = findRoom(data, input.room_id);
    if (room.status !== 'available') fail('Phòng hiện không còn trống.', 400);
    if (!dateOnly(input.start_date) || input.start_date < today()) fail('Ngày dự kiến phải từ hôm nay trở đi.');
    const months = input.rental_months == null ? null : Number(input.rental_months);
    if (months != null && (!Number.isInteger(months) || months < 1 || months > 120)) fail('Thời hạn thuê từ 1 đến 120 tháng.');
    if (input.end_date && (!dateOnly(input.end_date) || input.end_date <= input.start_date)) fail('Ngày kết thúc phải sau ngày bắt đầu.');
    const item = { id: nextId(data.bookings), user_id: user.id, room_id: room.id, start_date: input.start_date, end_date: months ? endAfterMonths(input.start_date, months) : input.end_date || null, notes: input.notes || '', total_price: room.price, status: 'pending', created_at: now(), updated_at: now() };
    data.bookings.push(item); write(data); return withBooking(data, item);
  },
  async updateBooking(id, status) {
    const data = read(); const user = requireUser(data); const item = findBooking(data, id); const room = findRoom(data, item.room_id);
    if (user.role !== 'admin' && room.owner_id !== user.id) fail('Không có quyền xử lý đơn này.', 403);
    if (!['pending', 'approved', 'rejected', 'cancelled', 'completed'].includes(status)) fail('Trạng thái đơn không hợp lệ.');
    item.status = status; item.updated_at = now();
    // Mirror the current app: completed does not automatically release the room.
    if (status === 'approved') room.status = 'rented';
    if (['rejected', 'cancelled'].includes(status)) room.status = 'available';
    write(data); return withBooking(data, item);
  },
  async deleteBooking(id) {
    const data = read(); const user = requireUser(data); const item = findBooking(data, id);
    if (item.user_id !== user.id && user.role !== 'admin') fail('Không có quyền hủy đơn này.', 403);
    if (item.status === 'approved') findRoom(data, item.room_id).status = 'available';
    data.bookings = data.bookings.filter((row) => row.id !== item.id); write(data);
    return { message: 'Đã hủy và xóa đơn đặt.' };
  },
};

export const userService = {
  async getUsers() { const data = read(); requireAdmin(data); return paginate(data.users.map(cleanUser), { per_page: 50 }); },
  async getUser(id) { const data = read(); requireUser(data); const user = data.users.find((row) => row.id === Number(id)); if (!user) fail('Không tìm thấy tài khoản.', 404); return cleanUser(user); },
  async updateUser(id, input) {
    const data = read(); const actor = requireUser(data); const user = data.users.find((row) => row.id === Number(id));
    if (!user) fail('Không tìm thấy tài khoản.', 404);
    if (actor.id !== user.id && actor.role !== 'admin') fail('Không có quyền sửa hồ sơ.', 403);
    if (input.email && (!/^\S+@\S+\.\S+$/.test(input.email) || data.users.some((row) => row.id !== user.id && row.email.toLowerCase() === input.email.toLowerCase()))) fail('Email không hợp lệ hoặc đã được sử dụng.');
    if (input.password && (input.password.length < 8 || input.password !== input.password_confirmation)) fail('Mật khẩu mới tối thiểu 8 ký tự và xác nhận phải trùng.');
    if (input.role && actor.role === 'admin' && !['user', 'saler', 'admin'].includes(input.role)) fail('Vai trò không hợp lệ.');
    for (const key of ['name', 'email', 'phone', 'address']) if (Object.hasOwn(input, key)) user[key] = input[key];
    if (input.password) user.password = input.password;
    if (input.role && actor.role === 'admin') user.role = input.role;
    user.updated_at = now(); write(data);
    if (actor.id === user.id) activate(user);
    return cleanUser(user);
  },
  async deleteUser(id) {
    const data = read(); requireAdmin(data); const target = data.users.find((item) => item.id === Number(id));
    if (!target) fail('Không tìm thấy tài khoản.', 404);
    const roomIds = data.rooms.filter((room) => room.owner_id === target.id).map((room) => room.id);
    data.users = data.users.filter((user) => user.id !== target.id);
    data.rooms = data.rooms.filter((room) => room.owner_id !== target.id);
    data.bookings = data.bookings.filter((item) => item.user_id !== target.id && !roomIds.includes(item.room_id));
    data.ownerRequests = data.ownerRequests.filter((item) => item.user_id !== target.id).map((item) => item.reviewed_by === target.id ? { ...item, reviewed_by: null } : item);
    write(data); return { message: 'Đã xóa tài khoản mẫu.' };
  },
};

export const ownerRegistrationRequestService = {
  async create(input) {
    const data = read(); const user = requireUser(data);
    if (user.role !== 'user') fail('Chỉ tài khoản Người thuê được gửi yêu cầu nâng quyền.', 403);
    if (data.ownerRequests.some((item) => item.user_id === user.id && item.status === 'pending')) fail('Bạn đã có yêu cầu đang chờ duyệt.');
    if (!String(input.id_number || '').trim() || String(input.id_number).length > 50) fail('Vui lòng nhập số định danh mẫu, tối đa 50 ký tự.');
    if (input.request_type && !['landlord', 'broker'].includes(input.request_type)) fail('Loại yêu cầu không hợp lệ.');
    for (const [key, max] of [['experience_years', 60], ['current_properties', 10000]]) if (input[key] != null && (!Number.isInteger(Number(input[key])) || Number(input[key]) < 0 || Number(input[key]) > max)) fail('Thông tin kinh nghiệm hoặc số phòng không hợp lệ.');
    const item = { ...clone(input), id: nextId(data.ownerRequests), user_id: user.id, request_type: input.request_type || 'landlord', status: 'pending', reviewed_by: null, reviewed_at: null, admin_note: null, created_at: now(), updated_at: now(), approved_notice_seen_at: null, rejected_notice_seen_at: null };
    data.ownerRequests.push(item); write(data); return { message: 'Đã gửi yêu cầu đăng ký Chủ trọ.', request: withRequest(data, item) };
  },
  async getMyLatest() { const data = read(); const user = requireUser(data); const item = data.ownerRequests.filter((row) => row.user_id === user.id).sort((a, b) => b.id - a.id)[0]; return item ? withRequest(data, item) : null; },
  async getAll(params = {}) { const data = read(); requireAdmin(data); return paginate(data.ownerRequests.filter((item) => !params.status || item.status === params.status).sort((a, b) => b.id - a.id).map((item) => withRequest(data, item)), params, 20); },
  async review(id, input) {
    const data = read(); const actor = requireAdmin(data); const item = data.ownerRequests.find((row) => row.id === Number(id));
    if (!item) fail('Không tìm thấy yêu cầu.', 404);
    if (item.status !== 'pending') fail('Yêu cầu này đã được xử lý.');
    if (!['approved', 'rejected'].includes(input.status)) fail('Kết quả duyệt không hợp lệ.');
    Object.assign(item, { status: input.status, admin_note: input.admin_note || '', reviewed_by: actor.id, reviewed_at: now(), updated_at: now(), approved_notice_seen_at: null, rejected_notice_seen_at: null });
    if (input.status === 'approved') data.users.find((user) => user.id === item.user_id).role = 'saler';
    write(data); return { message: 'Đã lưu kết quả duyệt.', request: withRequest(data, item) };
  },
  async markRejectedNoticeSeen(id) { return markSeen(id, 'rejected_notice_seen_at'); },
  async markApprovedNoticeSeen(id) { return markSeen(id, 'approved_notice_seen_at'); },
};
function markSeen(id, field) {
  const data = read(); const user = requireUser(data); const item = data.ownerRequests.find((row) => row.id === Number(id));
  if (!item || item.user_id !== user.id) fail('Không tìm thấy thông báo.', 404);
  item[field] = now(); write(data); return { message: 'Đã xem thông báo.' };
}
export const infoService = { async getDatabaseInfo() { return { mode: 'browser-demo', message: 'Bản mô phỏng không dùng cơ sở dữ liệu.' }; } };
export const demoService = {
  accounts: [
    { role: 'user', label: 'Người thuê', email: 'user@bigsix.test' },
    { role: 'saler', label: 'Chủ trọ', email: 'saler@bigsix.test' },
    { role: 'admin', label: 'Admin', email: 'admin@bigsix.test' },
  ],
  password: DEMO_PASSWORD,
  otp: DEMO_OTP,
  reset() {
    for (const storage of [localStorage, sessionStorage]) {
      for (let i = storage.length - 1; i >= 0; i--) {
        const key = storage.key(i);
        if (key?.startsWith(PREFIX)) storage.removeItem(key);
      }
    }
    write(createSeed());
  },
  async switchRole(role) {
    if (role === 'guest') return authService.logout();
    const data = read();
    const user = data.users.find((item) => item.role === role);
    if (!user) fail('Không còn tài khoản mẫu cho vai trò này. Hãy đặt lại dữ liệu mẫu.');
    return activate(user);
  },
};
