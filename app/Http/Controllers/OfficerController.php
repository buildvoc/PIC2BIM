<?php

namespace App\Http\Controllers;

use App\Http\Middleware\CheckAdmin;
use App\Mail\OfficerInvite;
use App\Models\Agency;
use App\Models\User;
use App\Models\UserRole;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

class OfficerController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware(middleware: CheckAdmin::class, except: ['index']),
        ];
    }
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(Request $request)
    {
        return Inertia::render('Officers/Create', [
            'agency_id' => $request->id,
            'agency' => Agency::find($request->id)
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'login' => 'required',
            'password' => 'required'
        ]);

        $user = User::create([
            'login' => $request->login,
            'pswd' => sha1($request->password),
            'name' => $request->name,
            'surname' => $request->surname,
            'email' => $request->email,
            'identification_number' => $request->identification_number,
            'vat' => $request->vat,
            'pa_id' => $request->agencyId,
            'timestamp' => Carbon::now()->format('Y-m-d H:i:s')
        ]);
        DB::table('user_role')->insert(['user_id'=> $user->id,'role_id' => 2,'timestamp' => Carbon::now()->format('Y-m-d H:i:s')]);

        return redirect()->route('dashboard.agencies.show',$request->agencyId);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Request $request, string $id)
    {
        return Inertia::render('Officers/Edit', [
            'officer' => User::find($id),
            'agency_id' => $request->agencyId,
            'agency' => Agency::find($request->agencyId)
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $request->validate([
            'login' => 'required',
        ]);

        $user = User::find($id)->update([
            'login' => $request->login,
            'name' => $request->name,
            'surname' => $request->surname,
            'email' => $request->email,
            'identification_number' => $request->identification_number,
            'vat' => $request->vat,
            'pa_id' => $request->agencyId,
            'timestamp' => Carbon::now()->format('Y-m-d H:i:s')
        ]);
        if($request->password) $user->update(['pswd' =>  sha1($request->password) ]);

        return redirect()->route('dashboard.agencies.show',$request->agencyId);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, string $id)
    {
        User::find($id)->update(['active' => 0]);
        return redirect()->route('dashboard.agencies.show',$request->agencyId);
    }

    public function invite(Request $request, $id){
        return Inertia::render('Officers/Invite', [
            'agency_id' => $id,
            'agency' => Agency::find($id)
        ]);
    }

    public function sendInvite(Request $request){
        $signupUrl = route('register',['agency' => $request->agencyId,'email'=> $request->email]);

        Mail::to($request->email)->send(new OfficerInvite($signupUrl));
        return redirect()->route('dashboard.agencies.show',$request->agencyId);
    }
}
