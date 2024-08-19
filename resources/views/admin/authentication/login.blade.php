@extends('admin.layout.auth-layout')
@section('title', 'Login')
@section('content')
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" rel="stylesheet">

<style>
    .password-container {
        position: relative;
    }
    .password-container .toggle-password {
        position: absolute;
        top: 50%;
        right: 40px;
        transform: translateY(-50%);
        cursor: pointer;
        z-index: 1;
    }
    .password-container .toggle-password i {
        font-size: 16px;
        color: #333;
    }
</style>
<div class="d-flex flex-column flex-root">
    <!--begin::Authentication - Sign-in -->
    <div class="d-flex flex-column flex-lg-row flex-column-fluid">
        <!--begin::Aside-->
        <!--end::Aside-->
        <!--begin::Body-->
        <div class="d-flex flex-column flex-lg-row-fluid py-10">
            <!--begin::Content-->
            <div class="d-flex flex-center flex-column flex-column-fluid">
                <!--begin::Wrapper-->
                <div class="w-lg-500px p-10 mx-auto">
                    <!--begin::Form-->
                    <form class="form w-100" novalidate="novalidate" name="g-v3-recaptcha-login"  id="kt_sign_in_form" method="post" action="{{route('admin.code.verification')}}">
                        @csrf
                        <div class="text-center mb-0">
                            <div class="text-center mb-10">
                                <img alt="Logo" class="mh-125px" src="{{asset('admin_assets/media/logos/logo.svg')}}" />
                            </div>
                            <!--begin::Title-->
                            <h1 class="text-dark mb-3"></h1>
                                 @if (Session::has('success'))
                                <div class="alert alert-success">
                                    <a href="#" class="close" data-dismiss="alert">×</a>
                                    <strong></strong>  {{ Session::get('success') }} </div>
                                  @endif
                        </div>
                        <!--begin::Heading-->
                        <!--begin::Input group-->
                        <div class="fv-row mb-5">
                            <input class="form-control form-control-lg form-control-solid" type="text" id="email" name="email" placeholder="Enter Username" autocomplete="off" value="{{old('email')}}" />
                        </div>
                            @error('email')
                            <div class="error">{{ $message }}</div>
                            @enderror

                        <div class="fv-row mb-5 ">

                            <div class="password-container">
                                <input class="form-control form-control-lg form-control-solid" type="password" id="password" name="password" autocomplete="off" placeholder="Password"/>
                                <span class="toggle-password" id="togglePassword">
                                    <i class="fas fa-eye"></i>
                                </span>
                            </div>
                        </div>
                            @error('password')
                            <div class="error">{{ $message }}</div>
                            @enderror


                        <!--begin::Actions-->
                        <div class="text-center">
                            <!--begin::Submit button-->
                            
                            <button type="submit"  id="kt_sign_in_submit" class="btn btn-lg btn-primary w-100 mb-5 fs-8">
                                <span>Login</span>
                            </button>

                            @if (Session::has('error'))
                                <div class="alert alert-danger">
                                    <a href="#" class="close" data-dismiss="alert">×</a>
                                    <strong></strong>  {{ Session::get('error') }} </div>
                            @endif


                        </div>
                        <!--end::Actions-->
                    </form>
                    <!--end::Form-->
                </div>
                <!--end::Wrapper-->
            </div>
            <!--end::Content-->
        </div>
        <!--end::Body-->
    </div>
    <!--end::Authentication - Sign-in-->
</div>
@endsection

@section('script')
    {{-- <script src="https://www.google.com/recaptcha/api.js"></script> --}}
    <script src="{{asset('admin_assets/js/custom/authentication/sign-in/general.js')}}"></script>
    <script>
        $('.btn-primary').click(function() {
            $(this).blur();
        });
    </script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/js/all.min.js"></script>
    <script>
        document.addEventListener("DOMContentLoaded", function() {
            const passwordInput = document.getElementById("password");
            const togglePassword = document.getElementById("togglePassword");

            togglePassword.addEventListener("click", function() {
                if (passwordInput.type === "password") {
                    passwordInput.type = "text";
                    togglePassword.querySelector("i").classList.remove("fa-eye");
                    togglePassword.querySelector("i").classList.add("fa-eye-slash");
                } else {
                    passwordInput.type = "password";
                    togglePassword.querySelector("i").classList.remove("fa-eye-slash");
                    togglePassword.querySelector("i").classList.add("fa-eye");
                }
            });
        });
    </script>
@endsection
