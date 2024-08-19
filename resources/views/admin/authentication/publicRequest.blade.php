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
                    <form class="form w-100" method="post" action="{{route('admin.demandes.createProcess')}}">
                        @csrf
                        <div class="text-center mb-0">
                            <div class="text-center mb-5">
                                <img alt="Logo" class="mh-125px" src="{{asset('admin_assets/media/logos/logo.png')}}" />
                            </div>
                            <!--begin::Title-->
                            <h1 class="text-dark mb-3">DEMANDE DE DOCUMENTS</h1>
                                 @if (Session::has('success'))
                                <div class="alert alert-success">
                                    <a href="#" class="close" data-dismiss="alert">×</a>
                                    <strong></strong>  {{ Session::get('success') }} </div>
                                  @endif
                            <!--end::Title-->
                            <!--begin::Link-->
                            <!-- <div class="text-gray-400 fw-bold fs-4">New Here?
                            <a href="../../demo1/ dist/authentication/flows/aside/sign-up.html" class="link-primary fw-bolder">Create an Account</a></div> -->
                            <!--end::Link-->
                        </div>
                        <!--begin::Heading-->
                        <!--begin::Input group-->
                        <div class="fv-row mb-5">
                            {{-- <label class="form-label fs-6 fw-bolder text-dark">Email</label> --}}
                            <input class="form-control form-control-lg" type="text"  name="refrence" placeholder="Entrer votre Numero d'identification" autocomplete="off" value="{{old('refrence')}}" />
                        </div>
                        @error('refrence')
                        <div class="error">{{ $message }}</div>
                        @enderror

                        <div class="fv-row mb-5">
                            <select name="serviceID" data-control="select2" data-placeholder="Select/Search Service..."  id="Role" class="form-select">
                                @foreach ($services as $service)
                                    <option value="{{$service->id}}">{{$service->designation}}</option>
                                @endforeach
                            </select>
                        </div>
                        @error('serviceID')
                        <div class="error">{{ $message }}</div>
                        @enderror

                        <div class="fv-row mb-5">
                            {{-- <label class="form-label fs-6 fw-bolder text-dark">Email</label> --}}
                            <input class="form-control form-control-lg" type="text" name="motif" placeholder="Motif" autocomplete="off" value="{{old('motif')}}" />
                        </div>
                        @error('motif')
                        <div class="error">{{ $message }}</div>
                        @enderror

                        <button type="submit" class="btn btn-lg btn-primary w-100 mb-5 fs-8">
                            <span>Envoyer</span>
                        </button>
                        <!--begin::Actions-->
                        <div class="text-center">
                            <!--begin::Submit button-->




                            @if (Session::has('error'))
                                <div class="alert alert-danger">
                                    <a href="#" class="close" data-dismiss="alert">×</a>
                                    <strong></strong>  {{ Session::get('error') }} </div>
                            @endif


                        </div>
                        <!--end::Actions-->
                    </form>
                    <div class="text-center">
                        <div class="col-md-12">
                            <a href="{{route('admin.login.page')}}" class="w-100 mb-5 fs-8 text-right">
                                Retour à la page de connexion
                            </a>
                        </div>
                    </div>
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
    {{-- <script src="{{asset('admin_assets/js/custom/general.js')}}"></script> --}}
    <script>
        $('.btn-primary').click(function() {
            $(this).blur();
        });
    </script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/js/all.min.js"></script>
    <script>

    </script>
@endsection
