<?php

namespace App\Http\Controllers;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;


 class FarmerPathsController extends Controller
{
    public function index(Request $request)
    {   $user = Auth::user();
        $paths= getPaths($user->id);
        return Inertia::render('Farmers/Paths',compact('paths'));
    }


}
