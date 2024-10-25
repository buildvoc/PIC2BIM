<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AgencyController;
use App\Http\Controllers\ApiController;
use App\Http\Controllers\OfficerController;
use App\Http\Controllers\TasksController;
use App\Http\Controllers\TaskTypeController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UserTasksController;
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
    Route::get('/invite/{id}/officer', [OfficerController::class , 'invite'])->name('officers.invite');
    Route::post('/invite/officer', [OfficerController::class , 'sendInvite'])->name('officer.invite');
})->middleware(['auth', 'verified']);


Route::resource('/tasks/types', TaskTypeController::class)->middleware(['auth', 'verified']);
Route::resource('/users', UserController::class)->middleware(['auth', 'verified']);
Route::resource('/tasks', TasksController::class)->middleware(['auth', 'verified']);
Route::post('/tasks/bulk-accept',[TasksController::class,'acceptTaskPhotos'])->name('tasks.bulkAccept');
Route::post('/tasks/decline',[TasksController::class,'declineTaskPhotos'])->name('tasks.decline');
Route::post('/tasks/return',[TasksController::class,'returnTaskPhotos'])->name('tasks.return');
Route::post('/tasks/move-from-open/{id?}',[TasksController::class,'moveFromOpen'])->name('task.moveOpen');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::prefix('/user-tasks')->name('user-tasks.')->group(function () {
    Route::get('/', [UserTasksController::class, 'index'])->name('index');
})->middleware(['auth', 'verified']);

Route::post('/comm_login', [UserController::class, 'createToken']);

Route::middleware('auth:sanctum')->group(function(){
    Route::post('/comm_get_paths', [ApiController::class, 'comm_get_paths']);
    Route::post('/comm_unassigned', [ApiController::class, 'comm_unassigned']);
    Route::post('/comm_tasks', [ApiController::class, 'comm_tasks']);
    Route::post('/comm_status', [ApiController::class, 'comm_status']);
    Route::post('/comm_path', [ApiController::class, 'comm_path']);
    Route::post('/comm_shapes', [ApiController::class, 'comm_shapes']);
    Route::post('/comm_photo', [ApiController::class, 'comm_photo']);
    Route::post('/comm_get_photo', [ApiController::class, 'comm_get_photo']);
    Route::post('/comm_update', [ApiController::class, 'comm_update']);
    Route::post('/comm_task_photos', [ApiController::class, 'comm_task_photos']);
    Route::post('/comm_delete_path', [ApiController::class, 'comm_delete_path']);
    Route::post('/comm_delete_unassigned_photo', [ApiController::class, 'comm_delete_unassigned_photo']);
});


require __DIR__.'/auth.php';
