<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('owner_registration_requests', function (Blueprint $table) {
            $table->timestamp('approved_notice_seen_at')->nullable()->after('rejected_notice_seen_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('owner_registration_requests', function (Blueprint $table) {
            $table->dropColumn('approved_notice_seen_at');
        });
    }
};