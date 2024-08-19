@extends('admin.layout.auth-layout')
@section('title', 'Login')
@section('content')
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" rel="stylesheet">

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
                <div class="w-lg-500px mx-auto">
                    <!--begin::Form-->
                    <form class="form w-100"  id="kt_modal_add_user_form" method="post" action="{{route('admin.new.user.add')}}" enctype="multipart/form-data">
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
                        <div class="row mb-5">


                            <div class="col-md-6 fv-row fv-plugins-icon-container">
                                <label class="fs-7 fw-bold mt-3">Nom (s)</label>
                                <div class="fv-row">
                                    <input type="text" name="nom" id="nom" class="form-control" value="">
                                </div>
                                @error('nom')
                                <div class="error">{{ $message }}</div>
                                @enderror
                            </div>

                            <div class="col-md-6 fv-row fv-plugins-icon-container">
                                <label class="fs-7 fw-bold mt-3">Prénom (s)</label>
                                <div class="fv-row">
                                    <input type="text" name="prenom" id="prenom" class="form-control" value="">
                                </div>
                                @error('prenom')
                                <div class="error">{{ $message }}</div>
                                @enderror
                            </div>


                            <div class="col-md-6 fv-row fv-plugins-icon-container">
                                <label class="fs-7 fw-bold mt-3">Sexe</label>
                                <div class="fv-row">
                                    <select name="sexe" data-control="select2" data-placeholder="Select/Search Sexe..."  id="sexe" class="form-select">
                                        <option value="0">Homme</option>
                                        <option value="1">Femme</option>
                                    </select>
                                </div>
                                @error('sexe')
                                <div class="error">{{ $message }}</div>
                                @enderror
                            </div>


                            <div class="col-md-6 fv-row fv-plugins-icon-container">
                                <label class="fs-7 fw-bold mt-3">Profession</label>
                                <div class="fv-row">
                                    <input type="text" name="profession" id="profession" class="form-control" value="">
                                </div>
                                @error('profession')
                                <div class="error">{{ $message }}</div>
                                @enderror
                            </div>

                            <div class="col-md-6 fv-row fv-plugins-icon-container">
                                <label class="fs-7 fw-bold mt-3">Situation Familiale</label>
                                <div class="fv-row">
                                    <select name="situationfamiliale" data-control="select2" data-placeholder="Select/Search Situation Familiale..."  id="situationfamiliale" class="form-select">
                                        <option value="Célibataire">Célibataire</option>
                                        <option value="Marié(e)">Marié(e)</option>
                                        <option value="Concubinage">Concubinage</option>
                                        <option value="Veuf (ve)">Veuf (ve)</option>
                                        <option value="Divorcé(e)">Divorcé(e)</option>
                                        <option value="Union Libre">Union Libre</option>
                                    </select>
                                </div>
                                @error('situationfamiliale')
                                <div class="error">{{ $message }}</div>
                                @enderror
                            </div>

                            {{-- <div class="col-md-6 fv-row fv-plugins-icon-container">
                                <label class="fs-7 fw-bold mt-3">Photo</label>
                                <div class="fv-row">
                                    <input type="file" name="photo" id="photo" class="form-control" value="">
                                </div>
                                @error('photo')
                                <div class="error">{{ $message }}</div>
                                @enderror
                            </div> --}}
                            <div class="col-md-6 fv-row fv-plugins-icon-container">
                                <label class="fs-7 fw-bold mt-3">Phone</label>
                                <div class="fv-row">
                                    <input type="text" name="phone" id="phone" class="form-control" value="">
                                </div>
                                @error('phone')
                                <div class="error">{{ $message }}</div>
                                @enderror
                            </div>

                        </div>

                        <!--begin::Actions-->
                        <div class="text-center">
                            <!--begin::Submit button-->

                            <button type="submit" id="kt_sign_in_submit" class="btn btn-lg btn-primary w-100 mb-5 fs-8">
                                <span>Envoyer</span>
                            </button>

                            <div class="row">
                                <div class="col-md-12">
                                    <a type="submit" href="{{route('admin.login.page')}}" id="kt_sign_in_submit" class="w-100 mb-5 fs-8 text-right">
                                        Retour à la page de connexion
                                    </a>
                                </div>

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
    {{-- <script src="{{asset('admin_assets/js/custom/authentication/sign-in/general.js')}}"></script> --}}
    <script src="{{asset('admin_assets/js/custom/validation/jquery.validate.js')}}"></script>
    <script>
        $('.btn-primary').click(function() {
            $(this).blur();
        });
    </script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/js/all.min.js"></script>
    <script>
        $.validator.addMethod("alphanumeric", function(value, element) {
            return this.optional(element) || /^[a-zA-Z0-9]+$/.test(value);
        }, "Please enter only letters and numbers.");

        $("#kt_modal_add_user_form").validate({
            rules: {
                nom: {
                    required: true
                },
                prenom: {
                    required: true
                },
                sexe: {
                    required: true
                },
                situationfamiliale: {
                    required: true
                },
                profession: {
                    required: true
                },
                phone: {
                    required: true
                },
            },
            messages: {
                nom: {
                    required: "nom is required.",
                },
                prenom: {
                    required: "prenom is required.",
                },
                sexe: {
                    required: "sexe is required.",
                },
                situationfamiliale: {
                    required: "situationfamiliale is required.",
                },
                profession: {
                    required: "profession is required.",
                },
                phone: {
                    required: "profession is required.",
                },
            }
        });
    </script>
@endsection
