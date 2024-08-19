<!DOCTYPE html>
<html lang="en">
	<!--begin::Head-->
	<head>
		<title><?php echo config('global_items.project_name');?> - @yield('title')</title>
		<meta charset="utf-8" />
		<meta name="description" content="<?php echo config('global_items.project_name');?>" />
		<meta name="keywords" content="<?php echo config('global_items.project_name');?>" />
		<meta name="csrf-token" content="{{ csrf_token() }}" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<link rel="shortcut icon" href="{{url('admin_assets/media/logos/favicon.ico')}}" />
		<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Inter:300,400,500,600,700" />
		<link href="{{url('admin_assets/plugins/global/plugins.bundle.css')}}" rel="stylesheet" type="text/css" />
		<link href="{{url('admin_assets/css/style.bundle.css')}}" rel="stylesheet" type="text/css" />
		<!-- Google Captcha -->
		<script>
			let baseURL = "{{asset('/')}}";
		</script>
    <!--begin::Fonts-->
	</head>
	<!--end::Head-->
	<!--begin::Body-->
	<body id="kt_body" class="app-blank bgi-size-cover bgi-position-center bgi-no-repeat">
        @yield('content')
	</body>
	<!--end::Body-->

    <script src="{{url('admin_assets/plugins/global/plugins.bundle.js')}}"></script>
    <script src="{{url('admin_assets/js/scripts.bundle.js')}}"></script>
	<script>
    $.ajaxSetup({
			headers: {
				'X-CSRF-TOKEN': jQuery('meta[name="csrf-token"]').attr('content')
			}
		});
	</script>
	@yield('script')
    <!--end::Javascript-->
</html>
