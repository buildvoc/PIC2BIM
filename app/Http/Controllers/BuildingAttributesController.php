<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class BuildingAttributesController extends Controller
{
    public function index()
    {
        return Inertia::render('BuildingAttributes/Index');
    }
}
