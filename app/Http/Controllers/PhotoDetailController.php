<?php

namespace App\Http\Controllers;

use App\Models\Photo;
use Inertia\Inertia;
use Illuminate\Http\Request;

 class PhotoDetailController extends Controller
{
    public function index(Request $request,String $id)
    {   
        $photo = getPhoto($id);
        return Inertia::render('Farmers/PhotoDetail',compact('photo'));
    }

    public function rotatePhoto(Request $request){
        $photo = Photo::find($request->id)->update(['rotation_correction' => $request->angle]);
        return 1;
    }
}
