<?php

namespace App\Http\Controllers;

use App\Models\Photo;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
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

        $search = $request->search;
        if($request->search){
            $users = $users->where(function($q) use($request){
                $q->orWhere('user.name','LIKE','%'.$request->search.'%')
                    ->orWhere('user.surname','LIKE','%'.$request->search.'%')
                    ->orWhere('user.identification_number','LIKE','%'.$request->search.'%');
            });
        }

        if($request->sortColumn && $request->sortOrder) {
            $sortColumn = $request->sortColumn;
            $sortOrder = $request->sortOrder;
        }
        $users->orderBy($sortColumn,$sortOrder);
        $users = $users->paginate(10);

        foreach($users as $user){
            $user->tasks_count=User::getFarmerCounts($user['id'],'tasks');
            $user->photo_count=User::getFarmerCounts($user['id'],'photos');
            $user->unassigned_photos_count=User::getFarmerCounts($user['id'],'unassigned_photos');
            $user->tasks_provided_count=User::getFarmerCounts($user['id'],'tasks_provided');
        }
        return Inertia::render('Users/Index',compact('users','sortColumn','sortOrder','search'));
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
            'login' => ['required', Rule::unique(User::class)],
            'password' => 'required',
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique(User::class)],
        ]);

        $user = User::create([
            'login' => $request->login,
            'pswd' => sha1($request->password),
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
    public function show(Request $request, User $user)
    {
        $filtersVal = ["new","open","data provided","returned","accepted","declined"];
        $search = $request->search;
        $filters = array('new' => 1,'open' => 1,'data provided' => 1, 'data checked' => 1, 'closed' => 1, 'returned' => 1);
        $tasksQuery = Task::select(
            'task.id',
            'task.status',
            'task.name',
            'task.text',
            'task.date_created as created',
            'task.task_due_date as due',
            DB::raw('DATE_FORMAT(task.date_created, "%d-%m-%Y") as date_created'),
            DB::raw('DATE_FORMAT(task.task_due_date, "%d-%m-%Y") as task_due_date'),
            DB::raw('COUNT(photo.id) as photo_taken'),
            'task_flag.flag_id',
            'status_sortorder.sortorder'
        )
        ->leftJoin('photo', 'task.id', '=', 'photo.task_id')
        ->leftJoin('task_flag', 'task.id', '=', 'task_flag.task_id')
        ->leftJoin('pa_flag', 'pa_flag.id', '=', 'task_flag.flag_id')
        ->leftJoin('status_sortorder', 'task.status', '=', 'status_sortorder.status')
        ->where('task.user_id', $user->id)
        ->where('task.flg_deleted', 0);
        
        
        if (!empty($search)) {
            $tasksQuery->where('task.name', 'LIKE', '%' . $search . '%');
        }
        
        $selectedStatuses = explode(",",$request->status);
        
        if($request->has('status')) {
            $filtersVal = $selectedStatuses;
            if(!in_array('new',$selectedStatuses)) $tasksQuery->where('task.status','!=','new');
            if(!in_array('open',$selectedStatuses)) $tasksQuery->where('task.status','!=','open');
            if(!in_array('data provided',$selectedStatuses)) $tasksQuery->where('task.status','!=','data provided');
            if(!in_array('returned',$selectedStatuses)) $tasksQuery->where('task.status','!=','returned');
            if(!in_array('accepted',$selectedStatuses)) {
                $tasksQuery->where(function($q){
                    $q->whereNull('task_flag.flag_id')->orWhere('task_flag.flag_id','!=',1);
                });
                
            }
            if(!in_array('declined',$selectedStatuses)) {
                $tasksQuery->where(function($q){
                    $q->whereNull('task_flag.flag_id')->orWhere('task_flag.flag_id','!=',2);
                });
            }
        }
        $sortColumn = 'status_sortorder.sortorder';$sortOrder='asc';
        
        if($request->sortColumn && $request->sortOrder){
            $sortColumn = $request->sortColumn;
            $sortOrder = $request->sortOrder;
            $tasksQuery->orderBy($sortColumn,$sortOrder);
        }else{
            $tasksQuery->orderByRaw('status_sortorder.sortorder ASC, created DESC');
        }
        $tasksQuery->groupBy([
            'task.id', 
            'task.status', 
            'task.name', 
            'task.text', 
            'date_created', 
            'task_due_date', 
            'task_flag.flag_id',
            'status_sortorder.sortorder'
        ]);
        // dd($tasksQuery->toSql());
        $tasks = $tasksQuery->paginate(10);

        foreach($tasks as $task){
            $task['verified'] = $this->photos_verified_status($task['id']);
        }

        $selectedStatuses = implode(",",$selectedStatuses);
        return Inertia::render('Tasks/Index',compact('tasks','sortColumn','sortOrder','search', 'user','selectedStatuses','filtersVal'));
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
            'login' => ['required', Rule::unique(User::class)],
            'password' => 'required',
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique(User::class)],
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
        if($request->password) $user->update(['pswd' =>  sha1($request->password) ]);
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

    public static function photos_verified_status($task_id){
        $return = 'incomplete';
        $verified = true;
        $photos = Photo::select('id', 'flg_checked_location', 'flg_original')->where('task_id', $task_id)->where('flg_deleted',0)->get();
        foreach ($photos as $key => $photo) {
          if ($photo['flg_checked_location'] === 0){
            $return = 'not_verified';
            $verified = false;
          } else if (empty($photo['flg_checked_location'])){
            if ($return!='not_verified'){
              $return = 'incomplete';
            }
            $verified = false;
          } else {
            if ($verified){
              $return = 'verified';
            }
          }
          if ($photo['flg_original'] === 0){
            $return = 'not_verified';
            $verified = false;
          } else if (empty($photo['flg_original'])){
            if ($return!='not_verified'){
              $return = 'incomplete';
            }
            $verified = false;
          } else {
            if ($verified){
              $return = 'verified';
            }
          }
        }
        return $return;
      }

      public function createToken(Request $request){
        
        $validator = Validator::make($request->all(),[
            'login' => 'required',
            'pswd' => 'required'
        ]);
        $error_response = ['status' => 'error', 'error_msg' => 'bad login or password'];
        if($validator->fails()) return response()->json($error_response);

        $user = User::select('id','name','surname','identification_number','email','vat')->where('login',trim($request->login))->where('pswd',sha1(trim($request->pswd)))->first();

        if($user){
            $token = $user->createToken($request->login)->plainTextToken;

            return response()->json([
                'status' => 'ok',
                'error_message' => null,
                'user' => $user,
                'token' => $token
            ]);

        }else{
            return response()->json($error_response);
        }
      }
}
