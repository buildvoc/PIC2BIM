<?php

namespace App\Http\Controllers;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\File;

 class BuildingHeightController extends Controller
{
    public function index(Request $request)
    {  
        $user = Auth::user();
        $photos =  getPhotosWithoutTask($user->id);
        return Inertia::render('BuildingHeight/Index',compact('photos'));
    }

    public function lazFiles(){
        $path = public_path('laz');

        if (!File::exists($path)) {
            return response()->json(['error' => 'Directory not found'], 404);
        }

        $files = File::files($path);

        $fileList = array_map(function ($file) {
            return [
                'name'  => $file->getFilename(),
            ];
        }, $files);

        return response()->json($fileList, 200, ['Content-Type' => 'application/json']);
    }

}