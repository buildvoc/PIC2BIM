<?php

namespace Database\Seeders;

use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class TasksSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $farmer = User::where('email',env('TEST_FARMER_EMAIL'))->first(); 
        $officer = User::where('email',env('TEST_OFFICER_EMAIL'))->first(); 
        Task::create([
            'user_id' => $farmer->id,
            'created_id' => $officer->id,
            'type_id' => null,
            'name' => 'Test task 101',
            'date_created' => Carbon::now()->format('Y-m-d H:i:s'),
            'task_due_date' => Carbon::now()->addDays(5)->format('Y-m-d H:i:s'),
            'timestamp' => now(),
            'flg_deleted' => 0
        ]);
    }
}
