<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AgencyController;
use App\Http\Controllers\ApiController;
use App\Http\Controllers\OfficerController;
use App\Http\Controllers\TasksController;
use App\Http\Controllers\TaskTypeController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\FarmerController;
use App\Http\Controllers\FarmerTaskController;
use App\Http\Controllers\FarmerPathsController;
use App\Http\Controllers\PhotoGalleryController;
use App\Http\Controllers\PhotoDetailController;
use App\Http\Controllers\PdfPreviewController;




Route::get('/api-docs', function () {
    return view('api-docs');
});

Route::get('/', function () {
    return to_route('dashboard');
});
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])
        ->name('dashboard');
    Route::get('/user_task', [FarmerController::class, 'index'])
        ->name('user_task.index');
    Route::get('/task/{task}', [FarmerTaskController::class, 'index'])
        ->name('task');
    Route::get('/photo_gallery', [PhotoGalleryController::class, 'index'])
        ->name('photo_gallery');
    Route::delete('/photo_gallery/{id}', [PhotoGalleryController::class, 'destroy'])
        ->name('photo_gallery.destroy');
    Route::get('/user_paths', [FarmerPathsController::class, 'index'])
        ->name('user_paths');
    Route::get('/photo_detail/{ids}', [PhotoDetailController::class, 'index'])
        ->name('photo_detail');
    Route::get('/pdf_preview', [PdfPreviewController::class, 'index'])
        ->name('pdf_preview');

    Route::prefix('/agencies')->name('dashboard.agencies.')->group(function () {
        Route::get('/', [AgencyController::class, 'index'])->name('index');
        Route::get('/create', [AgencyController::class, 'create'])->name('create');
        Route::post('/create', [AgencyController::class, 'store'])->name('store');
        Route::get('/{agency}', [AgencyController::class, 'edit'])->name('edit');
        Route::get('/officer/{agency}', [AgencyController::class, 'show'])->name('show');
        Route::patch('/{agency}', [AgencyController::class, 'update'])->name('update');
        Route::delete('/{agency}', [AgencyController::class, 'destroy'])->name('destroy');
        Route::resource('/officers', OfficerController::class);
        Route::get('/invite/{id}/officer', [OfficerController::class, 'invite'])->name('officers.invite');
        Route::post('/invite/officer', [OfficerController::class, 'sendInvite'])->name('officer.invite');
    });
    
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    
    Route::resource('/tasks/types', TaskTypeController::class);
    Route::resource('/users', UserController::class);
    Route::get('/unassigned_users', [UserController::class, 'unassignedUsers'])->name('users.unassigned');
    Route::get('/assign_user/{id?}', [UserController::class, 'assign_user'])->name('users.assign');
    Route::resource('/tasks', TasksController::class);
    Route::post('/tasks/bulk-accept', [TasksController::class, 'acceptTaskPhotos'])->name('tasks.bulkAccept');
    Route::post('/tasks/decline', [TasksController::class, 'declineTaskPhotos'])->name('tasks.decline');
    Route::post('/tasks/return', [TasksController::class, 'returnTaskPhotos'])->name('tasks.return');
    Route::post('/tasks/move-from-open/{id?}', [TasksController::class, 'moveFromOpen'])->name('task.moveOpen');

    Route::post('/set-split-mode-in-session',[DashboardController::class,'setSplitModeInSession'])->name('set-split-mode-in-session');
});

Route::post('/comm_login', [UserController::class, 'createToken']);

Route::middleware('auth:sanctum')->group(function () {
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
    Route::get('/comm_get_lpis', [ApiController::class, 'comm_get_lpis']);
    Route::post('/comm_lpis', [ApiController::class, 'comm_save_lpis']);
    Route::post('/comm_get_lpis_record', [ApiController::class, 'comm_get_lpis_by_id']);
});


require __DIR__ . '/auth.php';
