<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use App\Models\UserRole;
use Carbon\Carbon;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('pa')->updateOrInsert([
            'name' => 'admin'
        ],[
            'timestamp' => now(),
            'active' => 1
        ]); 
        $pa_admin = DB::table('pa')->where('name','admin')->first();

        DB::table('pa')->updateOrInsert([
            'name' => 'pic2bim'
        ],[
            'timestamp' => now(),
            'active' => 1
        ]); 
        $pa = DB::table('pa')->where('name','pic2bim')->first();
        
        $roles = ['FARMER','OFFICER','SUPERADMIN'];
        foreach($roles as $role){
            Role::updateOrCreate([
                'role' => $role,
            ],[
                'description' => $role,
                'timestamp' => now()
            ]);
        }

        $admin = User::updateOrCreate([
            'login' => 'admin'
        ],[
            'pa_id' => $pa_admin->id,
            'pswd' => '89e495e7941cf9e40e6980d14a16bf023ccd4c91',
            'name' => 'Admin',
            'email' => 'admin@mock.co.uk',
            'active' => 1,
            'timestamp' => now(),
            'email_verified_at' => now()
        ]);
        $officer = User::updateOrCreate([
            'login' => 'officer'
        ],[
            'pa_id' => $pa->id,
            'pswd' => '89e495e7941cf9e40e6980d14a16bf023ccd4c91',
            'name' => 'Officer',
            'email' => env('TEST_OFFICER_EMAIL'),
            'active' => 1,
            'timestamp' => now(),
            'email_verified_at' => now()
        ]);

        $farmer = User::updateOrCreate([
            'login' => 'farmer'
        ],[
            'pa_id' => 1,
            'pswd' => '89e495e7941cf9e40e6980d14a16bf023ccd4c91',
            'name' => 'Farmer',
            'email' => env('TEST_FARMER_EMAIL'),
            'active' => 1,
            'timestamp' => now(),
            'email_verified_at' => now()
        ]);
        $adminRole = Role::where('role','SUPERADMIN')->first();
        $officerRole = Role::where('role','OFFICER')->first();
        $farmerRole = Role::where('role','FARMER')->first();

        UserRole::updateOrCreate([
            'user_id' => $admin->id
        ],[
            'role_id' => $adminRole->id,
            'timestamp' => now()
        ]);

        UserRole::updateOrCreate([
            'user_id' => $officer->id
        ],[
            'role_id' => $officerRole->id,
            'timestamp' => now()
        ]);

        UserRole::updateOrCreate([
            'user_id' => $farmer->id
        ],[
            'role_id' => $farmerRole->id,
            'timestamp' => now()
        ]);

        
    }
}
