<?php

namespace Database\Seeders;

use App\Models\Agency;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemonstrationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $pa = Agency::updateOrCreate(
            ['name' => 'Demonstration'],
            ['active' => 1,'timestamp' => now()]
        );
        
        $demoOfficer = User::updateOrCreate(
            ['login' => 'demonstration'],
            [
                'pa_id' => $pa->id,
                'pswd' => '89e495e7941cf9e40e6980d14a16bf023ccd4c91', // demo
                'name' => 'demonstration',
                'surname' => 'officer',
                'email' => 'demonstration@officer.com',
                'active' => 1,
                'email_verified_at' => now(),
                'timestamp' => now()
            ]
        );
        DB::table('user_role')->insert(['user_id'=> $demoOfficer->id,'role_id' => User::OFFICER_ROLE,'timestamp' => now()]);
    }
}
