<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PendingRegistration;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Throwable;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'nullable|in:user,saler',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
        ]);

        $email = strtolower(trim($request->email));
        $verificationCode = (string) random_int(100000, 999999);

        if (User::where('email', $email)->exists()) {
            throw ValidationException::withMessages([
                'email' => ['Email này đã được đăng ký.'],
            ]);
        }

        $pendingRegistration = PendingRegistration::updateOrCreate(
            ['email' => $email],
            [
                'name' => $request->name,
                'password' => Hash::make($request->password),
                'role' => $request->role ?? 'user',
                'phone' => $request->phone,
                'address' => $request->address,
                'verification_code' => Hash::make($verificationCode),
                'verification_expires_at' => now()->addMinutes(10),
            ]
        );

        try {
            Mail::raw(
                "Mã xác nhận đăng ký của bạn là: {$verificationCode}\n\nMã này có hiệu lực trong 10 phút. Nếu bạn không yêu cầu đăng ký, hãy bỏ qua email này.",
                function ($message) use ($email) {
                    $message->to($email)->subject('Mã xác nhận đăng ký');
                }
            );
        } catch (Throwable $exception) {
            throw ValidationException::withMessages([
                'email' => ['Không gửi được email xác nhận. Vui lòng kiểm tra cấu hình mail và thử lại.'],
            ]);
        }

        return response()->json([
            'message' => 'Đã gửi mã xác nhận gồm 6 số đến email của bạn.',
            'email' => $pendingRegistration->email,
            'expires_in_minutes' => 10,
        ], 202);
    }

    public function verifyRegistration(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email|max:255',
            'code' => 'required|string|size:6',
        ]);

        $email = strtolower(trim($request->email));
        $pendingRegistration = PendingRegistration::where('email', $email)->first();

        if (!$pendingRegistration) {
            throw ValidationException::withMessages([
                'email' => ['Yêu cầu xác minh không tồn tại hoặc đã hết hạn.'],
            ]);
        }

        if ($pendingRegistration->verification_expires_at && now()->greaterThan($pendingRegistration->verification_expires_at)) {
            $pendingRegistration->delete();

            throw ValidationException::withMessages([
                'code' => ['Mã xác nhận đã hết hạn. Vui lòng đăng ký lại để nhận mã mới.'],
            ]);
        }

        if (!Hash::check($request->code, $pendingRegistration->verification_code)) {
            throw ValidationException::withMessages([
                'code' => ['Mã xác nhận không đúng.'],
            ]);
        }

        if (User::where('email', $email)->exists()) {
            $pendingRegistration->delete();

            throw ValidationException::withMessages([
                'email' => ['Email này đã được đăng ký.'],
            ]);
        }

        $user = User::create([
            'name' => $pendingRegistration->name,
            'email' => $pendingRegistration->email,
            'password' => $pendingRegistration->password,
            'role' => $pendingRegistration->role ?? 'user',
            'phone' => $pendingRegistration->phone,
            'address' => $pendingRegistration->address,
        ]);

        $pendingRegistration->delete();

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
            'token_type' => 'Bearer',
        ], 201);
    }

    public function resendRegistrationCode(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email|max:255',
        ]);

        $email = strtolower(trim($request->email));
        $pendingRegistration = PendingRegistration::where('email', $email)->first();

        if (!$pendingRegistration) {
            throw ValidationException::withMessages([
                'email' => ['Không tìm thấy yêu cầu đăng ký chờ xác minh.'],
            ]);
        }

        $verificationCode = (string) random_int(100000, 999999);

        $pendingRegistration->forceFill([
            'verification_code' => Hash::make($verificationCode),
            'verification_expires_at' => now()->addMinutes(10),
        ])->save();

        try {
            Mail::raw(
                "Mã xác nhận đăng ký của bạn là: {$verificationCode}\n\nMã này có hiệu lực trong 10 phút. Nếu bạn không yêu cầu đăng ký, hãy bỏ qua email này.",
                function ($message) use ($email) {
                    $message->to($email)->subject('Mã xác nhận đăng ký');
                }
            );
        } catch (Throwable $exception) {
            throw ValidationException::withMessages([
                'email' => ['Không gửi lại được email xác nhận. Vui lòng thử lại sau.'],
            ]);
        }

        return response()->json([
            'message' => 'Đã gửi lại mã xác nhận mới.',
            'email' => $pendingRegistration->email,
            'expires_in_minutes' => 10,
        ]);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }
}
