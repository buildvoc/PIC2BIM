<?php

namespace App\Http\Controllers;

use App\Models\Agency;
use App\Models\User;
use App\Models\UserRole;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class OfficerController extends Controller
{
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
            'agency_id' => $request->id
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
            'password' => sha1($request->password),
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
            'agency_id' => $request->agencyId
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
        if($request->password) $user->update(['password' =>  sha1($request->password) ]);

        return redirect()->route('dashboard.agencies.show',$request->agencyId);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, string $id)
    {
        UserRole::where('user_id',$id)->delete();
        User::find($id)->delete();
        return redirect()->route('dashboard.agencies.show',$request->agencyId);
    }
}
