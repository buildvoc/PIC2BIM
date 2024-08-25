<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AgencyController;
use App\Http\Controllers\OfficerController;
use App\Http\Controllers\TaskTypeController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return to_route('dashboard');
});

Route::get('/dashboard', [DashboardController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::prefix('/agencies')->name('dashboard.agencies.')->group(function () {
    Route::get('/', [AgencyController::class, 'index'])->name('index');
    Route::get('/create', [AgencyController::class, 'create'])->name('create');
    Route::post('/create', [AgencyController::class, 'store'])->name('store');
    Route::get('/{agency}', [AgencyController::class, 'edit'])->name('edit');
    Route::get('/officer/{agency}', [AgencyController::class, 'show'])->name('show');
    Route::patch('/{agency}', [AgencyController::class, 'update'])->name('update');
    Route::delete('/{agency}', [AgencyController::class, 'destroy'])->name('destroy');
    Route::resource('/officers', OfficerController::class);
})->middleware(['auth', 'verified']);

Route::resource('/tasks/types', TaskTypeController::class)->middleware(['auth', 'verified']);

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
