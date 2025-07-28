<?php

namespace App\Http\Controllers;

use App\Models\Photo;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Auth\Events\Registered;
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
                $q->orWhere('user.name','ILIKE','%'.$request->search.'%')
                    ->orWhere('user.surname','ILIKE','%'.$request->search.'%')
                    ->orWhere('user.identification_number','ILIKE','%'.$request->search.'%');
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
        event(new Registered($user));
        return redirect()->route('users.index');
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, User $user)
    {
        $filtersVal = ["new","open","data provided","returned","accepted","declined"];

        $search = $request->search;
        $selectedStatuses = explode(",",$request->status);
        $sortColumn = $request->sortColumn ?? 'status_sortorder.sortorder';
        $sortOrder= $request->sortOrder ?? 'asc';


        if($request->has('sortColumn')) session(['sortColumn' => $sortColumn]);
        else $sortColumn = session('sortColumn');
        
        if($request->has('sortOrder')) session(['sortOrder' => $sortOrder]);
        else $sortOrder = session('sortOrder');

        if($request->has('search')) session(['search' => $request->search]);
        else $search = session('search') ?? '';

        if($request->has('status')) session((['status' => $request->status]));
        else $selectedStatuses = session('status') ?  explode(",",session('status')) : []; 
        
        $tasksQuery = Task::select(
            'task.id',
            'task.status',
            'task.name',
            'task.text',
            'task.date_created as created',
            'task.task_due_date as due',
            DB::raw("to_char(task.date_created, 'DD-MM-YYYY') as date_created"),
            DB::raw("to_char(task.task_due_date, 'DD-MM-YYYY') as task_due_date"),
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
        
        
        
        if($selectedStatuses) {
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
        
        
        if($sortColumn && $sortOrder){
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
            'login' => ['required', Rule::unique(User::class)->ignore($user->id)],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique(User::class)->ignore($user->id)],
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
        if($request->password && !empty($request->password)) $user->update(['pswd' =>  sha1($request->password) ]);
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

    /**
     * @OA\Post(
     *     path="/comm_login",
     *     summary="Get Bearer Token",
     *     description="Authenticate user credentials and return a bearer token for API access. The token should be included in subsequent API requests in the Authorization header.",
     *     tags={"Authorization"},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *             @OA\Schema(
     *                 type="object",
     *                 required={"login", "pswd"},
     *                 @OA\Property(
     *                     property="login",
     *                     type="string",
     *                     description="User login/username",
     *                     example="user"
     *                 ),
     *                 @OA\Property(
     *                     property="pswd",
     *                     type="string",
     *                     description="User password (will be hashed with SHA1)",
     *                     example="1234"
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Parameter(
     *         name="Accept",
     *         in="header",
     *         required=true,
     *         @OA\Schema(type="string"),
     *         example="application/json",
     *         description="Specifies the content type"
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Authentication successful",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(
     *                 property="status",
     *                 type="string",
     *                 example="ok"
     *             ),
     *             @OA\Property(
     *                 property="error_message",
     *                 type="string",
     *                 nullable=true,
     *                 example=null
     *             ),
     *             @OA\Property(
     *                 property="user",
     *                 type="object",
     *                 @OA\Property(property="id", type="integer", example=1),
     *                 @OA\Property(property="name", type="string", example="John"),
     *                 @OA\Property(property="surname", type="string", example="Doe"),
     *                 @OA\Property(property="identification_number", type="string", example="ID123456"),
     *                 @OA\Property(property="email", type="string", example="john.doe@example.com"),
     *                 @OA\Property(property="vat", type="string", example="GB123456789", nullable=true)
     *             ),
     *             @OA\Property(
     *                 property="token",
     *                 type="string",
     *                 description="Bearer token for API authentication",
     *                 example="1|abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Bad Request - Missing required fields",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="status", type="string", example="error"),
     *             @OA\Property(property="error_msg", type="string", example="bad login or password")
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized - Invalid credentials",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="status", type="string", example="error"),
     *             @OA\Property(property="error_msg", type="string", example="bad login or password")
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="status", type="string", example="error"),
     *             @OA\Property(property="error_msg", type="string", example="bad login or password")
     *         )
     *     )
     * )
     */
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
    public function unassignedUsers(Request $request)
    {
        $users = User::
            join('user_role as ur', 'user.id', '=', 'ur.user_id')
            ->select('user.id', 'user.login', 'user.name', 'user.surname', 'user.identification_number', 'user.vat', 'user.email')
            ->where('ur.role_id', '=', User::FARMER_ROLE)
            ->where('user.pa_id',0);

        $sortColumn = 'id';
        $sortOrder = 'asc';

        $search = $request->search;
        if($request->search){
            $users = $users->where(function($q) use($request){
                $q->orWhere('user.name','ILIKE','%'.$request->search.'%')
                    ->orWhere('user.surname','ILIKE','%'.$request->search.'%')
                    ->orWhere('user.identification_number','ILIKE','%'.$request->search.'%');
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
        return Inertia::render('Users/Unassigned',compact('users','sortColumn','sortOrder','search'));
    }

    public function assign_user($id){
        $user = User::find($id);
        $user->update(['pa_id' => Auth::user()->pa_id]);
        return redirect()->route('users.index');
    }
}
