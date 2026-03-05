<?php

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';

// 1. Ép Laravel đổi toàn bộ thư mục Storage sang /tmp (Nơi duy nhất Vercel cho phép ghi)
$app->useStoragePath('/tmp/storage');

// 2. Tạo sẵn các thư mục con bên trong /tmp để Laravel không báo lỗi "thiếu thư mục"
$directories = [
    '/tmp/storage/logs',
    '/tmp/storage/framework/cache/data',
    '/tmp/storage/framework/views',
    '/tmp/storage/framework/sessions',
];

foreach ($directories as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }
}

// 3. Khởi chạy Laravel
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
)->send();
$kernel->terminate($request, $response);