@extends('admin.layout.main-layout')
@section('header')@section('title', 'Users')@include('admin.layout.partials.header')@endsection
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
                            <h1 class="page-heading d-flex text-dark fw-bold fs-3 flex-column justify-content-center my-0">Utilisateurs</h1>
                            Ajouter un Utilisateurs
                            {{-- <ul class="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                                @php echo BreadCrumbsGeneratorHelper($breadcrumbs) @endphp
                            </ul> --}}
                        </div>
                    </div>
                </div>

                <div class="card-toolbar justify-content-end">
                    <a href="{{route('admin.admin-users.index')}}" class="btn btn-primary btn-sm mx-5">
                        <i class="fa fa-arrow-left"></i> Précédent
                    </a>
                </div>

            </div>

            <div class="card-body">

                <div class="d-flex flex-column flex-lg-row">
                    <div class="flex-lg-row-fluid me-0">
                        @if(checkRolePermission('Utilisateurs', 'modification'))
                        <form class="form" method="post" id="kt_modal_add_admin_user_form" action="{{ route('admin.admin-users.updateProcess') }}" enctype="multipart/form-data">
                        @endif
                            @csrf
                            <input type="hidden" name="admin_id" value="{{$admin->id}}" />
                            <div class="d-flex flex-center flex-column">
                                <div class="symbol symbol-100px symbol-circle">
                                    <div class="mb-7">
                                        <div class="mt-1">
                                            <div class="image-input image-input-outline" data-kt-image-input="true" style="background-image: url({{ asset('assets/media/avatars/blank.png') }})">
                                                @if ($admin->avatar)
                                                    <div class="image-input-wrapper w-125px h-125px" style="background-image: url('{{ asset('images/' . $admin->avatar) }}')"></div>
                                                @else
                                                    <div class="image-input-wrapper w-125px h-125px" style="background-image: url({{ asset('assets/media/avatars/blank.png') }})"></div>
                                                @endif

                                                <label class="btn btn-icon btn-circle btn-active-color-primary w-25px h-25px bg-body shadow" data-kt-image-input-action="change" data-bs-toggle="tooltip" title="Change avatar">
                                                    <i class="bi bi-pencil-fill fs-7"></i>
                                                    <input type="file" id="avatar_admin_user" name="photo" accept=".png, .jpg, .jpeg" />
                                                    <input type="hidden" name="avatar_remove" />
                                                </label>
                                                <span class="btn btn-icon btn-circle btn-active-color-primary w-25px h-25px bg-body shadow" data-kt-image-input-action="cancel" data-bs-toggle="tooltip" title="Cancel avatar">
                                                    <i class="bi bi-x fs-2"></i>
                                                </span>
                                            </div>
                                        </div>
                                        {{-- <div class="form-text">Allowed file types: png, jpg, jpeg.</div> --}}
                                    </div>
                                </div>
                            </div>
                            <!-- Two-column layout -->
                            <div class="row mb-5">


                                <div class="col-md-6 fv-row fv-plugins-icon-container">
                                    <label class="required fs-7 fw-bold mt-3">Nom Complet</label>
                                    <div class="fv-row">
                                        <input type="text" name="name" id="name" class="form-control" value="{{$admin->name}}">
                                    </div>
                                    @error('name')
                                    <div class="error">{{ $message }}</div>
                                    @enderror
                                </div>


                                <div class="col-md-6 fv-row fv-plugins-icon-container">
                                    <label class="required fs-7 fw-bold mt-3">Email</label>
                                    <div class="fv-row">
                                        <input type="email" name="email" id="email" class="form-control" value="{{$admin->email}}">
                                    </div>
                                    @error('email')
                                    <div class="error">{{ $message }}</div>
                                    @enderror
                                </div>

                                <div class="col-md-6 fv-row fv-plugins-icon-container">
                                    <label class="required fs-7 fw-bold mt-3">Mot de passe</label>
                                    <div class="fv-row">
                                        <input type="password" name="password" id="password" class="form-control" value="">
                                    </div>
                                    @error('password')
                                    <div class="error">{{ $message }}</div>
                                    @enderror
                                </div>

                                <div class="col-md-6 fv-row fv-plugins-icon-container">
                                    <label class="fs-7 fw-bold mt-3">Role</label>
                                    <div class="fv-row">
                                        <select name="role" data-control="select2" data-placeholder="Select/Search Role..."  id="Role" class="form-select">
                                            <option value="0" >Select/Search Role</option>
                                            @foreach($roles as $key => $role)
                                                <option value="{{$role->id}}" {{$role->id == $admin->role ? "selected": ""}}>{{$role->libelle}}</option>
                                            @endforeach
                                        </select>
                                    </div>
                                    @error('Role')
                                    <div class="error">{{ $message }}</div>
                                    @enderror
                                </div>

                            </div>

                            @if(checkRolePermission('Utilisateurs', 'modification'))
                            <div class="row mb-5">

                                <div class="col-md-6 fv-row fv-plugins-icon-container">
                                </div>
                                <div class="col-md-6 fv-row fv-plugins-icon-container">
                                    <label class="fs-5 fw-bold mb-2">&nbsp;</label>
                                    <div class="fv-row" style="text-align: right;">
                                        <button type="submit" class="btn btn-primary" id="kt_careers_submit_button">
                                            <span class="indicator-label"><i class="fa fa-save"></i> Enregistrer </span>
                                            <span class="indicator-progress">Please wait...
                                                <span class="spinner-border spinner-border-sm align-middle ms-2"></span>
                                            </span>
                                        </button>

                                    </div>
                                </div>
                            </div>
                            @endif

                        @if(checkRolePermission('Utilisateurs', 'modification'))
                        </form>
                        @endif
                    </div>
                </div>
            </div>

        </div>
    </div>
@endsection
@section('footer')@include('admin.layout.partials.footer')@endsection
@section('admin_script')
<script src="{{asset('admin_assets/js/custom/validation/jquery.validate.js')}}"></script>
<script>
$.validator.addMethod("alphanumeric", function(value, element) {
    return this.optional(element) || /^[a-zA-Z0-9]+$/.test(value);
}, "Please enter only letters and numbers.");

$("#kt_modal_add_admin_user_form").validate({
    rules: {
        name: {
            required: true
        },
        role: {
            required: true
        },
        email: {
            required: true
        },
    },
    messages: {
        name: {
            required: "nom de la page is required.",
        },
        role: {
            required: "role is required.",
        },
        email: {
            required: "email is required.",
        }
    }
});
</script>
@endsection
