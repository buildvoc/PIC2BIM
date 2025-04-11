<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $role): Response
    {
        $user = Auth::user();
        $roles = $user->rolesArray();
        
        if(!in_array($role,$roles)) abort(403);
        
        // if(in_array('OFFICER',$roles)) return redirect()->route('users.index');

        // if(in_array('FARMER',$roles)) return redirect()->route('user_task.index');
        return $next($request);
    }
}
