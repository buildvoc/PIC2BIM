<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Models\Agency;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Log;

class DashboardController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $roles = $user->rolesArray();

        if(in_array('SUPERADMIN',$roles)) return redirect()->route('dashboard.agencies.index');
        
        if(in_array('OFFICER',$roles)) return redirect()->route('users.index');

        if(in_array('FARMER',$roles)) return redirect()->route('user_task.index');

        return redirect()->route('dashboard.agencies.index');
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }

    public function setSplitModeInSession(){
        $splitMode = session()->has('splitMode') ? session('splitMode') : 0;
        session(['splitMode' => $splitMode ? 0 : 1]);
        return response()->json(['splitMode' => session('splitMode')]);
    }

    public function setDarkModeInSession(){
        $viewMode = session()->has('darkMode') ? session('darkMode') : 'dark';
        session(['darkMode' => $viewMode ? 0 : 1]);
        return response()->json(['darkMode' => session('darkMode')]);
    }
}
