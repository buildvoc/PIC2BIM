<?php

namespace App\Http\Controllers;
use Inertia\Inertia;
use Illuminate\Http\Request;

class TestController extends Controller
{
    public function index(Request $request)
  {
    
      $status = "This is my test react page";
      return Inertia::render('Test/Index', [
          'status' => $status,
      ]);
  }
}
