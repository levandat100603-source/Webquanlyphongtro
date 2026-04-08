<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CloudinaryImageService
{
    public function isConfigured(): bool
    {
        return (bool) config('cloudinary.cloud_name')
            && (bool) config('cloudinary.api_key')
            && (bool) config('cloudinary.api_secret');
    }

    public function uploadFile(UploadedFile $file): ?string
    {
        return $this->uploadPath($file->getRealPath(), $file->getClientOriginalName());
    }

    public function uploadPath(string $absolutePath, ?string $originalName = null): ?string
    {
        if (!$this->isConfigured()) {
            return null;
        }

        $cloudName = (string) config('cloudinary.cloud_name');
        $apiKey = (string) config('cloudinary.api_key');
        $apiSecret = (string) config('cloudinary.api_secret');
        $folder = trim((string) config('cloudinary.folder', 'room-rental/rooms'));
        $timestamp = time();

        $signatureBase = "timestamp={$timestamp}";
        if ($folder !== '') {
            $signatureBase = "folder={$folder}&{$signatureBase}";
        }

        $signature = sha1($signatureBase . $apiSecret);

        try {
            $payload = [
                'api_key' => $apiKey,
                'timestamp' => (string) $timestamp,
                'signature' => $signature,
            ];

            if ($folder !== '') {
                $payload['folder'] = $folder;
            }

            $response = Http::withoutVerifying()
                ->timeout(20)
                ->attach('file', fopen($absolutePath, 'r'), $originalName ?: basename($absolutePath))
                ->post("https://api.cloudinary.com/v1_1/{$cloudName}/image/upload", $payload);

            if ($response->failed()) {
                Log::warning('Cloudinary upload failed', [
                    'status' => $response->status(),
                    'body' => $response->json(),
                ]);

                return null;
            }

            return $response->json('secure_url');
        } catch (\Throwable $exception) {
            Log::warning('Cloudinary upload exception', [
                'message' => $exception->getMessage(),
            ]);

            return null;
        }
    }
}
