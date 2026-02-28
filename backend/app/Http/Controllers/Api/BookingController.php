<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Room;
use Illuminate\Http\Request;

class BookingController extends Controller
{
    public function index(Request $request)
    {
        $query = Booking::with(['room', 'user']);

        // Admin can see all bookings
        if (!$request->user()->isAdmin()) {
            // Saler can see bookings for their rooms
            if ($request->user()->isSaler()) {
                $query->whereHas('room', function ($q) use ($request) {
                    $q->where('owner_id', $request->user()->id);
                });
            } else {
                // Regular user can only see their own bookings
                $query->where('user_id', $request->user()->id);
            }
        }

        $bookings = $query->latest()->paginate(15);

        return response()->json($bookings);
    }

    public function store(Request $request)
    {
        $request->validate([
            'room_id' => 'required|exists:rooms,id',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'nullable|date|after:start_date',
            'notes' => 'nullable|string',
        ]);

        $room = Room::findOrFail($request->room_id);

        // Check if room is available
        if ($room->status !== 'available') {
            return response()->json(['message' => 'Room is not available'], 400);
        }

        // Calculate total price (example: monthly rent)
        $totalPrice = $room->price;

        $booking = Booking::create([
            'room_id' => $request->room_id,
            'user_id' => $request->user()->id,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'total_price' => $totalPrice,
            'notes' => $request->notes,
            'status' => 'pending',
        ]);

        return response()->json($booking->load(['room', 'user']), 201);
    }

    public function show($id)
    {
        $booking = Booking::with(['room', 'user'])->findOrFail($id);

        // Check authorization
        $user = request()->user();
        if (!$user->isAdmin() && 
            $booking->user_id !== $user->id && 
            $booking->room->owner_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($booking);
    }

    public function update(Request $request, $id)
    {
        $booking = Booking::findOrFail($id);

        // Only admin or room owner can update booking status
        if (!$request->user()->isAdmin() && 
            $booking->room->owner_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'status' => 'required|in:pending,approved,rejected,cancelled,completed',
        ]);

        $booking->update(['status' => $request->status]);

        // If approved, update room status
        if ($request->status === 'approved') {
            $booking->room->update(['status' => 'rented']);
        }

        // If rejected or cancelled, make room available again
        if (in_array($request->status, ['rejected', 'cancelled'])) {
            $booking->room->update(['status' => 'available']);
        }

        return response()->json($booking->load(['room', 'user']));
    }

    public function destroy(Request $request, $id)
    {
        $booking = Booking::findOrFail($id);

        // User can cancel their own booking, admin can delete any
        if ($booking->user_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Update room status if booking was approved
        if ($booking->status === 'approved') {
            $booking->room->update(['status' => 'available']);
        }

        $booking->delete();

        return response()->json(['message' => 'Booking deleted successfully']);
    }
}
