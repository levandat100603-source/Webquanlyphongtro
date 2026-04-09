<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Room;
use App\Services\CloudinaryImageService;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

class RoomController extends Controller
{
    public function __construct(private readonly CloudinaryImageService $cloudinaryImageService)
    {
    }

    public function index(Request $request)
    {
        $query = Room::query()
            ->select([
                'id',
                'title',
                'description',
                'address',
                'city',
                'district',
                'price',
                'area',
                'capacity',
                'latitude',
                'longitude',
                'utilities',
                'images',
                'status',
            ])
            ;

        if ($request->filled('city')) {
            $query->where('city', $request->city);
        }

        // Filter by district
        if ($request->filled('district')) {
            $query->where('district', $request->district);
        }

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

        $perPage = (int) $request->input('per_page', 12);
        if ($perPage < 1) {
            $perPage = 12;
        }
        if ($perPage > 50) {
            $perPage = 50;
        }

        $rooms = $query->orderByDesc('id')->paginate($perPage);

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
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'utilities' => 'nullable|array',
            'images' => 'nullable|array|max:12',
            'image_files' => 'nullable|array|max:12',
            'image_files.*' => 'image|mimes:jpeg,jpg,png,webp|max:2048',
        ]);

        $images = is_array($request->images) ? $request->images : [];
        $uploadedImages = $this->storeUploadedImages($request);
        if (!empty($uploadedImages)) {
            $images = array_merge($images, $uploadedImages);
        }

        if (count($images) > 12) {
            return response()->json([
                'message' => 'Số lượng ảnh tối đa là 12.',
                'errors' => [
                    'image_files' => ['Số lượng ảnh tối đa là 12.'],
                ],
            ], 422);
        }

        $coordinates = $this->resolveCoordinates($request);

        $room = Room::create([
            'title' => $request->title,
            'description' => $request->description,
            'address' => $request->address,
            'city' => $request->city,
            'district' => $request->district,
            'price' => $request->price,
            'area' => $request->area,
            'capacity' => $request->capacity,
            'latitude' => $coordinates['latitude'],
            'longitude' => $coordinates['longitude'],
            'utilities' => $request->utilities,
            'images' => $images,
            'owner_id' => $request->user()->id,
        ]);

        return response()->json($room, 201);
    }

    public function show($id)
    {
        $room = Room::with('owner:id,name,phone')->findOrFail($id);
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
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'utilities' => 'nullable|array',
            'images' => 'nullable|array|max:12',
            'image_files' => 'nullable|array|max:12',
            'image_files.*' => 'image|mimes:jpeg,jpg,png,webp|max:2048',
            'status' => 'in:available,rented,maintenance',
        ]);

        $payload = $request->all();

        $images = is_array($request->images) ? $request->images : null;
        $uploadedImages = $this->storeUploadedImages($request);

        if ($images !== null || !empty($uploadedImages)) {
            $payload['images'] = array_values(array_filter(array_merge($images ?? [], $uploadedImages)));

            if (count($payload['images']) > 12) {
                return response()->json([
                    'message' => 'Số lượng ảnh tối đa là 12.',
                    'errors' => [
                        'image_files' => ['Số lượng ảnh tối đa là 12.'],
                    ],
                ], 422);
            }
        }

        $addressChanged = $request->filled('address') || $request->filled('city') || $request->filled('district');
        $needsCoordinates = !$room->latitude || !$room->longitude;
        if ($addressChanged || $needsCoordinates) {
            $coordinates = $this->resolveCoordinates($request, $room);
            if ($coordinates['latitude'] !== null && $coordinates['longitude'] !== null) {
                $payload['latitude'] = $coordinates['latitude'];
                $payload['longitude'] = $coordinates['longitude'];
            }
        }

        $room->update($payload);

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
        $perPage = (int) $request->input('per_page', 12);
        if ($perPage < 1) {
            $perPage = 12;
        }
        if ($perPage > 50) {
            $perPage = 50;
        }

        $rooms = Room::query()
            ->select([
                'id',
                'title',
                'address',
                'city',
                'district',
                'price',
                'area',
                'capacity',
                'latitude',
                'longitude',
                'utilities',
                'status',
            ])
            ->where('owner_id', $request->user()->id)
            ->orderByDesc('id')
            ->paginate($perPage);

        return response()->json($rooms);
    }

    private function storeUploadedImages(Request $request): array
    {
        if (!$request->hasFile('image_files')) {
            return [];
        }

        $paths = [];
        foreach ($request->file('image_files') as $file) {
            if (!$file || !$file->isValid()) {
                continue;
            }

            if ($this->cloudinaryImageService->isConfigured()) {
                $uploadedUrl = $this->cloudinaryImageService->uploadPath($file->getRealPath(), $file->getClientOriginalName());
                if ($uploadedUrl) {
                    $paths[] = $uploadedUrl;
                }
                continue;
            }

            $paths[] = $this->storeImageLocally($file);
        }

        return array_values(array_filter($paths));
    }

    private function storeImageLocally(UploadedFile $file): string
    {
        $uploadDir = public_path('uploads/rooms');
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $filename = now()->format('YmdHis') . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();
        $file->move($uploadDir, $filename);

        return '/uploads/rooms/' . $filename;
    }

    private function resolveCoordinates(Request $request, ?Room $room = null): array
    {
        $latitude = $request->input('latitude');
        $longitude = $request->input('longitude');

        if (is_numeric($latitude) && is_numeric($longitude)) {
            return [
                'latitude' => round($this->normalizeLatitude((float) $latitude), 7),
                'longitude' => round($this->normalizeLongitude((float) $longitude), 7),
            ];
        }

        $addressParts = array_filter([
            trim((string) $request->input('address', $room->address ?? '')),
            trim((string) $request->input('district', $room->district ?? '')),
            trim((string) $request->input('city', $room->city ?? '')),
            'Vietnam',
        ]);

        $queries = [];
        if (!empty($addressParts)) {
            $queries[] = implode(', ', $addressParts);
        }

        if ($room) {
            $queries[] = implode(', ', array_filter([
                trim((string) $room->address),
                trim((string) $room->district),
                trim((string) $room->city),
                'Vietnam',
            ]));
        }

        $queries[] = implode(', ', array_filter([
            trim((string) $request->input('address', $room->address ?? '')),
            trim((string) $request->input('city', $room->city ?? '')),
            'Vietnam',
        ]));

        foreach (array_unique(array_filter($queries)) as $query) {
            $result = $this->geocodeQuery($query);
            if ($result) {
                return $result;
            }
        }

        return [
            'latitude' => $room?->latitude,
            'longitude' => $room?->longitude,
        ];
    }

    private function geocodeQuery(string $query): ?array
    {
        $providers = [
            [
                'url' => 'https://nominatim.openstreetmap.org/search',
                'params' => [
                    'format' => 'jsonv2',
                    'limit' => 1,
                    'countrycodes' => 'vn',
                    'q' => $query,
                ],
            ],
            [
                'url' => 'https://photon.komoot.io/api/',
                'params' => [
                    'limit' => 1,
                    'lang' => 'vi',
                    'q' => $query,
                ],
            ],
        ];

        foreach ($providers as $provider) {
            try {
                $response = Http::withHeaders([
                    'Accept' => 'application/json',
                    'User-Agent' => 'BigSix/1.0 (+https://bigsix.com)',
                ])->timeout(8)->get($provider['url'], $provider['params']);

                if (!$response->ok()) {
                    continue;
                }

                $data = $response->json();

                if (str_contains($provider['url'], 'photon.komoot.io')) {
                    $result = is_array($data['features'] ?? null) ? ($data['features'][0] ?? null) : null;
                    $coordinates = $result['geometry']['coordinates'] ?? null;
                    if (is_array($coordinates) && count($coordinates) >= 2) {
                        return [
                            'latitude' => round((float) $coordinates[1], 7),
                            'longitude' => round((float) $coordinates[0], 7),
                        ];
                    }

                    continue;
                }

                $result = is_array($data) ? ($data[0] ?? null) : null;
                if (!$result || !isset($result['lat'], $result['lon'])) {
                    continue;
                }

                return [
                    'latitude' => round((float) $result['lat'], 7),
                    'longitude' => round((float) $result['lon'], 7),
                ];
            } catch (\Throwable $e) {
                continue;
            }
        }

        return null;
    }

    private function normalizeLatitude(float $latitude): float
    {
        return max(8.3, min(23.6, $latitude));
    }

    private function normalizeLongitude(float $longitude): float
    {
        return max(102.0, min(110.5, $longitude));
    }
}
