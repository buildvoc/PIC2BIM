@extends('admin.layout.main-layout')
@section('header')@section('title', 'Immatriculation')@include('admin.layout.partials.header')@endsection
@section('aside')@include('admin.layout.partials.aside')@endsection
@section('breadcrumb_content')

@endsection
@section('content')
<div id="kt_content_container" class="container-xxl">

    @include('admin.common.onActionsAlerts')
    <div class="card mt-5">
            <?php
            if( isset($user_tasks) && $user_tasks != '' && $user_tasks != 'all' && $user_tasks > 0 ) {?>
                <h2 class="text-center m-5"><?php echo $user_details->name." ".$user_details->surname." Tasks"?></h2>
                <?php
            }
            ?>
            <div class="card-header border-0 d-flex justify-content-between p-0">
                <div id="kt_app_toolbar" class="app-toolbar py-3 py-lg-6">
                    <div id="kt_app_toolbar_container" class="app-container container-xxl d-flex flex-stack">
                        <div class="page-title d-flex flex-column justify-content-center flex-wrap me-3">
                            <h1 class="page-heading d-flex text-dark fw-bold fs-3 flex-column justify-content-center my-0">Tasks</h1>
                            Tasks Listing
                        </div>
                    </div>
                </div>
                <?php
                if( isset($user_tasks) && $user_tasks != '' && $user_tasks != 'all' && $user_tasks > 0 ) {?>
                    <div class="card-toolbar justify-content-end">
                        <a href="{{route("admin.tasks.create", ["id" => $user_details->id])}}" class="btn btn-primary fs-6 btn-sm mx-5">
                            <i class="fa fa-plus"></i> Add new Task
                        </a>
                    </div>
                    <?php
                }?>

            </div>

        <div class="card-body pt-0">
            {{-- <div class="row mb-5 mt-4">

                <div class="col-sm-2 mb-5 fv-row fv-plugins-icon-container">
                    <label class="fs-7 fw-bold mb-2 d-flex align-items-center">Date Debut</label>
                    <input type="text" name="start_date1" id="start_date1" value="" class="daterange-single form-control" placeholder="<?php //echo getDatePlaceholder();?>" autocomplete="off">
                    @error('start_date')
                        <div class="error">{{ $message }}</div>
                    @enderror
                </div>

                <div class="col-sm-2 mb-5 fv-row fv-plugins-icon-container">
                    <label class="fs-7 fw-bold mb-2 d-flex align-items-center">Date Fin</label>
                    <input type="text" name="end_date1" id="end_date1" value="" class="daterange-single form-control" placeholder="<?php //echo getDatePlaceholder();?>" autocomplete="off">
                    @error('end_date')
                        <div class="error">{{ $message }}</div>
                    @enderror
                </div>

                <div class="col mb-5 pt-5 fv-row fv-plugins-icon-container">
                    <button type="button" class="col btn btn-primary mt-3 px-3 fs-6 py-2" id="submit_button">
                        <span class="indicator-label"><i class="fas fa-sync"></i>Actualiser</span>
                        <span class="indicator-progress">Please wait...
                            <span class="spinner-border spinner-border-sm align-middle ms-2"></span>
                        </span>
                    </button>
                </div>

            </div> --}}


            <table class="table align-middle table-row-dashed fs-6 gy-5 custom-table" id="kt_table_users_list">
                <thead>
                    <tr class="text-start text-muted fw-bolder fs-7 text-uppercase gs-0">
                        <th>Status</th>
                        <th>Photo Taken</th>
                        <th>Verified</th>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Date Created</th>
                        <th>Due Date</th>
                        <th>Acceptation</th>
                        <th>Bulk Action</th>
                    </tr>
                </thead>
                <tbody class="text-gray-600 fw-bold"></tbody>
            </table>
        </div>
    </div>
</div>
@endsection
@section('footer')@include('admin.layout.partials.footer')@endsection
@section('admin_script')
<script src="{{asset('admin_assets/js/custom/validation/jquery.validate.js')}}"></script>
<script src="{{asset('admin_assets/plugins/custom/datatables/jquery.dataTables.min.js')}}"></script>
<script src="{{asset('admin_assets/plugins/custom/datatables/dataTables.bootstrap4.min.js')}}"></script>
<script src="{{asset('admin_assets/plugins/custom/datatables/dataTables.responsive.min.js')}}"></script>
<script src="{{asset('admin_assets/plugins/custom/datatables/dataTables.buttons.min.js')}}"></script>
<script>
    $('.btn-primary').click(function() {
        $(this).blur();
    });
</script>
<script>
    var table = "";
    var start_date = "";
    var end_date = "";

    $(function() {
        table = $('#kt_table_users_list').DataTable({
            processing: true,
            serverSide: true,
            responsive: true,
            ajax: {
                url: "{{ route('admin.tasks.listing') }}",
                data: function(d) {
                    d.start_date = $('#start_date1').val();
                    d.end_date = $('#end_date1').val();
                    d.user_id = "<?php echo $user_tasks;?>";
                }
            },
            columns: [
                {
                    data: 'status',
                    name: 'status',
                },
                {
                    data: 'photo_taken',
                    name: 'photo_taken',
                },
                {
                    data: 'verified',
                    name: 'verified',
                },
                {
                    data: 'name',
                    name: 'name',
                },
                {
                    data: 'description',
                    name: 'description',
                },
                {
                    data: 'date_created',
                    name: 'date_created',
                },
                {
                    data: 'due_date',
                    name: 'due_date',
                },
                {
                    data: 'acceptation',
                    name: 'acceptation',
                },
                {
                    data: 'Action',
                    name: 'Action',
                    searchable: false
                },
            ]
        });
    });

    $("#start_date1, #end_date1").flatpickr({
        maxDate: "today",
        time_24hr: true,
        dateFormat: "<?php echo getDatePlaceholder('for_js_dates');?>",
        allowInput: true
    });

    $(document).on("click",".delete_region",function() {
        let region_id = $(this).data("region-id");
        if( region_id && region_id != '' && region_id != undefined ) {
            Swal.fire({
                title: "Deactivation",
                text: "Are you sure you want to Deactivate this Task?",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, I am sure!',
                cancelButtonText: 'Cancel'
            }).then(function(result) {
                if (result.value) {
                    $.ajax({
                        url: "{{route('admin.tasks.delete')}}",
                        type: 'POST',
                        data: {'id':region_id},
                        success: function (data, status)
                        {
                            table.row($(this).parents('tr')).remove().draw(false);
                            Swal.fire({
                                title: "Success",
                                text: "Task has been deactivated.",
                                icon: "success",
                                buttonsStyling: false,
                                confirmButtonText: "Close",
                                customClass: {
                                    confirmButton: "btn btn-primary"
                                }
                            });
                        },
                        error: function (xhr, desc, err)
                        {
                            Swal.fire({
                                title: "Error",
                                text: "Error",
                                icon: "error",
                                buttonsStyling: false,
                                confirmButtonText: "Close",
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
        } else {
            Swal.fire({
                title: "Error",
                text: "Task does not have ID",
                icon: "error",
                confirmButtonText: "Close"
            });
        }
    });
</script>
@endsection

