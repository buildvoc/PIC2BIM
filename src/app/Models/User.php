<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasFactory, Notifiable, HasApiTokens;

    public $timestamps = false;

    public const FARMER_ROLE = 1;
    public const OFFICER_ROLE = 2;
    public const SUPERADMIN_ROLE = 3;

    protected $table = 'user';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $guarded = [];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            //'password' => 'hashed',
        ];
    }

    public function roles(){
        return $this->hasMany(UserRole::class,'user_id');
    }

    public function userRoles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'user_role', 'user_id', 'role_id');
    }

    public function rolesArray(){
        return $this->userRoles()->pluck('role')->toArray();
    }

    public static function getFarmerCounts(int $farmers_id = 0, string $count_type)
    {
        $count_sql = null;

        if ($farmers_id !== 0) {
            switch ($count_type) {
                case 'tasks':
                    $count_sql = DB::table('task')
                        ->where('user_id', $farmers_id)
                        ->where('flg_deleted', 0)
                        ->count();
                    break;
                    
                case 'tasks_provided':
                    $count_sql = DB::table('task')
                        ->where('user_id', $farmers_id)
                        ->where('flg_deleted', 0)
                        ->where('status', 'data provided')
                        ->count();
                    break;

                case 'photos':
                    $count_sql = DB::table('photo')
                        ->where('user_id', $farmers_id)
                        ->where('flg_deleted', 0)
                        ->count();
                    break;

                case 'unassigned_photos':
                    $count_sql = DB::table('photo')
                        ->where('user_id', $farmers_id)
                        ->whereNull('task_id')
                        ->where('flg_deleted', 0)
                        ->count();
                    break;

                case 'filtered_tasks':
                    // if (isset($_SESSION['task_list_filter']['filter'])) {
                    //     $filter = index_model::setListFilter($_SESSION['task_list_filter']['filter']);
                    // } else {
                    //     $filter = index_model::setDefaultListFilter();
                    // }

                    // $query = DB::table('task as t')
                    //     ->leftJoin('task_flag as tf', 't.id', '=', 'tf.task_id')
                    //     ->where('t.user_id', $farmers_id)
                    //     ->where('t.flg_deleted', 0);

                    // if (!empty($filter)) {
                    //     $query->whereRaw($filter);
                    // }

                    // $count_sql = $query->count();
                    $count_sql = 0;
                    break;

                default:
                    $count_sql = 0; // return 0 if no valid count_type is provided
            }
        }

        return $count_sql;
    }
}
