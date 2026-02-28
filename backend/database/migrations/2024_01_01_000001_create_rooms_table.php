<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description');
            $table->string('address');
            $table->string('city');
            $table->string('district');
            $table->decimal('price', 10, 2);
            $table->decimal('area', 8, 2);
            $table->integer('capacity')->default(1);
            $table->json('utilities')->nullable();
            $table->json('images')->nullable();
            $table->enum('status', ['available', 'rented', 'maintenance'])->default('available');
            $table->foreignId('owner_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('rooms');
    }
};
