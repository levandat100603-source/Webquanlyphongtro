<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Room;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class RoomController extends Controller
{
    public function index(Request $request)
    {
        $query = Room::with('owner');

        // Filter by city
        if ($request->filled('city')) {
            $query->where('city', $request->city);
        }

        // Filter by district
        if ($request->filled('district')) {
            $query->where('district', $request->district);
        }

        // Filter by price range
        if ($request->filled('min_price')) {
            $query->where('price', '>=', $request->min_price);
        }
        if ($request->filled('max_price')) {
            $query->where('price', '<=', $request->max_price);
        }

        // Filter by status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        } else {
            $query->where('status', 'available');
        }

        // Search by title
        if ($request->filled('search')) {
            $query->where('title', 'like', '%' . $request->search . '%');
        }

        $rooms = $query->latest()->paginate(12);

        return response()->json($rooms);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'address' => 'required|string',
            'city' => 'required|string',
            'district' => 'required|string',
            'price' => 'required|numeric|min:0',
            'area' => 'required|numeric|min:0',
            'capacity' => 'required|integer|min:1',
            'utilities' => 'nullable|array',
            'images' => 'nullable|array',
        ]);

        $room = Room::create([
            'title' => $request->title,
            'description' => $request->description,
            'address' => $request->address,
            'city' => $request->city,
            'district' => $request->district,
            'price' => $request->price,
            'area' => $request->area,
            'capacity' => $request->capacity,
            'utilities' => $request->utilities,
            'images' => $request->images,
            'owner_id' => $request->user()->id,
        ]);

        return response()->json($room, 201);
    }

    public function show($id)
    {
        $room = Room::with('owner')->findOrFail($id);
        return response()->json($room);
    }

    public function update(Request $request, $id)
    {
        $room = Room::findOrFail($id);

        // Check if user is owner or admin
        if ($room->owner_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'title' => 'string|max:255',
            'description' => 'string',
            'address' => 'string',
            'city' => 'string',
            'district' => 'string',
            'price' => 'numeric|min:0',
            'area' => 'numeric|min:0',
            'capacity' => 'integer|min:1',
            'utilities' => 'nullable|array',
            'images' => 'nullable|array',
            'status' => 'in:available,rented,maintenance',
        ]);

        $room->update($request->all());

        return response()->json($room);
    }

    public function destroy(Request $request, $id)
    {
        $room = Room::findOrFail($id);

        // Check if user is owner or admin
        if ($room->owner_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $room->delete();

        return response()->json(['message' => 'Room deleted successfully']);
    }

    public function myRooms(Request $request)
    {
        $rooms = Room::where('owner_id', $request->user()->id)
            ->latest()
            ->paginate(12);

        return response()->json($rooms);
    }
}
