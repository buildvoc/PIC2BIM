<?php

namespace App\Http\Controllers;

use App\Http\Middleware\CheckAdmin;
use App\Http\Requests\ProfileUpdateRequest;
use App\Models\Agency;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Log;

class AgencyController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware(middleware: CheckAdmin::class, except: ['destroy']),
        ];
    }
    /**
     * Display the user's profile form.
     */
    public function index(Request $request): Response
    {
        $agencies = Agency::where('active',1)->paginate(10);

        return Inertia::render('Agencies/Index', compact('agencies'));
    }

    public function create(Request $request): Response
    {
        return Inertia::render('Agencies/Create', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
        ]);
    }

    public function show(Request $request, Agency $agency) : Response{
        $officers = User::
        join('user_role as ur', 'user.id', '=', 'ur.user_id')
        ->select('user.id', 'user.login', 'user.name', 'user.surname', 'user.identification_number', 'user.vat', 'user.email')
        ->where('ur.role_id', '=', 2)
        ->where('user.active', '=', 1)
        ->where('user.pa_id', '=', $agency->id)
        ->orderBy('user.id')
        ->paginate(10);

        return Inertia::render('Officers/Index', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
            'agency' => $agency,
            'officers' => $officers
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
        $agency->update(['active' => 0]);
        return redirect()->route('dashboard');
    }
}
