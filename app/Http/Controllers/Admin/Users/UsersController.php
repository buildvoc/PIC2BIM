<?php
namespace App\Http\Controllers\Admin\Users;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use DataTables;
use App\Models\User;
use DateTime;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UsersController extends Controller {
    public function index(Request $request) {
        return view('admin.users.list');
    }
    public function listing(Request $request)
    {
        if ($request->ajax()) {
            
            $data = User::select('user.*')
            ->selectSub(function ($query) {
                $query->from('task')
                    ->selectRaw('COUNT(*)')
                    ->where("flg_deleted",0)
                    ->whereColumn('task.user_id', 'user.id');
            }, 'tasks_count')
            ->selectSub(function ($query) {
                $query->from('photo')
                    ->selectRaw('COUNT(*)')
                    ->where("flg_deleted",0)
                    ->whereColumn('photo.user_id', 'user.id');
            }, 'photos_count')
            ->where("active",1)
            ->orderBy('user.pa_id', 'ASC')
            ->get();


            return DataTables::of($data)
                ->addColumn('ID', function ($row) {
                    return $row->id;
                })
                ->addColumn('Name', function ($row) {
                    return '<a style="color:blue; text-decoration:underline" href="'.route("admin.tasks.userTasks", ["id" => $row->id]).'" class="badge badge-light">'.$row->name.'</a>';
                })->addColumn('Surname', function ($row) {
                    return $row->surname;
                })->addColumn('Identification_number', function ($row) {
                    return $row->identification_number;
                })->addColumn('Tasks_count', function ($row) {
                    return $row->tasks_count;
                })->addColumn('Photos_count', function ($row) {
                    return $row->photos_count;
                })->addColumn('Unassigned_photos', function ($row) {
                    return $row->photos_count;
                })->addColumn('Tasks_in_Data_provided', function ($row) {
                    return $row->photos_count;
                })->addColumn('Action', function ($row) use ($request)  {

                    $edit = "";
                    $delete = "";

                    $print_civil = '<a href="'.route("admin.users.edit", ["id" => $row->id]).'" class="badge badge-warning" style="margin-right:5px;"><i style="color:#000" class="fa fa-pencil" title="Edit"> Edit</i></a>';
                    $delete = '<a href="javascript:void(0);" class="badge badge-danger delete_region" data-region-id="' . $row->id . '"><i  style="color:#FFF" class="fa fa-trash" title="Deactivate"> Deactivate</i></a>';

                    return $edit.$print_civil.$delete;
                })
                ->rawColumns(['Name','Action'])
                ->make(true);
        }
    }
    public function create() {
        return view('admin.users.add');
    }
    public function createProcess(Request $request)
    {
        
        $request->validate([
            'login' => [
                'required',
                'unique:App\Models\User'
            ],
            'password' => 'required'
        ], [
            'login.unique' => 'Login has already been taken.',
        ]);

        $users_details = new User();
        $users_details->login = $request->login;
        $users_details->password = Hash::make($request->password);;
        $users_details->name = $request->name;
        
        $users_details->pa_id = 1;
        $users_details->timestamp = date("Y-m-d H:i:s");

        $users_details->surname = $request->surname;
        $users_details->email = $request->email;
        $users_details->identification_number = $request->identification_number;
        $users_details->vat = $request->vat;
        
        $users_details->save();
        return redirect('/admin/users')->with('success', 'User Successfully Added');
    }
    public function delete(Request $request)
    {
        if (isset($request->id) && $request->id != '' && is_numeric($request->id)) {
            $user = User::find($request->id);
            if ($user) {
                $user->active = 0;
                $user->save();
                return redirect('/admin/users')->with('success', 'User has been Deactivated successfully');
            } else {
                return redirect('/admin/users')->with('error', 'Something went wrong, Could not delete User.');
            }
        } else {
            return redirect('/admin/users')->with('error', 'Something went wrong, Could not delete User.');
        }
    }
    public function edit(Request $request)
    {
        $user_id = $request->id;
        if ($user_id && $user_id != '' && is_numeric($user_id)) {
            $usersDetails = User::where('id', $request->id)->first();
            if (isset($usersDetails) && $usersDetails != '' && $usersDetails->count() > 0) {
                return view('admin.users.edit', compact('usersDetails'));
            } else {
                return redirect('/admin/users')->with('error', 'No User found.');
            }
        } else {
            return redirect('/admin/users')->with('error', 'No User found.');
        }
    }
    public function update(Request $request)
    {
        $request->validate([
            'login' => [
                'required',
                Rule::unique('App\Models\User', 'login')
                    ->ignore($request->user_id, 'id'),
            ]
        ], [
            'login.unique' => 'Login has already been taken.',
        ]);
        
        $users_details = User::where('id', $request->user_id)->first();
        $users_details->login = $request->login;

        if( isset($request->password) && $request->password != '' ) {
            $users_details->password = Hash::make($request->password);
        }

        $users_details->name = $request->name;
        
        $users_details->pa_id = 1;
        $users_details->timestamp = date("Y-m-d H:i:s");

        $users_details->surname = $request->surname;
        $users_details->email = $request->email;
        $users_details->identification_number = $request->identification_number;
        $users_details->vat = $request->vat;
        $users_details->save();
        return redirect('/admin/users')->with('success', "User Successfully updated");
    }
}
