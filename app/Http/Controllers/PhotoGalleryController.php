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
        $photos =  getPhotosWithoutTask($user->id);
        return Inertia::render('Farmers/PhotoGallery', compact('photos'));
    }

    public function destroy(Request $request, String $id): RedirectResponse
    {
       deleteUnassignedPhoto($id);
        return redirect()->route('photo_gallery');
    }
}
