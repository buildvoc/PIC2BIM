<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Task;
use Illuminate\Support\Facades\DB;


class PdfPreviewController extends Controller
{
    public function index(Request $request)
    {

        $ids = $request->has('ids') ? $request->ids : '';
        $task_id = $request->has('task') ? $request->task : '';
        $task=[];
        $photos=[];
         if (trim($ids) !== '') {
                $idsArray = explode(',', $ids);
                $photos = getPhotoByIds($idsArray);
        } else {
            if ($request->unassigned == "true") {
                $user = Auth::user();
                $user_id = $user->id;
                $photos = getPhotosWithoutTask($user_id);
            } else {
                $user = Auth::user();
                $user_id = $user->id;
                $photos = getTaskPhotos($task_id,$user_id);
            }
        }
        if (trim($task_id) !== '') {
            $task = DB::select('SELECT * FROM task WHERE id = ?', [$task_id]);
    }
        return Inertia::render('Farmers/PdfPreview',compact('photos','task'));
    }

    public  function checkTaskPhotos(Task $task){
        return $task;
    }
}
