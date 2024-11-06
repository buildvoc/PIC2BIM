<?php

namespace App\Http\Controllers;
use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Task;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

 class FarmerTaskController extends Controller
{
    public function index(Request $request)
    {   
        $user = Auth::user();
        $user_id = $user->id;
        // compact('task')
        return Inertia::render('Farmers/Task');
    }


}
