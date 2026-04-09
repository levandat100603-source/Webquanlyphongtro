<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendVerificationCodeJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $email,
        public string $verificationCode
    ) {
    }

    public function handle(): void
    {
        Mail::raw(
            "Mã xác nhận đăng ký của bạn là: {$this->verificationCode}\n\nMã này có hiệu lực trong 10 phút. Nếu bạn không yêu cầu đăng ký, hãy bỏ qua email này.",
            function ($message) {
                $message->to($this->email)->subject('Mã xác nhận đăng ký');
            }
        );
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('Failed to send registration verification email', [
            'email' => $this->email,
            'message' => $exception->getMessage(),
        ]);
    }
}