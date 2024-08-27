<?php

namespace App\Http\Controllers;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $users = User::
            join('user_role as ur', 'user.id', '=', 'ur.user_id')
            ->select('user.id', 'user.login', 'user.name', 'user.surname', 'user.identification_number', 'user.vat', 'user.email')
            ->where('ur.role_id', '=', User::FARMER_ROLE)
            ->where('user.active', '=', 1)
            ->where('user.pa_id', '=', Auth::user()->pa_id);

        $sortColumn = 'id';
        $sortOrder = 'asc';
        if($request->sortColumn && $request->sortOrder) {
            $sortColumn = $request->sortColumn;
            $sortOrder = $request->sortOrder;
        }
        $users->orderBy($sortColumn,$sortOrder);
        $users = $users->paginate(10);

        foreach($users as $user){
            $user->tasks_count=User::getFarmerCounts($user['id'],'tasks');
            $user->photos_count=User::getFarmerCounts($user['id'],'photos');
            $user->unassigned_photos_count=User::getFarmerCounts($user['id'],'unassigned_photos');
            $user->tasks_provided_count=User::getFarmerCounts($user['id'],'tasks_provided');
        }
        return Inertia::render('Users/Index',compact('users','sortColumn','sortOrder'));
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Users/Create');
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
            'pa_id' => Auth::user()->pa_id,
            'timestamp' => Carbon::now()->format('Y-m-d H:i:s')
        ]);
        DB::table('user_role')->insert(['user_id'=> $user->id,'role_id' => User::FARMER_ROLE,'timestamp' => Carbon::now()->format('Y-m-d H:i:s')]);
        return redirect()->route('users.index');
    }

    /**
     * Display the specified resource.
     */
    public function show(User $user)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(User $user)
    {
        return Inertia::render('Users/Edit',compact('user'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, User $user)
    {
        $request->validate([
            'login' => 'required'
        ]);

        $user->update([
            'login' => $request->login,
            'name' => $request->name,
            'surname' => $request->surname,
            'email' => $request->email,
            'identification_number' => $request->identification_number,
            'vat' => $request->vat,
            'timestamp' => Carbon::now()->format('Y-m-d H:i:s')
        ]);
        if($request->password) $user->update(['password' =>  sha1($request->password) ]);
        return redirect()->route('users.index');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(User $user)
    {
        $user->update(['active'=>0]);
        return redirect()->back();
    }
}
