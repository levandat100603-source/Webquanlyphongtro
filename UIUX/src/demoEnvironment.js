// Substitute only the original UI's external location lookups with local samples.
// Map tiles, room images and the QR illustration are local assets as well.
const normalize = (value) => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
const locations = [
  { city: 'Đà Nẵng', state: 'Đà Nẵng', district: 'Hải Châu', lat: 16.0605, lon: 108.2156 },
  { city: 'Đà Nẵng', state: 'Đà Nẵng', district: 'Liên Chiểu', lat: 16.0742, lon: 108.1534 },
  { city: 'Đà Nẵng', state: 'Đà Nẵng', district: 'Sơn Trà', lat: 16.0844, lon: 108.2323 },
  { city: 'Đà Nẵng', state: 'Đà Nẵng', district: 'Thanh Khê', lat: 16.0657, lon: 108.1812 },
  { city: 'Đà Nẵng', state: 'Đà Nẵng', district: 'Ngũ Hành Sơn', lat: 16.0451, lon: 108.2409 },
  { city: 'Đà Nẵng', state: 'Đà Nẵng', district: 'Cẩm Lệ', lat: 16.0199, lon: 108.2034 },
  { city: 'Hà Nội', state: 'Hà Nội', district: 'Cầu Giấy', lat: 21.0327, lon: 105.7873 },
  { city: 'Hà Nội', state: 'Hà Nội', district: 'Thanh Xuân', lat: 20.9941, lon: 105.8101 },
  { city: 'Hà Nội', state: 'Hà Nội', district: 'Đống Đa', lat: 21.0235, lon: 105.8026 },
  { city: 'Hồ Chí Minh', state: 'Hồ Chí Minh', district: 'Bình Thạnh', lat: 10.8014, lon: 106.7104 },
  { city: 'Hồ Chí Minh', state: 'Hồ Chí Minh', district: 'Thủ Đức', lat: 10.8506, lon: 106.7718 },
  { city: 'Hồ Chí Minh', state: 'Hồ Chí Minh', district: 'Gò Vấp', lat: 10.8322, lon: 106.6862 },
];

export function installDemoEnvironment() {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, options) => {
    const url = String(input?.url || input);
    if (url.startsWith('https://provinces.open-api.vn/')) {
      const cities = [...new Set(locations.map((item) => item.city))].map((name) => ({ name, districts: locations.filter((item) => item.city === name).map((item) => ({ name: item.district })) }));
      return new Response(JSON.stringify(cities), { headers: { 'Content-Type': 'application/json' } });
    }
    if (url.startsWith('https://nominatim.openstreetmap.org/')) {
      const query = normalize(new URL(url).searchParams.get('q') || '');
      const result = locations.filter((item) => query.includes(normalize(item.district)) || query.includes(normalize(item.city))).slice(0, 5).map((item) => ({
        lat: String(item.lat), lon: String(item.lon), display_name: `${item.district}, ${item.city}, Việt Nam`, type: 'administrative', class: 'boundary',
        address: { city: item.city, state: item.state, county: item.district, city_district: item.district, suburb: item.district, country: 'Việt Nam', country_code: 'vn' },
        boundingbox: [String(item.lat - 0.012), String(item.lat + 0.012), String(item.lon - 0.012), String(item.lon + 0.012)],
        geojson: { type: 'Polygon', coordinates: [[[item.lon - 0.012, item.lat - 0.012], [item.lon + 0.012, item.lat - 0.012], [item.lon + 0.012, item.lat + 0.012], [item.lon - 0.012, item.lat + 0.012], [item.lon - 0.012, item.lat - 0.012]]] },
      }));
      return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
    }
    return nativeFetch(input, options);
  };
}
