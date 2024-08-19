<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\Auth\AuthController;
use App\Http\Controllers\Admin\Users\UsersController;
use App\Http\Controllers\Admin\Tasks\TasksController;
use App\Http\Controllers\Admin\UserAdmin\UserAdminController;

Route::get('/', [AuthController::class, 'index'])->name('login.page');
Route::get('/login', [AuthController::class, 'index'])->name('login.page');
Route::get('/login', [AuthController::class, 'index'])->name('login');

Route::group(['prefix' => 'admin', 'as' => 'admin.'], function () {
    Route::get('/login', [AuthController::class, 'index'])->name('login.page');
    Route::post('/login', [AuthController::class, 'login'])->name('code.verification');
    
    // AUTHENTICATED ROUTES - STARTS
    Route::group(['middleware' => 'auth'], function () {
        Route::get('/logout', [AuthController::class, 'logout'])->name('logout');
        
        Route::controller(UserAdminController::class)->prefix('user-list-admin')->name('user-list-admin.')->group(function () {
            Route::get('/', 'editViewUserForm')->name('index');
            Route::get('/edit-user/{id}', 'editViewUserForm')->name('edit.user');
            Route::post('/update-admin-user', 'updateAdminUser')->name('update.admin.user');
        });

        Route::controller(UsersController::class)->prefix('users')->name('users.')->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('/create', 'create')->name('create');
            Route::post('/insert', 'createProcess')->name('createProcess');
            Route::get('/edit/{id}', 'edit')->name('edit');
            Route::post('/update', 'update')->name('updateProcess');
            Route::post('/delete', 'delete')->name('delete');
            Route::get('/ajax-region-list', 'listing')->name('listing');
        });

        Route::controller(TasksController::class)->prefix('tasks')->name('tasks.')->group(function () {
            Route::get('/', 'index')->name('index');
            // Route::get('userTasks/{user_id}', 'index')->name('userTasks');
            Route::get('/user-tasks/{id}', 'index')->name('userTasks');
            Route::get('/create', 'create')->name('create');
            Route::post('/insert', 'createProcess')->name('createProcess');
            Route::get('/edit/{id}', 'edit')->name('edit');
            Route::post('/update', 'update')->name('updateProcess');
            Route::post('/delete', 'delete')->name('delete');
            Route::get('/ajax-region-list', 'listing')->name('listing');
        });

    });
});
