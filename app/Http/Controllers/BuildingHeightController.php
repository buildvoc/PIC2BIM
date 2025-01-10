<?php

namespace App\Http\Controllers;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;


 class BuildingHeightController extends Controller
{
    public function index(Request $request)
    {  
        return Inertia::render('BuildingHeight/Index');
    }


}