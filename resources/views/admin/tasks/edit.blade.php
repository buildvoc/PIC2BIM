@extends('admin.layout.main-layout')
@section('header')@section('title', 'Usagers')@include('admin.layout.partials.header')@endsection
@section('aside')@include('admin.layout.partials.aside')@endsection
@section('breadcrumb_content')
@endsection
@section('content')
    <div id="kt_content_container" class="container-sm">
        <div class="card mt-5">
            
            <div class="card-header border-0 d-flex justify-content-between p-0">
                <div id="kt_app_toolbar" class="app-toolbar py-3 py-lg-6">
                    <div id="kt_app_toolbar_container" class="app-container container-xxl d-flex flex-stack">
                        <div class="page-title d-flex flex-column justify-content-center flex-wrap me-3">
                            <h1 class="page-heading d-flex text-dark fw-bold fs-3 flex-column justify-content-center my-0">Tasks</h1>
                            Edit Task
                        </div>
                    </div>  
                </div>

                <div class="card-toolbar justify-content-end">
                    <?php
                    if( isset($user_id) && $user_id != '' && $user_id != 'all' && $user_id > 0 ) {?>
                        <a href="{{ route("admin.tasks.userTasks", ["id" => $user_id]) }}" class="btn btn-primary btn-sm mx-5">
                            <i class="fa fa-arrow-left"></i> Back
                        </a>
                        <?php
                    } else {?>
                            <a href="{{route('admin.tasks.index')}}" class="btn btn-primary btn-sm mx-5">
                                <i class="fa fa-arrow-left"></i> Back
                            </a>
                        <?php
                        }
                    ?>
                </div>

            </div>

            <div class="card-body">
                
                <?php
                if( isset($user_id) && $user_id != '') {?>
                    <form class="form" method="post" id="kt_modal_add_user_form" action="{{ route('admin.tasks.updateProcess') }}" enctype="multipart/form-data">
                        @csrf
                        <input type="hidden" name="user_id" value="{{$user_id}}" />
                        <input type="hidden" name="id" value="{{$taskDetails->id}}" />
                        <div class="d-flex flex-column flex-lg-row">
                            <div class="flex-lg-row-fluid me-0">
                                    <div class="row mb-5">
    
                                        <div class="col-md-6 fv-row fv-plugins-icon-container">
                                            <label class="required fs-7 fw-bold mt-3">Name</label>
                                            <div class="fv-row">
                                                <input type="text" name="name" id="name" class="form-control" value="{{old('name',$taskDetails->name)}}">
                                            </div>
                                            @error('name')
                                            <div class="error">{{ $message }}</div>
                                            @enderror
                                        </div>

                                        <div class="col-md-6 fv-row fv-plugins-icon-container">
                                            <label class="required fs-7 fw-bold mt-3">Due Date</label>
                                            <div class="fv-row">
                                                <input type="text" name="start_date" id="start_date" class="daterange-single form-control" placeholder="<?php echo getDatePlaceholder();?>" autocomplete="off" value="{{date("m/d/Y", strtotime($taskDetails->task_due_date))}}">
                                            </div>
                                            @error('name')
                                            <div class="error">{{ $message }}</div>
                                            @enderror
                                        </div>
                                        <div class="col-md-6 fv-row fv-plugins-icon-container">
                                            <label class="fs-7 fw-bold mt-3">Purpose</label>
                                            <div class="fv-row">
                                                <select name="purpose" data-control="select2" data-placeholder="Select/Search Purpose..."  id="purpose" class="form-select">
                                                    <option value="">Select/Search Purpose</option>
                                                    <?php
                                                        if( isset($task_types) && $task_types != '' && count($task_types) > 0) {
                                                            foreach ($task_types as $key => $task_type) {
                                                                $selected = (old('purpose', $taskDetails->type_id) == $task_type->id) ? 'selected' : '';?>
                                                                <option value="{{$task_type->id}}" {{ $selected }}>{{$task_type->name}}</option>
                                                                <?php
                                                            }
                                                        }
                                                    ?>
                                                </select>                                            </div>
                                            @error('purpose')
                                            <div class="error">{{ $message }}</div>
                                            @enderror
                                        </div>

                                        <div class="col-md-6 fv-row fv-plugins-icon-container">
                                            <label class="fs-7 fw-bold mt-3">Description</label>
                                            <div class="fv-row">
                                                <textarea class="form-control" name="description">{{old('description',$taskDetails->text)}}</textarea>
                                            </div>
                                            @error('description')
                                            <div class="error">{{ $message }}</div>
                                            @enderror
                                        </div>
    
                                        
    
                                    </div>
    
                                    <div class="row mb-5">
                                            
                                        <div class="col-md-6 fv-row fv-plugins-icon-container">
                                        </div>
                                        <div class="col-md-6 fv-row fv-plugins-icon-container">
                                            <label class="fs-5 fw-bold mb-2">&nbsp;</label>
                                            <div class="fv-row" style="text-align: right;">
                                                <button type="submit" class="btn btn-primary" id="kt_careers_submit_button">
                                                    <span class="indicator-label"><i class="fa fa-save"></i> Save </span>
                                                    <span class="indicator-progress">Please wait...
                                                        <span class="spinner-border spinner-border-sm align-middle ms-2"></span>
                                                    </span>
                                                </button>
                                                
                                            </div>
                                        </div>            
                                    </div>
    
    
                                
                            </div>
                        </div>
                    </form>
                    <?php
                } else {?>
                    <h2 class="text-center text-danger"> No user Id Found, please select user first to create Task </h2>
                    <?php
                }
                ?>

            </div>
            
        </div>
    </div>
@endsection
@section('footer')@include('admin.layout.partials.footer')@endsection
@section('admin_script')
<script src="{{asset('admin_assets/js/custom/validation/jquery.validate.js')}}"></script>
<script>

$("#datenaissance, #end_date").flatpickr({
    maxDate: "today",
    time_24hr: true,              
    dateFormat: "<?php echo getDatePlaceholder('for_js_dates');?>",
    allowInput: true
});

$.validator.addMethod("alphanumeric", function(value, element) {
    return this.optional(element) || /^[a-zA-Z0-9]+$/.test(value);
}, "Please enter only letters and numbers.");

$("#kt_modal_add_user_form").validate({
    rules: {
        name: {
            required: true
        },
        start_date: {
            required: true,
        }
    },
    messages: {
        name: {
            required: "Name is required.",
        },
        start_date: {
            required: "Due Date is Required",
        }
    }
});
$("#start_date").flatpickr({
    minDate: "today",
    time_24hr: true,
    dateFormat: "<?php echo getDatePlaceholder('for_js_dates');?>",
    allowInput: false
});
</script>
@endsection