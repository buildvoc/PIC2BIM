<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('Auth/Register',[
            'agency' => $request->agency,
            'email' => $request->email
        ]);
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'login' => 'required|string|max:255|unique:'.User::class,
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique(User::class)],
            'password' => ['required'],
        ]);

        $user = User::create([
            'login' => $request->login,
            'pswd' => sha1($request->password),
            'name' => $request->name,
            'surname' => $request->surname,
            'email' => $request->email,
            'identification_number' => $request->identification_number,
            'vat' => $request->vat,
            'pa_id' => $request->agency_id ? $request->agency_id : 0,
            'timestamp' => now(),
            'active' => 1
        ]);

        if($user->pa_id == 0) $role_id = 1;
        else $role_id = 2;
        
        DB::table('user_role')->insert(['user_id'=> $user->id,'role_id' => $role_id,'timestamp' => Carbon::now()->format('Y-m-d H:i:s')]);

        event(new Registered($user));

        Auth::login($user);

        return redirect(route('dashboard', absolute: false));
    }
}
