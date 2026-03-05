<?php

require __DIR__.'/../vendor/autoload.php';

// 1. Ép Laravel đổi đường dẫn Bootstrap Cache sang /tmp TRƯỚC KHI khởi động
putenv('APP_SERVICES_CACHE=/tmp/storage/bootstrap/cache/services.php');
putenv('APP_PACKAGES_CACHE=/tmp/storage/bootstrap/cache/packages.php');
putenv('APP_CONFIG_CACHE=/tmp/storage/bootstrap/cache/config.php');
putenv('APP_ROUTES_CACHE=/tmp/storage/bootstrap/cache/routes.php');
putenv('APP_EVENTS_CACHE=/tmp/storage/bootstrap/cache/events.php');

$_ENV['APP_SERVICES_CACHE'] = '/tmp/storage/bootstrap/cache/services.php';
$_ENV['APP_PACKAGES_CACHE'] = '/tmp/storage/bootstrap/cache/packages.php';
$_ENV['APP_CONFIG_CACHE']   = '/tmp/storage/bootstrap/cache/config.php';
$_ENV['APP_ROUTES_CACHE']   = '/tmp/storage/bootstrap/cache/routes.php';
$_ENV['APP_EVENTS_CACHE']   = '/tmp/storage/bootstrap/cache/events.php';

// 2. Tạo sẵn tất cả các thư mục cần thiết trong /tmp để không bị báo lỗi "thiếu thư mục"
$directories = [
    '/tmp/storage/logs',
    '/tmp/storage/framework/cache/data',
    '/tmp/storage/framework/views',
    '/tmp/storage/framework/sessions',
    '/tmp/storage/bootstrap/cache', // <-- Thư mục đang gây ra màn hình đỏ của bạn
];

foreach ($directories as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }
}

// 3. Bây giờ mới chính thức gọi Laravel "dậy"
$app = require_once __DIR__.'/../bootstrap/app.php';

// 4. Bẻ lái nốt thư mục Storage chung
$app->useStoragePath('/tmp/storage');

// 5. Chạy ứng dụng
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
)->send();
$kernel->terminate($request, $response);