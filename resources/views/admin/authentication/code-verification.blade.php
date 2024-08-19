@extends('admin.layout.auth-layout')
@section('title', 'Verification')
@section('content')
    <style type="text/css">
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
            -webkit-appearance: none;
        }
        input {
            text-align: center;
        }
        input[type='number'] {
            -moz-appearance:textfield; /* Firefox */
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
                <div class="w-lg-600px p-10 p-lg-15 mx-auto">
                    <!--begin::Form-->
                    <form class="form w-100 mb-10" novalidate="novalidate" id="kt_sing_in_two_steps_form">
                        <!--begin::Icon-->
                        <div class="text-center mb-10">
                            <img alt="Logo" class="mh-125px" src="{{asset('admin_assets/media/logos/logo.png')}}" />
                        </div>
                        <!--end::Icon-->
                        <!--begin::Heading-->
                        <div class="text-center mb-10">
                            <!--begin::Title-->
                            <h1 class="text-dark mb-3">Two Step Verification</h1>
                            <!--end::Title-->
                            <!--begin::Sub-title-->
                            <div class="text-muted fw-bold fs-5 mb-5">Enter the verification code we sent to</div>

                            @if (Session::has('success'))
                                <div class="alert alert-success">
                                    <a href="#" class="close" data-dismiss="alert">×</a>
                                    <strong></strong>  {{ Session::get('success') }} </div>
                                  @endif

                            <?php
                                $shortEmail = '';
                                $emailLenght = '';
                                $email = Session::get('email');
                                if($email) {
                                    $short = explode('@', $email);
                                    $shortEmail = substr($short[0],-3).'@'.$short[1];
                                    $emailLenght = strlen($short[0]);
                                } else {
                                    $shortEmail = '';
                                }
                            ?>
                            <!--end::Sub-title-->
                            <!--begin::Mobile no-->
                            @if($emailLenght == 3)
                                <div class="fw-bolder text-dark fs-3">{{$shortEmail}}</div>
                            @else
                                <div class="fw-bolder text-dark fs-3">*******{{$shortEmail}}</div>
                            @endif
                            <!--end::Mobile no-->
                        </div>
                        <!--end::Heading-->
                        <!--begin::Section-->
                        <div class="mb-10 px-md-12">
                            <!--begin::Label-->
                            <div class="fw-bolder text-start text-dark fs-6 mb-1 ms-1">Type your 4 digit security code</div>
                            <!--end::Label-->
                            <!--begin::Input group-->
                            <div class="d-flex flex-wrap flex-stack">
                                <input type="text" data-inputmask="'mask': '9', 'placeholder': ''" maxlength="1" class="form-control form-control-solid h-60px w-60px fs-2qx text-center border-primary border-hover mx-1 my-2" value="" oninput="javascript: if (this.value.length > this.maxLength) this.value = this.value.slice(0, this.maxLength);" />
                                <input type="text" data-inputmask="'mask': '9', 'placeholder': ''" maxlength="1" class="form-control form-control-solid h-60px w-60px fs-2qx text-center border-primary border-hover mx-1 my-2" value="" oninput="javascript: if (this.value.length > this.maxLength) this.value = this.value.slice(0, this.maxLength);" />
                                <input type="text" data-inputmask="'mask': '9', 'placeholder': ''" maxlength="1" class="form-control form-control-solid h-60px w-60px fs-2qx text-center border-primary border-hover mx-1 my-2" value="" oninput="javascript: if (this.value.length > this.maxLength) this.value = this.value.slice(0, this.maxLength);" />
                                <input type="text" data-inputmask="'mask': '9', 'placeholder': ''" maxlength="1" class="form-control form-control-solid h-60px w-60px fs-2qx text-center border-primary border-hover mx-1 my-2" value="" oninput="javascript: if (this.value.length > this.maxLength) this.value = this.value.slice(0, this.maxLength);" />
                            </div>
                            <!--begin::Input group-->
                        </div>
                        <!--end::Section-->
                        <!--begin::Submit-->
                        <div class="d-flex flex-center">
                            <button type="submit" id="kt_sing_in_two_steps_submit" class="btn btn-lg btn-primary fw-bolder">
                                <span class="indicator-label">Submit</span>
                                <span class="indicator-progress">Please wait...
                                        <span class="spinner-border spinner-border-sm align-middle ms-2"></span></span>
                            </button>
                        </div>
                        <!--end::Submit-->
                    </form>
                    <!--end::Form-->
                    <!--begin::Notice-->
                    <div class="text-center fw-bold fs-5">
                        <span class="text-muted me-1">Didn’t get the code ?</span>
                        <a href="{{route('admin.resend.code')}}" class="link-primary fw-bolder fs-5 me-1">Resend</a>
                    </div>
                    <!--end::Notice-->
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
<script src="{{asset('admin_assets/js/custom/authentication/sign-in/two-steps.js')}}"></script>

<script>
    $('.btn-primary').click(function() {
      $(this).blur();
    });
    
    ins = document.querySelectorAll('input[type="text"]');
    ins.forEach(function(input) {
        input.addEventListener('keyup', function(e) {
            if (e.keyCode === 16 || e.keyCode === 9 || e.keyCode === 224 || e.keyCode === 18 || e.keyCode === 17) {
                return;
            }
            if ((e.keyCode === 8 || e.keyCode === 37) && this.previousElementSibling && this.previousElementSibling.tagName === "INPUT") {
                this.previousElementSibling.select();
            } else if (e.keyCode !== 8 && this.nextElementSibling) {
                if (this.value !== '') {
                    this.nextElementSibling.select();
                }
            }
        });

        input.addEventListener('touchstart', function(e) {
            if (this.value !== '') {
                this.select();
            }
        });
    });

</script>
@endsection
