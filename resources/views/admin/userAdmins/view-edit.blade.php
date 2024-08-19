@extends('admin.layout.main-layout')
@section('header')@section('title', 'Admin Users')@include('admin.layout.partials.header')@endsection
@section('aside')@include('admin.layout.partials.aside')@endsection

@section('content')
    <div id="kt_content_container" class="container-xxl">
        
        <!--begin::Layout-->
        <div class="container">
            <!--begin::Sidebar-->
            <div class="row">
                <!--begin::Card-->
                <div class="card mb-5 mb-xl-8">
                    <div class="card-header border-0 d-flex justify-content-between p-0">
                        <div id="kt_app_toolbar" class="app-toolbar py-3 py-lg-6">
                            <div id="kt_app_toolbar_container" class="app-container container-xxl d-flex flex-stack">
                                <div class="page-title d-flex flex-column justify-content-center flex-wrap me-3">
                                    <h1 class="page-heading d-flex text-dark fw-bold fs-3 flex-column justify-content-center my-0">Profile</h1>
                                    Update Profile
                                    {{-- <ul class="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                                        @php echo BreadCrumbsGeneratorHelper($breadcrumbs) @endphp
                                    </ul> --}}
                                </div>
                            </div>
                        </div>
                        
                        <div class="card-toolbar justify-content-end">
                            <a href="{{route('admin.users.create')}}" class="btn btn-primary fs-6 btn-sm mx-5">
                                <i class="fa fa-plus"></i> Ajouter un Immatriculation
                            </a>
                        </div>
        
                    </div>
                    
                    <!--begin::Card body-->
                    <div class="card-body">
                        
                        
                        <form id="kt_modal_update_user_form" class="form" method="post" enctype="multipart/form-data">
                            
                            <div class="d-flex flex-center flex-column">
                                <!--begin::Avatar-->
                                <div class="symbol symbol-100px symbol-circle">
                                    
                                    <div class="mb-7">
                                        <div class="mt-1">
                                            <!--begin::Image input-->
                                            <div class="image-input image-input-outline" data-kt-image-input="true" style="background-image: url({{ asset('assets/media/avatars/blank.png') }})">
                                                <!--begin::Preview existing avatar-->
                                                @if ($user->avatar)
                                                    <div class="image-input-wrapper w-125px h-125px" style="background-image: url('{{ asset('images/' . $user->avatar) }}')"></div>
                                                @else
                                                    <div class="image-input-wrapper w-125px h-125px" style="background-image: url({{ asset('assets/media/avatars/blank.png') }})"></div>
                                                @endif

                                                <label class="btn btn-icon btn-circle btn-active-color-primary w-25px h-25px bg-body shadow" data-kt-image-input-action="change" data-bs-toggle="tooltip" title="Change avatar">
                                                    <i class="bi bi-pencil-fill fs-7"></i>
                                                    <!--begin::Inputs-->
                                                    <input type="file" id="avatar_admin_user" name="avatar" accept=".png, .jpg, .jpeg" />
                                                    <input type="hidden" name="avatar_remove" />
                                                    <!--end::Inputs-->
                                                </label>
                                                <!--end::Edit-->
                                                <!--begin::Cancel-->
                                                <span class="btn btn-icon btn-circle btn-active-color-primary w-25px h-25px bg-body shadow" data-kt-image-input-action="cancel" data-bs-toggle="tooltip" title="Cancel avatar">
                                                    <i class="bi bi-x fs-2"></i>
                                                </span>
                                                <!--end::Cancel-->
                                                <!--begin::Remove-->
                                                <span class="btn btn-icon btn-circle btn-active-color-primary w-25px h-25px bg-body shadow" data-kt-image-input-action="remove" data-bs-toggle="tooltip" title="Remove avatar">
                                                    <i class="bi bi-x fs-2"></i>
                                                </span>
                                                <!--end::Remove-->
                                            </div>
                                            <!--end::Image input-->
                                        </div>
                                        {{-- <div class="form-text">Allowed file types: png, jpg, jpeg.</div> --}}
                                        {{-- <div class="form-text">Image dimension: 250 pixels by 250 pixels</div> --}}
                                        <!--end::Image input wrapper-->
                                    </div>
                                </div>
                            </div>

                            <div id="kt_user_view_details" class="collapse show">
                                <div class="pb-5 fs-6">
                                    
                                        <input type="hidden" id="user_id" name="id" value="{{ $user->id }}" />
                                    
                                        <div class="fv-row mb-7">
                                            <!--begin::Label-->
                                            <label class="required fs-6 fw-bold mb-2">Name</label>
                                            <!--end::Label-->
                                            <!--begin::Input-->
                                            <input type="text" class="form-control" placeholder="" id="name" name="name" value="{{ $user->name }}" />
                                            <!--end::Input-->
                                        </div>
                                        @error('name')
                                            <div class="error">{{ $message }}</div>
                                        @enderror

                                        <div class="fv-row mb-7">
                                            <!--begin::Label-->
                                            <label class="required fs-6 fw-bold mb-2">Email</label>
                                            <!--end::Label-->
                                            <!--begin::Input-->
                                            <input type="text" class="form-control form-control-solid text-muted" placeholder="" id="email" name="email" value="{{$user->email}}" readonly />
                                            <!--end::Input-->
                                        </div>
                                        @error('email')
                                                <div class="error">{{ $message }}</div>
                                        @enderror   

                                        <div class="fv-row mb-7">
                                            <!--begin::Label-->
                                            <label class="required fs-6 fw-bold mb-2">Password</label>
                                            <!--end::Label-->
                                            <!--begin::Input-->
                                            <input type="password" class="form-control form-control-solid text-muted" placeholder="" name="password" value="" />
                                            <!--end::Input-->
                                        </div>
                                        @error('email')
                                                <div class="error">{{ $message }}</div>
                                        @enderror

                                        <div class="fv-row mb-7">
                                            <!--begin::Label-->
                                            <label class="required  fs-6 fw-bold mb-2">Phone</label>
                                            <input type="text" id="phone" name="phone" class="form-control" oninput="this.value = this.value.replace(/[^0-9]/g, '');" minlength="8" maxlength="14" value="{{ (int)$user->phone }}" />
                                            @error('phone')
                                                <div class="error">{{ $message }}</div>
                                            @enderror
                                            <!--end::Input-->
                                        </div>

                                        <!--begin::Modal footer-->
                                        <div class="modal-footer flex-center">
                                            <button type="submit" class="btn btn-primary" data-kt-users-modal-action="submit">
                                                <span class="indicator-label">Submit</span>
                                                <span class="indicator-progress">Please wait...
                                                    <span class="spinner-border spinner-border-sm align-middle ms-2"></span></span>
                                            </button>
                                            <!--end::Button-->
                                        </div>
                                        <!--end::Modal footer-->
                                    

                                </div>
                            </div>
                            <!--end::Details content-->
                        </form>

                    </div>
                    <!--end::Card body-->
                </div>
                <!--end::Card-->

            </div>
        </div>
    

        <div class="modal fade" id="kt_modal_update_details" tabindex="-1" aria-hidden="true">
            <!--begin::Modal dialog-->
            <div class="modal-dialog modal-dialog-centered mw-650px">
                <!--begin::Modal content-->
                <div class="modal-content">
                    <!--begin::Form-->
                        <!--begin::Modal header-->
                        <div class="modal-header" id="kt_modal_update_user_header">
                            <!--begin::Modal title-->
                            <h2 class="fw-bolder">Update User Details</h2>
                            <!--end::Modal title-->
                            <!--begin::Close-->
                            <div class="btn btn-icon btn-sm btn-active-icon-primary" data-bs-dismiss="modal">
                                <!--begin::Svg Icon | path: icons/duotune/arrows/arr061.svg-->
                                <span class="svg-icon svg-icon-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <rect opacity="0.5" x="6" y="17.3137" width="16" height="2" rx="1" transform="rotate(-45 6 17.3137)" fill="black" />
                                        <rect x="7.41422" y="6" width="16" height="2" rx="1" transform="rotate(45 7.41422 6)" fill="black" />
                                    </svg>
                                </span>
                                <!--end::Svg Icon-->
                            </div>
                            <!--end::Close-->
                        </div>
                        <!--end::Modal header-->
                        <!--begin::Modal body-->
                        <div class="modal-body py-10 px-lg-17">
                            <!--begin::Scroll-->
                            <div class="d-flex flex-column scroll-y me-n7 pe-7" id="kt_modal_update_user_scroll" data-kt-scroll="true" data-kt-scroll-activate="{default: false, lg: true}" data-kt-scroll-max-height="auto" data-kt-scroll-dependencies="#kt_modal_update_user_header" data-kt-scroll-wrappers="#kt_modal_update_user_scroll" data-kt-scroll-offset="300px">
                                <!--begin::User toggle-->
                                <div class="fw-boldest fs-3 rotate collapsible mb-7" data-bs-toggle="collapse" href="#kt_modal_update_user_user_info" role="button" aria-expanded="false" aria-controls="kt_modal_update_user_user_info">User Information
                                    <span class="ms-2 rotate-180">
                                        <!--begin::Svg Icon | path: icons/duotune/arrows/arr072.svg-->
                                        <span class="svg-icon svg-icon-3">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                                <path d="M11.4343 12.7344L7.25 8.55005C6.83579 8.13583 6.16421 8.13584 5.75 8.55005C5.33579 8.96426 5.33579 9.63583 5.75 10.05L11.2929 15.5929C11.6834 15.9835 12.3166 15.9835 12.7071 15.5929L18.25 10.05C18.6642 9.63584 18.6642 8.96426 18.25 8.55005C17.8358 8.13584 17.1642 8.13584 16.75 8.55005L12.5657 12.7344C12.2533 13.0468 11.7467 13.0468 11.4343 12.7344Z" fill="black" />
                                            </svg>
                                        </span>
                                        <!--end::Svg Icon-->
                                    </span>
                                </div>
                                <!--end::User toggle-->
                                <!--begin::User form-->
                                <div id="kt_modal_update_user_user_info" class="collapse show">
                                    

                                    <!--end::Input group-->
                                </div>
                                <!--end::User form-->
                            </div>
                            <!--end::Scroll-->
                        </div>
                        <!--end::Modal body-->
                        
                    </form>
                    <!--end::Form-->
                </div>
            </div>
        </div>

    </div>
@endsection
@section('footer')@include('admin.layout.partials.footer')@endsection
@section('admin_script')

    <script src="{{ asset('admin_assets/js/custom/validation/jquery.validate.js') }}"></script>
    <script src="{{ asset('admin_assets/plugins/custom/datatables/jquery.dataTables.min.js') }}"></script>
    <script src="{{ asset('admin_assets/plugins/custom/datatables/dataTables.bootstrap4.min.js') }}"></script>
    <script src="{{ asset('admin_assets/plugins/custom/datatables/dataTables.responsive.min.js') }}"></script>
    <script src="{{ asset('admin_assets/plugins/custom/datatables/dataTables.buttons.min.js') }}"></script>

    <script type="text/javascript">
        $('.btn-primary').click(function() {
            $(this).blur();
        });

        $("#kt_modal_update_user_form").validate({
            rules: {
                name: {
                    required: true,
                },
                country_code: {
                    required: true,
                },
                phone: {
                    required: true,
                    minlength: 8,
                    maxlength: 14,
                    digits: true
                }

            },
            messages: {
                name: {
                    required: "Name is required",
                },
                country_code: {
                    required: "Country Code is required",
                },
                phone: {
                    required: "Phone number is required",
                    minlength: "Phone number must be at least 8 digits long",
                    maxlength: "Phone number cannot exceed 14 digits",
                    digits: "Please enter only digits for the phone number"
                }
            }
        });
        $('#kt_modal_update_user_form').submit(function(e) {
            e.preventDefault();

            if ($(this).valid()) {

                $.ajax({
                    url: "{{ route('admin.user-list-admin.update.admin.user') }}",
                    type: 'POST',
                    data: new FormData(this),
                    processData: false,
                    contentType: false,
                    success: function(data, status) {
                        console.log(data);
                        var responseData = JSON.parse(JSON.stringify(data));
                        Swal.fire({
                                text: responseData.message,
                                icon: "success",
                                buttonsStyling: false,
                                confirmButtonText: "Okay, got it!",
                                customClass: {
                                    confirmButton: "btn btn-primary"
                                }
                            })
                            .then((isConfirm) => {
                                if (isConfirm.value) {
                                    window.location.reload(true);
                                }
                            });
                    },
                    error: function(xhr, desc, err) {
                        var responseData = JSON.parse(JSON.stringify(data));
                        Swal.fire({
                            text: responseData.message,
                            icon: "error",
                            buttonsStyling: false,
                            confirmButtonText: "Okay, got it!",
                            customClass: {
                                confirmButton: "btn btn-primary"
                            }
                        }).then((isConfirm) => {
                            if (isConfirm.value) {
                                window.location.reload(true);
                            }
                        });

                    }
                });
            }
        });
    </script>
@endsection
