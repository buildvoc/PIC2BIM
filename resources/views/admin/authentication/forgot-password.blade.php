@extends('admin.layout.auth-layout')
@section('title', 'Forgot Password')
@section('content')
	<div class="d-flex flex-column flex-root">
		<!--begin::Authentication - Sign-in -->
		<div class="d-flex flex-column flex-lg-row flex-column-fluid">
			<!--begin::Body-->
			<div class="d-flex flex-column flex-lg-row-fluid py-10">
				<!--begin::Content-->
				<div class="d-flex flex-center flex-column flex-column-fluid">
					<!--begin::Wrapper-->
					<div class="w-lg-500px p-10 p-lg-15 mx-auto">
						<!--begin::Form-->
						<form class="form w-100"   method="POST" id="kt_forgot_in_form" action="{{route('admin.forgot.password.implement')}}">
							@csrf
							<!--begin::Heading-->
							<div class="text-center mb-10">
								<div class="text-center mb-10">
									<img alt="Logo" class="mh-125px" src="{{asset('admin_assets/media/logos/logo.png')}}" />
								</div>
								<!--begin::Title-->
								<h1 class="text-dark mb-3">Forgot Password ?</h1>
								<!--end::Title-->
								<!--begin::Link-->
								<div class="text-gray-400 fw-bold fs-4">Enter your email to reset your password.</div>
									@if (Session::has('success'))
							<div class="alert alert-success">
								<a href="#" class="close" data-dismiss="alert">×</a>
								<strong></strong>  {{ Session::get('success') }} </div>
								@endif
								<!--end::Link-->
							</div>
							<!--begin::Heading-->
							<!--begin::Input group-->
								@if (Session::has('error'))
							<div class="alert alert-danger">
								<a href="#" class="close" data-dismiss="alert">×</a>
								<strong></strong>  {{ Session::get('error') }} </div>
								@endif
							<div class="fv-row mb-10">
								<label class="form-label fw-bolder text-gray-900 fs-6">Email</label>
								<input class="form-control form-control-solid" type="email" placeholder="Email" name="email" autocomplete="off" />
									@error('email')
									<div class="error">{{ $message }}</div>
								@enderror
							</div>

							<!--end::Input group-->
							<!--begin::Actions-->
							<div class="d-flex flex-wrap justify-content-center pb-lg-0">
								<button type="submit" id="kt_forgot_in_submit" class="btn btn-lg btn-primary fw-bolder me-4">
									<span class="indicator-label">Submit</span>
									<span class="indicator-progress">Please wait...
									<span class="spinner-border spinner-border-sm align-middle ms-2"></span></span>
								</button>
								<a href="{{route('admin.login.page')}}" class="btn btn-lg btn-light-primary fw-bolder">Cancel</a>
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
<script src="{{asset('assets/js/custom/authentication/forgot-password-in/general.js')}}"></script>
@endsection