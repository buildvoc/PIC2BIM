<?php

namespace App\Http\Controllers;
use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Task;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

 class PdfPreviewController extends Controller
{
    public function index(Request $request)
    {   

        return Inertia::render('Farmers/PdfPreview');
    }


}
