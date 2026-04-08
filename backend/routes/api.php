<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\InfoController;
use App\Http\Controllers\Api\OwnerRegistrationRequestController;

// Health check
Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/register/verify', [AuthController::class, 'verifyRegistration']);
Route::post('/register/resend-code', [AuthController::class, 'resendRegistrationCode']);
Route::post('/login', [AuthController::class, 'login']);

// Public room listing
Route::get('/rooms', [RoomController::class, 'index']);
Route::get('/rooms/{id}', [RoomController::class, 'show']);
Route::get('/users', [UserController::class, 'index']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // System Info
    Route::get('/database-info', [InfoController::class, 'databaseInfo']);

    // Rooms - Saler and Admin can create
    Route::middleware('role:saler,admin')->group(function () {
        Route::post('/rooms', [RoomController::class, 'store']);
        Route::get('/my-rooms', [RoomController::class, 'myRooms']);
    });
    
    Route::put('/rooms/{id}', [RoomController::class, 'update']);
    Route::delete('/rooms/{id}', [RoomController::class, 'destroy']);

    // Bookings
    Route::get('/bookings', [BookingController::class, 'index']);
    Route::post('/bookings', [BookingController::class, 'store']);
    Route::get('/bookings/{id}', [BookingController::class, 'show']);
    Route::put('/bookings/{id}', [BookingController::class, 'update']);
    Route::delete('/bookings/{id}', [BookingController::class, 'destroy']);

    // Users - Admin only
    Route::middleware('role:admin')->group(function () {
        //Route::get('/users', [UserController::class, 'index']);
        Route::delete('/users/{id}', [UserController::class, 'destroy']);
        Route::get('/owner-registration-requests', [OwnerRegistrationRequestController::class, 'index']);
        Route::put('/owner-registration-requests/{id}/review', [OwnerRegistrationRequestController::class, 'review']);
    });

    Route::post('/owner-registration-requests', [OwnerRegistrationRequestController::class, 'store']);
    Route::get('/owner-registration-requests/my-latest', [OwnerRegistrationRequestController::class, 'myLatest']);
    Route::post('/owner-registration-requests/{id}/seen-rejected-notice', [OwnerRegistrationRequestController::class, 'markRejectedNoticeSeen']);
    Route::post('/owner-registration-requests/{id}/seen-approved-notice', [OwnerRegistrationRequestController::class, 'markApprovedNoticeSeen']);
    
    Route::get('/users/{id}', [UserController::class, 'show']);
    Route::put('/users/{id}', [UserController::class, 'update']);
});
