<?php
namespace App\Http\Controllers\Admin\Tasks;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use DataTables;
use App\Models\User;
use App\Models\Task;
use App\Models\TaskType;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class TasksController extends Controller {
    public function index(Request $request) {
        $user_tasks = "all";
        $user_details = "";
        if( isset($request->id) && $request->id != '' && $request->id > 0 ) {
            $user_tasks = $request->id;
            $user_details = User::where("id",$user_tasks)->first();
        }
        return view('admin.tasks.list', compact('user_tasks','user_details'));
    }
    public function listing(Request $request)
    {
        if ($request->ajax()) {
            
            $data = Task::
            where("flg_deleted",0)
            ->select("task.*","task.id as id", "task_type.name as task_type_name", "user.name as user_name")
            ->join('task_type', 'task.type_id', '=', 'task_type.id')
            ->selectSub(function ($query) {
                $query->from('photo')
                    ->selectRaw('COUNT(*)')
                    ->where("flg_deleted",0)
                    ->whereColumn('photo.task_id', 'task.id');
            }, 'photos_count')
            ->join('user', 'task.user_id', '=', 'user.id');

            if( isset($request->user_id) && $request->user_id != '' && $request->user_id != 'all' && $request->user_id > 0 ) {
                $data = $data->where("task.user_id", $request->user_id);
            }   
            $data = $data->orderBy('task.id', 'DESC')->get();

            return DataTables::of($data)
                ->addColumn('status', function ($row) {
                    if( $row->status == "new" ) {
                        return '<span href="javascript:void(0);" class="badge" style="background:yellow; color:#000; width:100%; padding:5px; text-align:center; display:block; font-size:16px; text-transform:uppercase">'.$row->status.'</span>';
                    } else if( $row->status == "open" ) {
                        return '<span href="javascript:void(0);" class="badge" style="background:blue; color:#FFF; width:100%; padding:5px; text-align:center; display:block; font-size:16px; text-transform:uppercase">'.$row->status.'</span>';
                    } else if( $row->status == "returned" ) {
                        return '<span href="javascript:void(0);" class="badge" style="background:orange; color:#000; width:100%; padding:5px; text-align:center; display:block; font-size:16px; text-transform:uppercase">'.$row->status.'</span>';
                    } else if( $row->status == "data provided" ) {
                        return '<span href="javascript:void(0);" class="badge" style="background:gray; color:#000; width:100%; padding:5px; text-align:center; display:block; font-size:16px; text-transform:uppercase">'.$row->status.'</span>';
                    } else if( $row->status == "data checked" ) {
                        return '<span href="javascript:void(0);" class="badge" style="background:green; color:#FFF; width:100%; padding:5px; text-align:center; display:block; font-size:16px; text-transform:uppercase">'.$row->status.'</span>';
                    } else if( $row->status == "closed" ) {
                        return '<span href="javascript:void(0);" class="badge" style="background:red; color:#FFF; width:100%; padding:5px; text-align:center; display:block; font-size:16px; text-transform:uppercase">'.$row->status.'</span>';
                    }
                })->addColumn('photo_taken', function ($row) {
                    return $row->photos_count;
                })->addColumn('verified', function ($row) {
                    return "";
                })->addColumn('task_name', function ($row) {
                    return $row->name;
                })->addColumn('description', function ($row) {
                    return $row->text;
                })->addColumn('user_name', function ($row) {
                    return $row->user_name;
                })->addColumn('task_type', function ($row) {
                    return $row->task_type_name;
                })->addColumn('date_created', function ($row) {
                    return date("Y-m-d", strtotime($row->date_created));
                })->addColumn('due_date', function ($row) {
                    return date("Y-m-d", strtotime($row->task_due_date));
                })->addColumn('acceptation', function ($row) {
                    return "";
                })->addColumn('Action', function ($row) use ($request)  {

                    $edit = "";
                    $delete = "";

                    $print_civil = '<a href="'.route("admin.tasks.edit", ["id" => $row->id,"user_id" => $request->user_id]).'" class="badge badge-warning" style="margin-right:5px;"><i style="color:#000" class="fa fa-pencil" title="Edit"> Edit</i></a>';
                    $delete = '<a href="javascript:void(0);" class="badge badge-danger delete_region" data-region-id="' . $row->id . '"><i  style="color:#FFF" class="fa fa-trash" title="Deactivate"> Deactivate</i></a>';

                    return $edit.$print_civil.$delete;
                })
                ->rawColumns(['status','Name','Action'])
                ->make(true);
        }
    }
    public function create(Request $request) {
        $task_types = TaskType::where("active",1)->get();
        $user_id = "all";
        if( isset($request->id) && $request->id != '' && $request->id > 0 ) {
            $user_id = $request->id;
        }
        return view('admin.tasks.add', compact('user_id',"task_types"));
    }
    public function createProcess(Request $request)
    {
        $request->validate([
            'name' => 'required',
            'start_date' => 'required'
        ]);

        $task_details = new Task();
        $task_details->user_id = $request->user_id;
        $task_details->created_id = Auth::user()->id;

        $task_details->name = $request->name;
        $task_details->timestamp = date("Y-m-d H:i:s");
        $task_details->date_created = date("Y-m-d H:i:s");
        $task_details->task_due_date = date("Y-m-d H:i:s", strtotime($request->start_date));

        $task_details->type_id = $request->purpose;
        $task_details->text = $request->description;
        $task_details->save();

        return redirect()->route('admin.tasks.userTasks', ['id' => $request->user_id])->with('success', 'Task Successfully Added');

    }
    public function delete(Request $request)
    {
        if (isset($request->id) && $request->id != '' && is_numeric($request->id)) {
            $user = Task::find($request->id);
            if ($user) {
                $user->flg_deleted = 1;
                $user->save();
                return redirect('/admin/tasks')->with('success', 'User has been Deactivated successfully');
            } else {
                return redirect('/admin/tasks')->with('error', 'Something went wrong, Could not delete User.');
            }
        } else {
            return redirect('/admin/tasks')->with('error', 'Something went wrong, Could not delete User.');
        }
    }
    public function edit(Request $request)
    {
        $task_types = TaskType::where("active",1)->get();
        $user_id = "all";
        if( isset($request->user_id) && $request->user_id != '' && $request->user_id > 0 ) {
            $user_id = $request->user_id;
        }
        
        $task_id = $request->id;
        if ($task_id && $task_id != '' && is_numeric($task_id)) {
            $taskDetails = Task::where('id', $task_id)->first();
            if (isset($taskDetails) && $taskDetails != '' && $taskDetails->count() > 0) {
                return view('admin.tasks.edit', compact('taskDetails','user_id','task_types'));
            } else {
                return redirect('/admin/tasks')->with('error', 'No User found.');
            }
        } else {
            return redirect('/admin/tasks')->with('error', 'No User found.');
        }
    }
    public function update(Request $request)
    {

        $request->validate([
            'name' => 'required',
            'start_date' => 'required'
        ]);

        $task_details = Task::where('id', $request->id)->first();
        
        $task_details->name = $request->name;
        $task_details->task_due_date = date("Y-m-d H:i:s", strtotime($request->start_date));

        $task_details->type_id = $request->purpose;
        $task_details->text = $request->description;

        $task_details->save();

        
        
        if( isset($request->user_id) && $request->user_id != '' && $request->user_id != 'all' && $request->user_id > 0 ) {
            return redirect()->route('admin.tasks.userTasks', ['id' => $request->user_id])->with('success', 'Task Successfully Updated');
        } else {
            return redirect()->route('admin.tasks.index')->with('success', 'Task Successfully Updated');
        }
        
    }
}
