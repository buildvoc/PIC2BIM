<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

class PhotoGalleryController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $photos =  getPhotosWithoutTask($user->id);
        
        if($request->has('showStatic')) return Inertia::render('Farmers/PhotoGalleryStatic', compact('photos'));

        return Inertia::render('Farmers/PhotoGallery', compact('photos'));
    }

    public function destroy(Request $request, String $ids): RedirectResponse
    {
        $idsArray = explode(',', $ids);
        deleteSelectedUnassignedPhoto($idsArray);
        return redirect()->route('photo_gallery');
    }
}
