<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Models\Agency;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class AgencyController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('Agencies/Index', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('Agencies/Create', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
        ]);
    }

    public function store(Request $request){
        $request->validate([
            'name' => 'required'
        ]);
        Agency::create([
            'name' => $request->name,
            'timestamp' => Carbon::now()->format('Y-m-d H:i:s')
        ]);
        return redirect()->route('dashboard');
    }
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request, Agency $agency): Response
    {
        return Inertia::render('Agencies/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
            'agency' => $agency
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(Request $request, Agency $agency): RedirectResponse
    {
        $request->validate([
            'name' => 'required'
        ]);
        $agency->update(['name' => $request->name]);
        return redirect()->route('dashboard');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request, Agency $agency): RedirectResponse
    {
        $user_ids = User::select('id')->where('pa_id',$agency->id)->pluck('id')->toArray();
        DB::table('user_role')->whereIn('user_id',$user_ids)->delete();
        DB::table('user')->where('pa_id',$agency->id)->delete();
        $agency->delete();
        return redirect()->route('dashboard');
    }
}
