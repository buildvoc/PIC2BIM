<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\RedirectResponse;


class PhotoGalleryController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $paginatedPhotos =  getPhotosWithoutTask($user->id, true);
        
        $photos = $paginatedPhotos->items();
        
        if($request->has('showStatic')) return Inertia::render('Farmers/PhotoGalleryStatic', compact('photos'));

        return Inertia::render('Farmers/PhotoGallery', compact('photos','paginatedPhotos'));
    }

    public function destroy(Request $request, String $ids): RedirectResponse
    {
        $idsArray = explode(',', $ids);
        deleteSelectedUnassignedPhoto($idsArray);
        return redirect()->route('photo_gallery');
    }
}
