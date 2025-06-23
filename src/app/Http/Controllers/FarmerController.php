<?php

namespace App\Http\Controllers;
use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\Task;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;


 class FarmerController extends Controller
{
    public function index(Request $request)
    {   
        $filtersVal = ["new","open","data provided","returned","accepted","declined"];
        $search = $request->search;
        $user = Auth::user();
        $user_id = $user->id;
        $tasks = Task::withCount(['photos' => function ($query) {
            $query->where('flg_deleted', 0);
        }])
        ->with(['taskType:id,description','photos'  => function ($query) {
            $query->where('flg_deleted', 0)
            ->select([
            'lat',
            'lng',
            'photo_heading',
            'path',
            'file_name',
            'digest',
            'task_id'
            ]);
        }])
        ->select(
            'task.id',
            'task.status',
            'task.name',
            'task.text',
            'task.date_created as created',
            'task.task_due_date as due',
            DB::raw("to_char(task.date_created, 'DD-MM-YYYY') as date_created"),
            DB::raw("to_char(task.task_due_date, 'DD-MM-YYYY') as task_due_date"),
            // DB::raw('COUNT(photo.id) as photo_taken'),
            'task_flag.flag_id',
            'status_sortorder.sortorder'
        )
        ->addSelect([
            'photo_taken' => Task::selectRaw('COUNT(*)')
                                ->from('photo')
                                ->whereColumn('photo.task_id','task.id')
                                ->where('photo.flg_deleted',0)
        ])
        ->selectRaw('CASE WHEN (SELECT COUNT(*) FROM task_flag tf WHERE task_id = task.id AND flag_id = 1) > 0 THEN 1 ELSE 0 END AS flag_valid')
        ->selectRaw('CASE WHEN (SELECT COUNT(*) FROM task_flag tf WHERE task_id = task.id AND flag_id = 2) > 0 THEN 1 ELSE 0 END AS flag_invalid')
        ->where('task.user_id', $user_id)
        ->where('task.flg_deleted', 0)
        // ->leftJoin('photo', 'task.id', '=', 'photo.task_id')
        ->leftJoin('task_flag', 'task.id', '=', 'task_flag.task_id')
        ->leftJoin('status_sortorder', 'task.status', '=', 'status_sortorder.status');

        if($search == null || $search == 'null') $search = '';
        if (!empty($search)) {
            $tasks->where('task.name', 'ILIKE', '%' . $search . '%');
        }
        
        $selectedStatuses = explode(",",$request->status);
        if($request->has('status')) {
            $filtersVal = $selectedStatuses;
            if(!in_array('new',$selectedStatuses)) $tasks->where('task.status','!=','new');
            if(!in_array('open',$selectedStatuses)) $tasks->where('task.status','!=','open');
            if(!in_array('data provided',$selectedStatuses)) $tasks->where('task.status','!=','data provided');
            if(!in_array('returned',$selectedStatuses)) $tasks->where('task.status','!=','returned');
            if(!in_array('accepted',$selectedStatuses)) {
                $tasks->where(function($q){
                    $q->whereNull('task_flag.flag_id')->orWhere('task_flag.flag_id','!=',1);
                });
                
            }
            if(!in_array('declined',$selectedStatuses)) {
                $tasks->where(function($q){
                    $q->whereNull('task_flag.flag_id')->orWhere('task_flag.flag_id','!=',2);
                });
            }
        }
        $sortColumn = 'status';$sortOrder='asc';
        
        if($request->sortColumn && $request->sortOrder){
            $sortColumn = $request->sortColumn;
            $sortOrder = $request->sortOrder;
            $tasks->orderBy($sortColumn,$sortOrder);
        }else{
            $tasks->orderByRaw('status_sortorder.sortorder ASC, created DESC');
        }

        // $tasks = $tasks->orderBy('status_sortorder.sortorder');
        $tasks = $tasks->groupBy([
            'task.id', 
            'task.status', 
            'task.name', 
            'task.text', 
            'date_created', 
            'task_due_date', 
            'task_flag.flag_id',
            'status_sortorder.sortorder'
        ])
        ->paginate(10)
        ->through(function ($task) {
            $photos = $task->photos->map(function ($photo) {
                $filePath = storage_path('app/private/' . $photo->path . $photo->file_name);
                $file = null;
                if (file_exists($filePath)) {
                    $file = file_get_contents($filePath);
                }
                return [
                    'lat' => $photo->lat,
                    'lng' => $photo->lng,
                    'photo_heading' => $photo->photo_heading,
                    'path' => $photo->path,
                    'file_name' => $photo->file_name,
                    'digest' => $photo->digest,
                    'photo' => $file ? base64_encode($file) : null,
                ];
            });

            return [
                'id' => $task->id,
                'status' => $task->status,
                'name' => $task->name,
                'text' => $task->text,
                'date_created' => $task->date_created,
                'task_due_date' => $task->task_due_date,
                'photo_taken' => $task->photos->count(),
                'flag_valid' => $task->flag_valid,
                'photos' => $photos->toArray(),
                'flag_id' => $task->flag_id
            ];
        });
        return Inertia::render('Farmers/Index',compact('tasks','search','sortColumn','sortOrder','selectedStatuses','filtersVal'));
    }


}
