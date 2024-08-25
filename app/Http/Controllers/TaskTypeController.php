<?php

namespace App\Http\Controllers;

use App\Models\TaskType;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TaskTypeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $task_types = TaskType::where('active',1)->paginate(10);
        return Inertia::render('TaskType/Index', compact('task_types'));
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('TaskType/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required'
        ]);

        TaskType::create([
            'name' => $request->name,
            'description' => $request->description
        ]);
        return redirect()->route('types.index');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        $type = TaskType::find($id);
        return Inertia::render('TaskType/Edit', compact('type'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $request->validate([
            'name' => 'required'
        ]);

        TaskType::find($id)->update([
            'name' => $request->name,
            'description' => $request->description
        ]);
        return redirect()->route('types.index');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        TaskType::find($id)->update([
            'active' => 0
        ]);
        return redirect()->route('types.index');
    }
}
