<div class="d-flex flex-column flex-lg-row">
    <div class="flex-lg-row-fluid me-0">
        <div class="card mb-5 mb-xl-10">   
            <div class="card-body pt-9 pb-0">

                <div class="d-flex flex-wrap flex-sm-nowrap mb-3">
                    <div class="me-7 mb-4">
                        <div class="symbol symbol-100px symbol-lg-160px symbol-fixed position-relative profileX">
                        <?php
                        $first_image_of_case = "";
                        $data_OBJ = $caseDetails->data;
                        if($data_OBJ != '') {
                            $media_data = (Array)json_decode($data_OBJ);   
                            if( isset($media_data['case_images']) && $media_data['case_images'] != '' && count($media_data['case_images']) > 0 ) {
                                foreach ($media_data['case_images'] as $key => $image) {
                                    if( $image != '' ) {
                                        $first_image = explode(".",$image);
                                        if( isset($first_image[1]) && $first_image[1] != '' ) {
                                            if( $first_image[1] == "png" || $first_image[1] == "jpg" || $first_image[1] == "jpeg") {
                                                $first_image_of_case = $image;
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        ?>
                        @if(isset($first_image_of_case) && $first_image_of_case != '')
                            <img src="{{asset($first_image_of_case)}}" alt="Case Image" />
                        @else
                            <img src="{{ asset('admin_assets/media/avatars/blank.png') }}" alt="Case Image" />
                        @endif
                        </div>
                    </div>
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-start flex-wrap mb-2">
                            <div class="d-flex flex-column">
                                <div class="d-flex align-items-center mb-2 text-gray-900 text-hover-primary fs-2 fw-bolder me-1">
                                    {{$caseDetails->title}}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="d-flex overflow-auto h-55px">
                    <ul class="nav nav-stretch nav-line-tabs nav-line-tabs-2x border-transparent fs-5 fw-bolder flex-nowrap">
                        <li class="nav-item">
                            <a class="nav-link text-active-primary me-6 {{ Route::is('admin.case-details.edit') ? 'active' : '' }}" href="{{route('admin.case-details.edit',$caseDetails->id)}}">Edit Case</a>
                        </li>    
                        <li class="nav-item">
                            <a class="nav-link text-active-primary me-6 {{ Route::is('admin.case-details.offers.index') ? 'active' : '' }}" href="{{ route('admin.case-details.offers.index').'?case_id='.$caseDetails->id }}">Offers</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-active-primary me-6 {{ Route::is('admin.case-details.payments.index') ? 'active' : '' }}" href="{{ route('admin.case-details.payments.index').'?case_id='.$caseDetails->id }}">Payments</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-active-primary me-6 {{ Request::is('admin/case-details/post-updates/*') ? 'active' : '' }} || {{ Route::is('admin.case-details.post-updates.index') ? 'active' : '' }}" href="{{ route('admin.case-details.post-updates.index').'?case_id='.$caseDetails->id }}">Updates</a>
                        </li>
                    </ul>
                </div>
                
            </div>
        </div>
    </div>
</div>