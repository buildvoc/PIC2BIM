<?php

namespace App\Models;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;

class UserAdmin extends Authenticatable {
use SoftDeletes;
    // protected $dates = ['deleted_at'];
    // protected $table = "user";
    // protected $table = "user_admins";
    // protected $guard_name = 'admin';

    public function roles()
    {
        return $this->belongsTo(Roles::class, 'role');
    }
}
