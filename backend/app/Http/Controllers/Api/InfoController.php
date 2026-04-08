<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Config;
use Illuminate\Http\JsonResponse;

class InfoController extends Controller
{
    /**
     * Get database information
     */
    public function databaseInfo(): JsonResponse
    {
        return response()->json([
            'database' => Config::get('database.connections.mysql.database'),
            'host' => Config::get('database.connections.mysql.host'),
            'environment' => Config::get('app.env'),
        ]);
    }
}
