<?php
namespace App\Http\Controllers\Admin\UserAdmin;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use App\Mail\AdminNewUserPassword;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Route;
use Yajra\DataTables\Facades\DataTables;
use Illuminate\Support\Facades\Hash;


class UserAdminController extends Controller
{
    public function index()
    {
        $admin_users = User::where('deleted_at', NULL)->get();
        $roles = Role::all();
        return view('admin.userAdmins.list', compact('admin_users', 'roles'));
    }
    public function listOfAdminUsers(Request $request){
        if($request->ajax()){
            $data = User::where('is_deleted', false)->with(['roles'])->orderBy('id', 'DESC')->get();
            return DataTables::of($data)
            ->addColumn('id', function($row){
                return $row->id;
             })->addColumn('role', function($row){
                    if(count($row->roles) > 0) {
                        return $row->roles[0]->name;
                    } else {
                        return "Role not assigned";
                    }

                })->addColumn('email', function($row){
                   return $row->email;
                })->addColumn('joiningDate', function($row){
                   return globalDateFormat($row->created_at);
                })
                ->addColumn('status', function($row){
                    if($row->status != "active") {
                        $html =   '<a onclick="statusChange('.$row->id.')"><span class="btn badge badge-light-danger fs-8 fw-bolder">'.$row->status.'</span></a>';
                        return $html;
                    } else {
                        $html =   '<a onclick="statusChange('.$row->id.')"><span class="btn badge badge-light-primary fs-8 fw-bolder">'.$row->status.'</span></a>';
                        return $html;
                    }
                })
                ->addColumn('action', function($row){
                    $html =   '<a href="'.route("admin.user-list-admin.edit.user",["id" => $row->id]).'" class="badge badge-light"><i class="fa fa-eye"></i></a>';
                    return $html;
                })
                ->addColumn('name', function($row){
                   return $row->name;
                })
                ->rawColumns(['checkboxex','status','action'])
            ->make(true);
        }

    }
    public function addAdminUser(Request $request) {
        $data=$request->all();
        $data['phone'] = '+' . (int)$data['phone'];
        $request->replace($data);

        $request->validate([
            'name' => 'required',
            'email' => 'required|email|unique:App\Models\UserAdmin,email',
            'phone' => 'required|min:9|max:15'
        ],[
            'phone.min' => 'Phone number length should be minimum 8 characters',
			'phone.max' => 'Phone number length should be maximum 14 characters',
			'phone.required' => 'Phone Number is required',
        ]);
        $user = new UserAdmin();
        $user->name = $request->name;
        $user->email = $request->email;
        $user->phone = $request->phone;

        if ($request->hasFile('avatar')) {
            $file = $request->avatar;
            $filename = $file->getClientOriginalName();
            $image = date('His') . $filename;
            $destination_path = public_path() . '/images';
            $file->move($destination_path, $image);
            $user->avatar = $image;
        }

        $user->save();
        $token = Str::uuid();
        $user->remember_token = $token;
        $user->save();
        try {
            Mail::to($request->email)->send(new AdminNewUserPassword($user));
        } catch (\Exception $e) {
            return redirect()->back()->with('error','Email Sending Error');
        }
        activityLog('UserAdminController', 'UserAdmin', 'addAdminUser', "create", "admin", "New registration, Email for generate password sent", null, $user, $request->ip(), $request);

        $role = Role::where('id', $request->user_role)->first();
        activityLog('UserAdminController', 'UserAdmin', 'addAdminUser', "create", "admin", "Admin User Created Successfully", null, $user, $request->ip(), $request);
        $user->assignRole($role);

        return redirect()->back()->with('success', 'User admin created');
    }
    public function editViewUserForm(Request $request)
    {
        $user = User::where('id', $request->id)->first();
        return view('admin.userAdmins.view-edit', compact('user'));
    }

    public function updateAdminUser(Request $request) {
        $request->validate([
            'name' => 'required',
            'phone' => 'required|min:9|max:15',
        ],[
            'phone.min' => 'Phone number length should be minimum 8 characters',
			'phone.max' => 'Phone number length should be maximum 14 characters',
			'phone.required' => 'Phone Number is required',
        ]);
        // $oldInstance = User::where('id', $request->id)->first();

        $user = User::where('id', $request->id)->first();
        $user->name = $request->name;
        
        $user->phone = $request->phone;

        
        if( isset($request->password) ) {
            $user->password = Hash::make($request->password);
        }

        $user->save();

        if ($request->hasFile('avatar')) {
            $file = $request->avatar;
            $filename = $file->getClientOriginalName();
            $image = date('His') . $filename;
            $destination_path = public_path().'/images';
            $file->move($destination_path, $image);
            User::where('id', $request->id)->update([
                'avatar' => $image
            ]);
        }
        // DB::table('model_has_roles')->where('model_id',$request->id)->delete();
        // $role = Role::where('id', $request->role)->first();
        // $user->assignRole($role);

        // $newInstance = User::where('id', $request->id)->first();
        // activityLog('UserAdminController', 'UserAdmin', 'updateAdminUser', "update", "admin", "Admin User has been updated successfully", $oldInstance, $newInstance, $request->ip(), $request);
        return response()->json(['status' => 'success' , 'message' => 'User has been updated successfully']);
    }

    public function deleteUser(Request $request) {
        $newInstance = User::where('id', $request->id)->first();
        $oldInstance = null;
        $user = User::where('id', $request->id)->update([
            'is_deleted' => true
        ]);
        DB::table('model_has_roles')->where('model_id',$request->id)->delete();
        if($user) {
            activityLog('UserAdminController', 'UserAdmin', 'deleteUser', "delete", "admin", "Admin User has been deleted successfully", null, $newInstance, $request->ip(), $request);
            return response()->json(['status' => 'success' , 'message' => 'User has been deleted successfully']);
        } else {
            return response()->json(['status' => 'error' , 'message' => 'Error! Please try again']);
        }
    }

    public function activateUser(Request $request) {
        $current_status=$request->current_status;

        if($current_status=='active'){
            $user = User::find($request->id);
            $user->status = "inActive";
            $user->save();
            $message='User has been successfully inActivated';
            return  json_encode(['status'=>'success','message'=>$message]);
        }

        if($current_status=='inActive'){
            $user = User::find($request->id);
            $user->status = "active";
            $user->save();
            $message='User has been successfully activated';
            return  json_encode(['status'=>'success','message'=>$message]);
        }

    }
}
