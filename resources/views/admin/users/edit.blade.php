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
                            <h1 class="page-heading d-flex text-dark fw-bold fs-3 flex-column justify-content-center my-0">Users</h1>
                            Edit user
                        </div>
                    </div>  
                </div>

                <div class="card-toolbar justify-content-end">
                    <a href="{{route('admin.users.index')}}" class="btn btn-primary btn-sm mx-5">
                        <i class="fa fa-arrow-left"></i> Back
                    </a>
                </div>

            </div>

            <div class="card-body">
                <form class="form" method="post" id="kt_modal_add_user_form" action="{{ route('admin.users.updateProcess') }}" enctype="multipart/form-data">
                    @csrf
                    <input type="hidden" name="user_id" value="{{$usersDetails->id}}" />
                    <div class="d-flex flex-column flex-lg-row">
                        <div class="flex-lg-row-fluid me-0">
                                <div class="row mb-5">

                                    <div class="col-md-6 fv-row fv-plugins-icon-container">
                                        <label class="required fs-7 fw-bold mt-3">Login</label>
                                        <div class="fv-row">
                                            <input type="text" name="login" id="login" class="form-control" value="{{old('login', $usersDetails->login)}}">
                                        </div>
                                        @error('login')
                                        <div class="error">{{ $message }}</div>
                                        @enderror
                                    </div>

                                    <div class="col-md-6 fv-row fv-plugins-icon-container">
                                        <label class="fs-7 fw-bold mt-3">Password</label>
                                        <div class="fv-row">
                                            <input type="password" name="password" id="password" class="form-control" value="">
                                        </div>
                                        @error('password')
                                        <div class="error">{{ $message }}</div>
                                        @enderror
                                    </div>

                                    <div class="col-md-6 fv-row fv-plugins-icon-container">
                                        <label class="fs-7 fw-bold mt-3">Name</label>
                                        <div class="fv-row">
                                            <input type="text" name="name" id="name" class="form-control" value="{{old('name', $usersDetails->name)}}">
                                        </div>
                                        @error('name')
                                        <div class="error">{{ $message }}</div>
                                        @enderror
                                    </div>

                                    <div class="col-md-6 fv-row fv-plugins-icon-container">
                                        <label class="fs-7 fw-bold mt-3">Surname</label>
                                        <div class="fv-row">
                                            <input type="text" name="surname" id="surname" class="form-control" value="{{old('surname', $usersDetails->surname)}}">
                                        </div>
                                        @error('surname')
                                        <div class="error">{{ $message }}</div>
                                        @enderror
                                    </div>
                                    
                                    <div class="col-md-6 fv-row fv-plugins-icon-container">
                                        <label class="fs-7 fw-bold mt-3">Email</label>
                                        <div class="fv-row">
                                            <input type="text" name="email" id="email" class="form-control" value="{{old('email', $usersDetails->email)}}">
                                        </div>
                                        @error('email')
                                        <div class="error">{{ $message }}</div>
                                        @enderror
                                    </div>

                                    <div class="col-md-6 fv-row fv-plugins-icon-container">
                                        <label class="fs-7 fw-bold mt-3">Identification number</label>
                                        <div class="fv-row">
                                            <input type="text" name="identification_number" id="identification_number" class="form-control" value="{{old('identification_number', $usersDetails->identification_number)}}">
                                        </div>
                                        @error('identification_number')
                                        <div class="error">{{ $message }}</div>
                                        @enderror
                                    </div>

                                    <div class="col-md-6 fv-row fv-plugins-icon-container">
                                        <label class="fs-7 fw-bold mt-3">Vat</label>
                                        <div class="fv-row">
                                            
                                            <input type="text" name="vat" id="vat" class="form-control" value="{{old('vat', $usersDetails->vat)}}">
                                        </div>
                                        @error('vat')
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
        login: {
            required: true
        },
        identification_number: {
            number: true
        },
    },
    messages: {
        login: {
            required: "Login is required.",
        },
        identification_number: {
            required: "Identification must be number",
        }
    }
});
</script>
@endsection