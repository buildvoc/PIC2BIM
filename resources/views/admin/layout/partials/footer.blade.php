                </div>
				<!--end::Wrapper-->
			</div>
			<!--end::Page-->
		</div>
	
		<!--begin::Javascript-->
		<!--begin::Global Javascript Bundle(mandatory for all pages)-->
		<script src="{{asset('admin_assets/plugins/global/plugins.bundle.js')}}"></script>
		{{-- <script src="http://ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script> --}}
		<script src="{{asset('admin_assets/js/scripts.bundle.js')}}"></script>
		<!--end::Global Javascript Bundle-->
		<!--begin::Vendors Javascript(used for this page only)-->
		<script src="{{asset('admin_assets/plugins/custom/fslightbox/fslightbox.bundle.js')}}"></script>
		<script src="{{asset('admin_assets/plugins/custom/typedjs/typedjs.bundle.js')}}"></script>
		<script src="https://cdn.amcharts.com/lib/5/index.js"></script>
		<script src="https://cdn.amcharts.com/lib/5/xy.js"></script>
		<script src="https://cdn.amcharts.com/lib/5/percent.js"></script>
		<script src="https://cdn.amcharts.com/lib/5/radar.js"></script>
		<script src="https://cdn.amcharts.com/lib/5/themes/Animated.js"></script>
		<script src="{{asset('admin_assets/plugins/custom/datatables/datatables.bundle.js')}}"></script>
		<!--end::Vendors Javascript-->
		<!--begin::Custom Javascript(used for this page only)-->
		<script src="{{asset('admin_assets/js/widgets.bundle.js')}}"></script>
		<script src="{{asset('admin_assets/js/custom/widgets.js')}}"></script>
		<script src="{{asset('admin_assets/js/custom/apps/chat/chat.js')}}"></script>
		<script src="{{asset('admin_assets/js/custom/utilities/modals/upgrade-plan.js')}}"></script>
		<script src="{{asset('admin_assets/js/custom/utilities/modals/create-project/type.js')}}"></script>
		<script src="{{asset('admin_assets/js/custom/utilities/modals/create-project/budget.js')}}"></script>
		<script src="{{asset('admin_assets/js/custom/utilities/modals/create-project/settings.js')}}"></script>
		<script src="{{asset('admin_assets/js/custom/utilities/modals/create-project/team.js')}}"></script>
		<script src="{{asset('admin_assets/js/custom/utilities/modals/create-project/targets.js')}}"></script>
		<script src="{{asset('admin_assets/js/custom/utilities/modals/create-project/files.js')}}"></script>
		<script src="{{asset('admin_assets/js/custom/utilities/modals/create-project/complete.js')}}"></script>
		<script src="{{asset('admin_assets/js/custom/utilities/modals/create-project/main.js')}}"></script>
		<script src="{{asset('admin_assets/js/custom/utilities/modals/create-campaign.js')}}"></script>
		<script src="{{asset('admin_assets/js/custom/utilities/modals/bidding.js')}}"></script>
		<script src="{{asset('admin_assets/js/custom/utilities/modals/users-search.js')}}"></script>
		<script src="{{asset('admin_assets/js/custom/utilities/modals/create-app.js')}}"></script>
		<script src="{{asset('admin_assets/js/custom/custom.js')}}"></script>
		<script>
			$.ajaxSetup({
				headers: {
					'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
				}
			});
		</script>
		<!--end::Custom Javascript-->
		<!--end::Javascript-->
	</body>
	<!--end::Body-->
</html>