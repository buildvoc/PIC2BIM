<?php
use App\Models\Emissions;
use App\Models\FamilyInformation;
use App\Models\Pages;
use App\Models\Usagers;
use App\Models\Services;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Spatie\Permission\Models\Permission;
use Illuminate\Support\Str;


function BreadCrumbsGeneratorHelper($breadcrumbs) {
    $completeBreadCrumbs = "";
    $breadCrumbsSeparator = '<li class="breadcrumb-item"><span class="bullet bg-gray-400 w-5px h-2px"></span></li>';
    if( isset($breadcrumbs) && count($breadcrumbs) > 0 ) {
        foreach ($breadcrumbs as $key => $url) {
            if( isset($url['name']) && trim($url['name']) != '' ) {
                if( $key > 0 ) {
                    $completeBreadCrumbs .= $breadCrumbsSeparator;
                }
                if( isset($url['route']) && trim($url['route']) != '' ) {
                    $completeBreadCrumbs .= '<li class="breadcrumb-item text-primary">';
                        $completeBreadCrumbs .= '<a href="'.$url['route'].'" class="text-primary text-hover-primary">'.$url['name'].'</a>';
                    $completeBreadCrumbs .= '</li>';
                } else{
                    $completeBreadCrumbs .= '<li class="breadcrumb-item text-muted">'.$url['name'].'</li>';
                }
            }
        }
    }
    return $completeBreadCrumbs;
}


function generateCardNumber($serviceID, $user_id) {
    $response = array("card_number" =>0, "reference" =>0);
    $serviceDetails = Services::where('id', $serviceID)->first();
    $userDetails = Usagers::where('id', $user_id)->first();

    $reference = "";
    $card_number = sprintf('%02d', 1);
    $reference = $serviceDetails->code.$card_number.$userDetails->identification;

    $emissionDetails = Emissions::withTrashed()->where('servicesID', $serviceID)->where('userID', $user_id)->orderby('id','desc')->first();
    if( isset($emissionDetails->card_number) && $emissionDetails->card_number != '' && $emissionDetails->card_number > 0 ) {
        $card_number = sprintf('%02d', ($emissionDetails->card_number + 1));
        $reference = $serviceDetails->code.$card_number.$userDetails->identification;
    }
    $checksum = generateLuhnChecksum(generateRandomNumber(12));
    $reference = $reference.$checksum;
    $response['card_number'] = $card_number;
    $response['reference'] = $reference;
    return $response;
}
function globalDateFormat($date) {
    return date("d/m/Y" , strtotime($date) );
}
function convertMonthsToYearsAndMonths($months) {
    $years = floor($months / 12);
    $remainingMonths = $months % 12;

    


    $result = '';
    if ($years > 0) {
        $result .= $years . ' an' . ($years > 1 ? 's' : '');
    }
    if ($remainingMonths > 0) {
        if ($years > 0) {
            $result .= ' ';
        }
        $result .= $remainingMonths . ' moi' . ($remainingMonths > 1 ? 's' : '');
    }

    return $result;
}
function generateRandomNumber($length) {
    $randomNumber = '';
    for ($i = 0; $i < $length; $i++) {
        $randomNumber .= rand(0, 9);
    }
    return $randomNumber;
}
function generateLuhnChecksum($input) {
    $number = preg_replace('/\D/', '', $input);
    $number = strrev($number);
    $sum = 0;
    for ($i = 0; $i < strlen($number); $i++) {
        $digit = intval($number[$i]);
        if ($i % 2 == 1) {
            $digit *= 2;
            if ($digit > 9) {
                $digit -= 9;
            }
        }
        $sum += $digit;
    }
    $checksum = (10 - ($sum % 10)) % 10;

    return $checksum;
}

function getServiceId($request) {
    $route = $request->route();
    $prefix = $route->getPrefix();
    $prefix = str_replace('admin', '', $prefix);
    $prefix = ltrim($prefix, '/');
    $servic_name = 0;
    if( $prefix == "carte-consulaire" ) {
        $servic_name = 4;
    } else if( $prefix == "carte-dindentite" ) {
        $servic_name = 5;
    } else if( $prefix == "certificat-de-demenagement" ) {
        $servic_name = 3;
    } else if( $prefix == "laisser-passer" ) {
        $servic_name = 1;
    } else if( $prefix == "autorisation-parentale" ) {
        $servic_name = 2;
    }
    return $servic_name;
}

function getFamilyInformationFromStringId($json_string_child_ids) {
    $response = array();
    if ($json_string_child_ids != '') {
        $selectedChilds = json_decode($json_string_child_ids, true);
        if (gettype($selectedChilds) == "array" && count($selectedChilds) > 0) {
            foreach ($selectedChilds as $key => $each) {
                if ($each != '' && is_numeric($each) && $each > 0) {
                    $family_record = FamilyInformation::where('id', $each)->first();
                    if (isset($family_record) && $family_record != '' && $family_record->count() > 0) {
                        $response[$key]['id'] = $family_record->id;
                        $response[$key]['name'] = $family_record->name;
                        $response[$key]['age'] = $family_record->age;
                        $response[$key]['sexe'] = $family_record->sexe;
                    }
                }
            }
        }
    }
    return $response;
}

function getDatePlaceholder( $format = "for_element_placeholder" ){
    if( $format == "for_element_placeholder" ) {
        return "dd/mm/yyyy";
    } else if( $format == "for_element_values" ) {
        return "d/m/Y";
    } else if($format == "for_js_dates") {
        return "d/m/Y";
    }
}

function checkRolePermission($page, $action = null) {
    // Check if the user is a super user
    if (Auth::user()->is_super) {
        return true;
    }
    // Get the page and the permission in a single query
    $page = Pages::where('libelle', $page)->first();
    if (!$page) {
        return false;
    }

    $hasPermission = Permission::where('page', $page->id)
        ->where('role', Auth::user()->role)
        ->where($action, 1)
        ->whereNull('deleted_at')
        ->exists();

    return $hasPermission;
}
function generateRandomString($length = 5) {
    $characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $charactersLength = strlen($characters);
    $randomString = '';
    for ($i = 0; $i < $length; $i++) {
        $randomString .= $characters[rand(0, $charactersLength - 1)];
    }

    $randomString .= generateLuhnChecksum(generateRandomNumber(12));

    $users_details = Usagers::select('id')->orderBy('id', 'desc')->withTrashed()->first();
    if( isset($users_details->identification) && $users_details->identification != '' && $users_details->identification == generateRandomString() ) {
        generateRandomString();
    }
    
    return $randomString;
}