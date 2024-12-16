<?php

namespace App\Http\Controllers;

use App\Models\Photo;
use App\Models\Task;
use App\Models\TaskFlag;
use App\Models\TaskType;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TasksController extends Controller
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
        $user_id = $request->id;
        $user = User::find($user_id);

        $task_types = TaskType::where('active',1)->get();
        return Inertia::render('Tasks/Create',compact('user','task_types'));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required',
            'date_due' => 'required'
        ]);

        Task::create([
            'user_id'=> $request->user_id,
            'created_id'=> Auth::id(),
            'type_id' => $request->purpose,
            'status'=> Task::STATUS[0],
            'name'=> $request->name,
            'text'=> $request->text,
            'date_created'=> now(),
            'task_due_date'=> $request->date_due.' 23:59:59',
            'note'=> '',
            'timestamp'=> now(),
            'flg_deleted' => 0
        ]);
        return redirect()->route('users.show',$request->user_id);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $task = Task::select(
            'task.id',
            'task.user_id',
            'task.created_id',
            'task.status',
            'task.text_returned',
            'task.note',
            'task.name',
            'task.text',
            'task.date_created as created',
            'task.task_due_date as due',
            DB::raw('DATE_FORMAT(task.date_created, "%d-%m-%Y") as date_created'),
            DB::raw('DATE_FORMAT(task.task_due_date, "%d-%m-%Y") as task_due_date'),
            'task_flag.flag_id',
            'status_sortorder.sortorder',
            'task_type.name as purpose'
        )
        ->leftJoin('photo', 'task.id', '=', 'photo.task_id')
        ->leftJoin('task_type', 'task.type_id', '=', 'task_type.id')
        ->leftJoin('task_flag', 'task.id', '=', 'task_flag.task_id')
        ->leftJoin('pa_flag', 'pa_flag.id', '=', 'task_flag.flag_id')
        ->leftJoin('status_sortorder', 'task.status', '=', 'status_sortorder.status')
        ->where('task.id',$id)
        ->first();
        $user = User::find($task->user_id);
        return Inertia::render('Tasks/Detail',compact('task','user'));
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $task = Task::where('id',$id)->first();
        $task->update(['flg_deleted'=>1]);
        return redirect()->route('users.show',$task['user_id']);
    }

    public function acceptTaskPhotos(Request $request)
    {   
        $response = ['error' => '0', 'errorText' => ''];
        foreach($request->tasks as $taskId){
            $photosCount = Photo::where('task_id', $taskId)
                ->where('flg_deleted', 0)
                ->count();
            if ($photosCount > 0){
                try {
                    TaskFlag::create([
                        'task_id' => $taskId,
                        'flag_id' => Task::VALID,
                        'timestamp' => now()
                    ]);
                    Task::where('id', $taskId)->update([
                        'status' => Task::STATUS[3]
                    ]);
                } catch (\Exception $ex) {
                    $response['error'] = '1';
                    $response['errorText'] = $ex->getMessage();
                }
            }else{
                return redirect()->back()->withErrors('Task cannot be accepted without photos!');
            }
        }

        return redirect()->back();
    }

    public function declineTaskPhotos(Request $request){
        try {
            TaskFlag::create([
                'task_id' => $request->id,
                'flag_id' => Task::INVALID,
                'timestamp' => now()
            ]);
            Task::where('id', $request->id)->update([
                'status' => Task::STATUS[3],
                'text_reason' => $request->reason
            ]);
        } catch (\Exception $ex) {
            $response['error'] = '1';
            $response['errorText'] = $ex->getMessage();
        }
        return redirect()->back();
    }

    public function returnTaskPhotos(Request $request){
        try {
            Task::where('id', $request->id)->update([
                'status' => Task::STATUS[5],
                'text_returned' => $request->reason
            ]);
        } catch (\Exception $ex) {
            $response['error'] = '1';
            $response['errorText'] = $ex->getMessage();
        }
        return redirect()->back();
    }

    public function moveFromOpen(Request $request, $id){
        $photosCount = Photo::where('task_id', $id)
                ->where('flg_deleted', 0)
                ->count();
        if ($photosCount > 0){
            Task::find($id)->update([
                'note' => $request->note,
                'status' => Task::STATUS[2]
            ]);
        }else{
            return redirect()->back()->withErrors('The task has no photos!');
        }
        return redirect()->back();
    }

    public function getUnassignedTasks(Request $request){
        $tasks = Task::doesntHave('photos')->where('user_id',Auth::id())->where('flg_deleted',0)->select('name','id')->get();
        return response()->json($tasks);
    }
    public function assignTask(Request $request){
        $photoIds = explode(",",$request->photo_ids);

        Photo::whereIn('id',$photoIds)->update([
            'task_id' => $request->task_id
        ]);
        // return redirect()->route('photo_gallery');
    }
}
