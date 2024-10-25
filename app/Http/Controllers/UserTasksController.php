<?php

namespace App\Http\Controllers;

use App\Models\Photo;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class UserTasksController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        return Inertia::render('ui/dashboard/farmers_tasks/farmers_tasks');
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
     * Show the form for creating a new resource.
     */
    public function create(Request $request)
    {
        
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        
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
        
    }

}
