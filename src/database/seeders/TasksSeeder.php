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
            'name' => 'active-travel-heritage-trail',
            'text' => 'On the circular walking Heritage Trail you can discover more about Farnham’s historic treasures, from the unusual groups of seven steps leading to the castle built for the blind bishop in 1524 from where King Charles I stayed on West Street to William Cobbett’s tomb at St Andrew’s Church.',
            'date_created' => Carbon::now()->format('Y-m-d H:i:s'),
            'task_due_date' => Carbon::now()->addDays(5)->format('Y-m-d H:i:s'),
            'timestamp' => now(),
            'flg_deleted' => 0
        ]);
    }
}
