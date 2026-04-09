<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OwnerRegistrationRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OwnerRegistrationRequestController extends Controller
{
    public function store(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'user') {
            return response()->json([
                'message' => 'Chỉ tài khoản người thuê mới có thể gửi yêu cầu nâng quyền.',
            ], 403);
        }

        $existingPending = OwnerRegistrationRequest::where('user_id', $user->id)
            ->where('status', 'pending')
            ->exists();

        if ($existingPending) {
            return response()->json([
                'message' => 'Bạn đã có yêu cầu đang chờ duyệt.',
            ], 422);
        }

        $validated = $request->validate([
            'request_type' => 'nullable|in:landlord,broker',
            'business_name' => 'nullable|string|max:255',
            'id_number' => 'required|string|max:50',
            'experience_years' => 'nullable|integer|min:0|max:60',
            'current_properties' => 'nullable|integer|min:0|max:10000',
            'message' => 'nullable|string|max:1000',
        ]);

        $ownerRequest = OwnerRegistrationRequest::create([
            'user_id' => $user->id,
            'request_type' => $validated['request_type'] ?? 'landlord',
            'business_name' => $validated['business_name'] ?? null,
            'id_number' => $validated['id_number'],
            'experience_years' => $validated['experience_years'] ?? null,
            'current_properties' => $validated['current_properties'] ?? null,
            'message' => $validated['message'] ?? null,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Đã gửi yêu cầu đăng ký chủ trọ/môi giới. Quản trị viên sẽ xét duyệt sớm.',
            'request' => $ownerRequest,
        ], 201);
    }

    public function myLatest(Request $request)
    {
        $ownerRequest = OwnerRegistrationRequest::where('user_id', $request->user()->id)
            ->latest()
            ->first();

        return response()->json($ownerRequest);
    }

    public function index(Request $request)
    {
        $query = OwnerRegistrationRequest::with(['user:id,name,email,phone', 'reviewer:id,name'])
            ->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $perPage = (int) $request->input('per_page', 20);
        if ($perPage < 1) {
            $perPage = 20;
        }
        if ($perPage > 50) {
            $perPage = 50;
        }

        $requests = $query->paginate($perPage);

        return response()->json($requests);
    }

    public function review(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:approved,rejected',
            'admin_note' => 'nullable|string|max:1000',
        ]);

        $ownerRequest = OwnerRegistrationRequest::with('user')->findOrFail($id);

        if ($ownerRequest->status !== 'pending') {
            return response()->json([
                'message' => 'Yêu cầu này đã được xử lý trước đó.',
            ], 422);
        }

        DB::transaction(function () use ($ownerRequest, $validated, $request) {
            $ownerRequest->update([
                'status' => $validated['status'],
                'admin_note' => $validated['admin_note'] ?? null,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'rejected_notice_seen_at' => null,
                'approved_notice_seen_at' => null,
            ]);

            if ($validated['status'] === 'approved') {
                $ownerRequest->user->update([
                    'role' => 'saler',
                ]);
            }
        });

        return response()->json([
            'message' => $validated['status'] === 'approved'
                ? 'Đã duyệt yêu cầu và nâng quyền thành chủ trọ/môi giới.'
                : 'Đã từ chối yêu cầu.',
        ]);
    }

    public function markRejectedNoticeSeen(Request $request, $id)
    {
        $ownerRequest = OwnerRegistrationRequest::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        if ($ownerRequest->status !== 'rejected') {
            return response()->json([
                'message' => 'Yêu cầu này không ở trạng thái bị từ chối.',
            ], 422);
        }

        if (!$ownerRequest->rejected_notice_seen_at) {
            $ownerRequest->update([
                'rejected_notice_seen_at' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Đã đánh dấu đã xem thông báo từ chối.',
        ]);
    }

    public function markApprovedNoticeSeen(Request $request, $id)
    {
        $ownerRequest = OwnerRegistrationRequest::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        if ($ownerRequest->status !== 'approved') {
            return response()->json([
                'message' => 'Yêu cầu này không ở trạng thái đã duyệt.',
            ], 422);
        }

        if (!$ownerRequest->approved_notice_seen_at) {
            $ownerRequest->update([
                'approved_notice_seen_at' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Đã đánh dấu đã xem thông báo được duyệt.',
        ]);
    }
}