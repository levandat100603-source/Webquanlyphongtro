export const PREFIX = 'bigsix-uiux:';
export const DEMO_PASSWORD = '12345678';
export const DEMO_OTP = '123456';

export function createSeed() {
  const now = new Date();
  const stamp = (days) => new Date(now.getTime() - days * 86400000).toISOString();
  const date = (days) => new Date(now.getTime() + days * 86400000).toISOString().slice(0, 10);
  const users = [
    { id: 1, name: 'Quản trị viên', email: 'admin@bigsix.test', role: 'admin', phone: '0900000001', address: 'Đà Nẵng' },
    { id: 2, name: 'Chủ trọ Minh Anh', email: 'saler@bigsix.test', role: 'saler', phone: '0900000002', address: 'Hải Châu, Đà Nẵng' },
    { id: 3, name: 'Nguyễn An', email: 'user@bigsix.test', role: 'user', phone: '0900000003', address: 'Đà Nẵng' },
    { id: 4, name: 'Chủ trọ Hoàng Nam', email: 'owner2@bigsix.test', role: 'saler', phone: '0900000004', address: 'Cầu Giấy, Hà Nội' },
    { id: 5, name: 'Trần Bình', email: 'binh@bigsix.test', role: 'user', phone: '0900000005', address: 'Hà Nội' },
  ].map((user) => ({ ...user, password: DEMO_PASSWORD, created_at: stamp(30), updated_at: stamp(2) }));
  const samples = [
    ['Studio đầy đủ nội thất, cửa sổ lớn', 'Đà Nẵng', 'Hải Châu', '25 Nguyễn Văn Linh', 3500000, 28, 2, 16.0605, 108.2156, 2],
    ['Phòng có gác gần Đại học Bách khoa', 'Đà Nẵng', 'Liên Chiểu', '80 Nguyễn Lương Bằng', 2200000, 22, 2, 16.0742, 108.1534, 2],
    ['Căn hộ mini ban công thoáng mát', 'Đà Nẵng', 'Sơn Trà', '18 Ngô Quyền', 4200000, 35, 3, 16.0844, 108.2323, 2],
    ['Phòng trọ yên tĩnh cho sinh viên', 'Đà Nẵng', 'Thanh Khê', '42 Điện Biên Phủ', 1800000, 18, 1, 16.0657, 108.1812, 2],
    ['Studio ánh sáng tự nhiên gần biển', 'Đà Nẵng', 'Ngũ Hành Sơn', '16 Châu Thị Vĩnh Tế', 4800000, 38, 2, 16.0451, 108.2409, 2],
    ['Phòng đẹp gần công viên Cầu Giấy', 'Hà Nội', 'Cầu Giấy', '20 Duy Tân', 3200000, 25, 2, 21.0327, 105.7873, 4],
    ['Căn hộ mini khu vực Thanh Xuân', 'Hà Nội', 'Thanh Xuân', '15 Nguyễn Trãi', 3800000, 30, 2, 20.9941, 105.8101, 4],
    ['Phòng có gác, giờ giấc tự do', 'Hồ Chí Minh', 'Bình Thạnh', '60 Điện Biên Phủ', 2900000, 24, 2, 10.8014, 106.7104, 4],
    ['Studio hiện đại tại Thủ Đức', 'Hồ Chí Minh', 'Thủ Đức', '32 Võ Văn Ngân', 4500000, 32, 3, 10.8506, 106.7718, 4],
    ['Phòng ban công gần trung tâm', 'Đà Nẵng', 'Hải Châu', '12 Lê Đình Lý', 2700000, 23, 2, 16.0543, 108.2093, 2],
    ['Phòng gọn gàng, có chỗ để xe', 'Đà Nẵng', 'Cẩm Lệ', '56 Cách Mạng Tháng Tám', 1900000, 20, 2, 16.0199, 108.2034, 2],
    ['Phòng sinh viên gần trường', 'Hà Nội', 'Đống Đa', '36 Chùa Láng', 2500000, 20, 2, 21.0235, 105.8026, 4],
    ['Căn hộ nhỏ gần cầu Rồng', 'Đà Nẵng', 'Sơn Trà', '28 Trần Hưng Đạo', 3900000, 31, 2, 16.0635, 108.2297, 2],
    ['Phòng mới có máy lạnh', 'Hồ Chí Minh', 'Gò Vấp', '14 Phan Văn Trị', 2600000, 21, 2, 10.8322, 106.6862, 4],
    ['Phòng mẫu đã có người thuê', 'Đà Nẵng', 'Hải Châu', '9 Hoàng Diệu', 2300000, 22, 2, 16.055, 108.217, 2],
    ['Phòng mẫu đang bảo trì', 'Hà Nội', 'Cầu Giấy', '8 Trần Thái Tông', 3100000, 26, 2, 21.033, 105.789, 4],
  ];
  const rooms = samples.map((r, i) => ({
    id: i + 1, title: r[0], city: r[1], district: r[2], address: r[3], price: r[4], area: r[5], capacity: r[6], latitude: r[7], longitude: r[8], owner_id: r[9],
    description: `Không gian sạch sẽ, thoáng sáng tại ${r[2]}, ${r[1]}. Phòng có khu bếp nhỏ, nhà vệ sinh riêng và khu vực để xe. Thuận tiện di chuyển đến trường học, chợ và cửa hàng tiện lợi.\nLiên hệ chủ trọ để trao đổi thời gian xem phòng. Đây là thông tin minh họa cho bản mô phỏng giao diện.`,
    utilities: i % 3 === 0 ? ['Wifi', 'Máy lạnh', 'Nóng lạnh', 'Chỗ để xe', 'Ban công'] : ['Wifi', 'WC riêng', 'Chỗ để xe', 'Giờ giấc tự do'],
    images: [`/assets/room-${i % 6 + 1}.svg`, `/assets/room-${(i + 2) % 6 + 1}.svg`],
    status: i === 14 ? 'rented' : i === 15 ? 'maintenance' : 'available',
    created_at: stamp(16 - i), updated_at: stamp(1),
  }));
  const bookings = [
    { id: 1, room_id: 1, user_id: 3, start_date: date(7), end_date: date(97), total_price: 3500000, status: 'pending', notes: 'Họ tên: Nguyễn An\nSố điện thoại: 0900000003\nNgày dự kiến vào ở: ' + date(7) + '\nGhi chú: Muốn xem phòng vào cuối tuần.', created_at: stamp(1) },
    { id: 2, room_id: 3, user_id: 5, start_date: date(10), end_date: date(100), total_price: 4200000, status: 'pending', notes: 'Họ tên: Trần Bình\nSố người: 2\nGhi chú: Cần chỗ để một xe máy.', created_at: stamp(2) },
    { id: 3, room_id: 15, user_id: 3, start_date: date(-10), end_date: date(80), total_price: 2300000, status: 'approved', notes: 'Đơn mẫu đã được chấp nhận.', created_at: stamp(12) },
    { id: 4, room_id: 6, user_id: 3, start_date: date(12), end_date: date(102), total_price: 3200000, status: 'rejected', notes: 'Đơn mẫu đã từ chối.', created_at: stamp(4) },
  ].map((item) => ({ ...item, updated_at: item.created_at }));
  const ownerRequests = [{ id: 1, user_id: 5, request_type: 'landlord', business_name: 'Nhà trọ Bình An', id_number: 'DEMO000005', experience_years: 1, current_properties: 2, message: 'Tôi muốn đăng các phòng trống để giới thiệu tới người thuê.', status: 'pending', admin_note: null, reviewed_by: null, reviewed_at: null, approved_notice_seen_at: null, rejected_notice_seen_at: null, created_at: stamp(1), updated_at: stamp(1) }];
  return { version: 1, users, rooms, bookings, ownerRequests, pending: [] };
}
