<?php

namespace App\Http\Controllers;
use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\Task;


 class FarmerTaskController extends Controller
{
    public function index(Request $request, Task $task)
    {   $photos = getTaskPhotos($task->id, $task->user_id);
        return Inertia::render('Farmers/Task',compact('task','photos'));
    }

   

}
