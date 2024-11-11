<?php

namespace App\Http\Controllers;
use Inertia\Inertia;
use Illuminate\Http\Request;

 class PhotoDetailController extends Controller
{
    public function index(Request $request,String $id)
    {   
        $photo = getPhoto($id);
        return Inertia::render('Farmers/PhotoDetail',compact('photo'));
    }


}
