<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class BuildingAttributesController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $photos =  getPhotosWithoutTask($user->id);
        return Inertia::render('BuildingAttributes/Index',compact('photos'));
    }
    
    public function index_v2()
    {
        $user = Auth::user();
        $photos =  getPhotosWithoutTask($user->id);
        return Inertia::render('BuildingAttributesV2/Index',compact('photos'));
    }
}
