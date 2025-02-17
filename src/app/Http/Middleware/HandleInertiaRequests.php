<?php

namespace App\Http\Middleware;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): string|null
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $splitMode = session('splitMode');
        $darkMode = session('darkMode');
        return [
            ...parent::share($request),
            'auth' => [
                'user' => User::with('roles')->where('id',Auth::id())->first(),
            ],
            'splitMode' => session()->has('splitMode') ? $splitMode : 1,
            'darkMode' => session()->has('darkMode') ? $darkMode : 1,
            'ziggy' => fn () => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
        ];
    }
}
