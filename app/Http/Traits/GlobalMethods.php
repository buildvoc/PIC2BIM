<?php
namespace App\Http\Traits;
use App\Models\SessionTokens;
use App\Models\Otp;
use Hash;
use Carbon\Carbon;
use Twilio\Exceptions\TwilioException;
use Twilio\Rest\Client;
use App\Models\User;
use Illuminate\Http\Request;
use App\Models\Area;
use Illuminate\Support\Facades\DB;
use App\Models\CaseOffer;
use App\Models\CasePayments;
use App\Models\CaseUpdate;
use App\Models\Rating;
use GetStream\StreamChat\Client as StreamClient;


trait GlobalMethods{
	public function generateToken($length = 25, $user_id = "") {
		$user_id = trim($user_id);
		$characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
		$charactersLength = strlen($characters);
		$randomString = '';
		for ($i = 0; $i < $length; $i++) {
			$randomString .= $characters[rand(0, $charactersLength - 1)];
		}
		$session_token = Hash::make(md5($randomString));
		if( $user_id == '' ) {
			$countTokenExists = SessionTokens::where('token', $session_token)->count();
			if( $countTokenExists > 0 ) {
				$this->generateToken(25);
			}
		} else if( $user_id != '' && is_numeric($user_id) ) {
			$currentTimestamp = Carbon::now();
			$check_active_session = SessionTokens::where('user_id', $user_id)->where('status', 1)->where('expiry', '>', $currentTimestamp)->first();
			if( $check_active_session ) {
				$check_active_session->status = 0;
				$check_active_session->save();
			}
			$sessionToken = array();
			$sessionToken['user_id'] = $user_id;
			$sessionToken['token'] = $session_token;
			$sessionToken['expiry'] = Carbon::now()->addDays(config('global_items.session_token_expiry_within_minutes'));
//			$sessionToken['expiry'] = Carbon::now()->addMinutes(config('global_items.session_token_expiry_within_minutes'));
			$sessionToken['status'] = 1;
			$sessionToken['data	'] = "";
			SessionTokens::create($sessionToken);
		}
		return $session_token;
	}
	public function generateOtp($user_id = "", $demo_number="") {
		$user_id = trim($user_id);
		if( $user_id != '') {
			if( isset($demo_number) && $demo_number == 'dummy_number' ) {
				$otp = 9999;
			} else {
				$otp = random_int(1000, 9999);
				$countOtpExists = Otp::where('otp', $otp)->count();
				if( $countOtpExists > 0 ) {
					$this->generateOtp();
				}
			}
			$check_otp_already_exists = Otp::where('user_id', $user_id)->orderBy('id', 'desc')->first();
			if( $check_otp_already_exists ) {
				$check_otp_already_exists->status = "inactive";
				$check_otp_already_exists->save();
			}
			$userOBJ = User::where('id',$user_id)->first();
			if( $userOBJ ) {
				$otpToken = array();
				$otpToken['user_id'] = $user_id;
				$otpToken['otp'] = $otp;
				$otpToken['expiry'] = Carbon::now()->addMinutes(config('global_items.otp_expiry_within_minutes'));
				$otpToken['status'] = 'active';
				$otpToken['logged_in_successfully'] = 0;
				$otpToken['data	'] = "";
				if( isset($demo_number) && $demo_number != '' ) {
					$otp = Otp::create($otpToken);
					return $otp;
				} else {
					$message_sent = $this->sendOtpToMobileUsingTwilio($userOBJ->phone_number,config('global_items.otp_verification_mobile_message').$otp);
					if( is_array($message_sent) && isset($message_sent['status']) && $message_sent['status'] == true ) {
						$otp = Otp::create($otpToken);
						return $otp;
					} else {
						return $message_sent;
					}
				}
			} else {
				return false;
			}
		} else {
			return false;
		}
	}
	public function checkConsecutiveOtpFailed($user_id) {
		$consecutive_failed_tries = config('global_items.no_of_otp_consecutive_tries_failed');
		$count_wrong_tries = 0;
		$get_last_three_otps = Otp::where('user_id', $user_id)->orderBy('id', 'desc')->take($consecutive_failed_tries)->get();
		$otps_list = $get_last_three_otps->toArray();
		if( count($otps_list) > 0 ) {
			foreach ($otps_list as $key => $each_otp) {
				if( $each_otp['logged_in_successfully'] == 0 && $each_otp['status'] == 'active') {
					$count_wrong_tries++;
				} else {
					return false;
					break;
				}
				if( $count_wrong_tries == $consecutive_failed_tries ) {
					return true;
				}
			}
		}
		return false;
	}
	public function sendOtpToMobileUsingTwilio($to,$message) {
		$getstatus = array("status"=>false,"message"=>"Otp could not sent");
		$to = "+".trim($to);
		if( isset($to) && $to != '' ) {

			$accountSid = getenv("TWILIO_SID");
			$authToken = getenv("TWILIO_TOKEN");
			$twilioFrom = getenv("TWILIO_FROM");
			$twilio = new Client($accountSid, $authToken);
			try {
				$twilio->messages->create($to, [
					'from' => $twilioFrom,
					'body' => $message]);
				$getstatus['status'] = true;
				$getstatus['message'] = "Otp Successfully Sent";
			} catch (TwilioException $e) {
				$errorMessage = $e->getMessage();
				$getstatus['status'] = false;
				$getstatus['message'] = $errorMessage;
			}
		}
		return $getstatus;
	}
	public function checkConsecutiveOtpFailedFinal($user_id) {
		if( $user_id != '' && is_numeric($user_id) ) {
			$wrong_tries_reached = $this->checkConsecutiveOtpFailed($user_id);
			if( $wrong_tries_reached ) {
				return "wrong_tries_reached";
			}
		}
	}
	public function getUserDataUsingAuthToken(Request $request) {
		$session = $request->authToken;
		if( $session != '' ) {
			$token = SessionTokens::where('token', $session)->first();
			if( $token ) {
				if( isset($token->user_id) && $token->user_id != "" && is_numeric($token->user_id) ) {
					return User::where("id",$token->user_id)->first();
				} else {
					return false;
				}
			} else {
				return false;
			}
		} else {
			return false;
		}
	}
	public function getUploadedFileSizeInMbs($size_in_bytes) {
		$mb_size = 0;
		if( isset($size_in_bytes) && $size_in_bytes != '' ) {
			$mb_size = round($size_in_bytes / 1048576, 2);
		}
		return $mb_size;


	}
	public function getUrgenciesPrioritiesData() {
		return fetchCodeTableData("list","priority");
	}
    public function getAgeGroupData() {
		return fetchCodeTableData("list","age_group");
	}
	public function getLocationsData() {
		return Area::select('areas.*', 'regions.name as region_name')
		->join('regions', 'areas.region_id', '=', 'regions.id')
		->whereNull('areas.deleted_at')
		->where("areas.status",1)
		->orderBy("areas.name","ASC")
		->get();
	}
	public function getRatingsData() {
		return fetchCodeTableData("list","ratings");
	}
	public function getCaseListings(Request $request, $p_case_id=NULL, $p_user_id=NULL, $p_case_type=NULL) {

        DB::statement("SET SQL_MODE=''");

        $response = array();
		$perPage = intval(20);
		$page = 1;
		$page = (isset($request->page) && $request->page != '' && is_numeric($request->page) && $request->page > 0) ? $request->page : 1;
		$length = $perPage;
		$start = $perPage*($page-1);

		$case_listing = DB::table('case_details')
			->select(
				'case_details.*',
				'animal_types.name as animal_type_name',
				'users.first_name',
				'users.last_name',
				'users.username',
				'users.avatar',
				'users.stream_token',
				'users.id as user_id',
				'users.is_deleted as user_deleted',
				'users.profile_types_id',
				DB::raw('(SELECT COUNT(*) FROM case_offers WHERE case_offers.case_id = case_details.id AND case_offers.status=1 AND case_offers.deleted_at IS NULL) AS offers_count'),
                DB::raw('(SELECT code_tables.value FROM code_tables WHERE code_tables.id = case_details.age) AS age'),

			)
			->join('animal_types', 'case_details.animal_type', '=', 'animal_types.id')
			->join('users', 'case_details.user_id', '=', 'users.id');

			if( (isset($p_case_type) && $p_case_type == "paid_cases")) {
				$case_listing = $case_listing->join('case_payments', function ($join) use ($p_user_id) {
					$join->on('case_payments.case_id', '=', 'case_details.id')
						 ->where('case_payments.deleted_at', NULL)
						 ->where('case_payments.user_id', $p_user_id)
						 ->where('case_payments.status', 1);
				});
                $case_listing = $case_listing->groupBy('case_details.id');
			}

			if( (isset($p_case_type) && $p_case_type == "clinic_offered_cases")) {
				$case_listing = $case_listing->join('case_offers', function ($join) use ($p_user_id) {
					$join->on('case_offers.case_id', '=', 'case_details.id')
						 ->where('case_offers.deleted_at', NULL)
						 ->where('case_offers.user_id', $p_user_id)
						 ->where('case_offers.status', 1);
				});
			}

			if( (isset($p_case_type) && $p_case_type == "closed_cases")) {
				$case_listing = $case_listing
					->where('case_details.is_close', 1)
					->where('case_details.user_id', $p_user_id);
			}

			$case_listing = $case_listing->where('case_details.deleted_at', NULL)->where('case_details.status', 1);
			$case_listing = $case_listing->skip($start)->take($length);

			if( !isset($p_case_type) || $p_case_type == "" ) {

				if (isset($request->animal_type_id) && $request->animal_type_id != '' && is_numeric($request->animal_type_id) && $request->animal_type_id > 0) {
					// ON HOMEPAGE IF FILTER SELECTED OF Cateogry - STARTS (DOG,RAT)
					$case_listing = $case_listing->where(function ($query) {
						$query->where('case_details.is_payment_completed', 0);
						$query->where('case_details.is_deactivated', 0);
						$query->where('case_details.is_close', 0);
					});

					$case_listing = $case_listing->where('case_details.animal_type', $request->animal_type_id);

				} else if( isset($p_user_id) && $p_user_id != '' && is_numeric($p_user_id) && $p_user_id > 0  ) {
					// IN PROFILE SECTION GET ONLY USER RELATED CASES - STARTS
					$case_listing = $case_listing->where('case_details.user_id', $p_user_id);

					$case_listing = $case_listing->orderBy('case_details.is_deactivated', 'ASC');
					$case_listing = $case_listing->orderBy('case_details.is_close', 'ASC');
					$case_listing = $case_listing->orderBy('case_details.is_payment_completed', 'ASC');

				} else if( isset($p_case_id) && $p_case_id != '' && is_numeric($p_case_id) && $p_case_id > 0  ) {
					// GET SPECIFIC CASE DETAIL BY ID - STARTS
					$case_listing = $case_listing->where('case_details.id', $p_case_id);

				} else {
					// GET HOMEPAGE CASES - STARTS
					$case_listing = $case_listing->where(function ($query) {
						$query->where('case_details.is_payment_completed', 0);
						$query->where('case_details.is_deactivated', 0);
						$query->where('case_details.is_close', 0);
					});

					$case_listing = $case_listing->where('users.is_deleted', 0);

					if( (isset($request->lat) && $request->lat != '') && (isset($request->lng) && $request->lng != '') ) {
						$case_listing = $case_listing->addSelect(
							DB::raw("(6371 * acos(cos(radians($request->lat)) * cos(radians(case_details.lat)) * cos(radians(case_details.lng) - radians($request->lng)) + sin(radians($request->lat)) * sin(radians(case_details.lat)))) AS distanceRadial")
						);
						$case_listing = $case_listing->orderBy('distanceRadial', 'ASC');
					}
				}
			}

			$case_listing = $case_listing->get();

			$case_listing_count = $case_listing->count();

			// GET EACH CASE RATING IF EXISTS - STARTS
				if( $case_listing_count > 0 ) {
					$case_listing = $this->addRatingKeyToCasesAndCheckCaseUserRatedOrNot($case_listing,$p_user_id);
					$this->addDistanceKeyToCases($request, $case_listing);
				}
			// GET EACH CASE RATING IF EXISTS - ENDS

			//check if stream token not exist then create it first then send response.
				if(count($case_listing) > 0) {
					foreach ($case_listing as $case_list) {
						if (!property_exists($case_list, $case_list->stream_token) && empty($case_list->stream_token)) {
							$user_obj_data = new \stdClass();
							$user_obj_data->id = $case_list->user_id;
							$user_obj_data->username = $case_list->username;
							$user_obj_data->stream_token = $case_list->stream_token;
							$this->checkChatTokenIsUpdated($user_obj_data);
						}
					}
				}

		$this->attachDefaultImage($case_listing,"users","admin_assets/media/custom/blank-person.jpg" );
		$response['case_listing_count'] = $case_listing_count;
		$response['case_listings'] = $case_listing;
		return $response;
	}
    public function checkChatTokenIsUpdated($user) {
        if (isset($user->id) && $user->id != '' && $user->id != NULL && is_numeric($user->id) && $user->id > 0) {
            if (isset($user->username) && $user->username != '' && $user->username != NULL) {
                if ( $user->stream_token == '' || $user->stream_token == NULL) {
                    $updateStreamToken = User::find($user->id);
                    if ($updateStreamToken) {
                        $client = $this->getStreamChatClient();
                        $token = $client->createToken($user->username);
                        $updateStreamToken->stream_token = $token;
                        $updateStreamToken->save();
                    }
                }
            }
        }
    }
    public function getStreamChatClient() {
        return new StreamClient(config('global_items.STREAMCHAT_APP_ID'), config('global_items.STREAMCHAT_APP_SECRET'), null, null, 9);
    }
	public function checkUploadedFileSizeExtensions($_file) {
		if ($_file->getClientOriginalExtension() == 'png' || $_file->getClientOriginalExtension() == 'jpg' || $_file->getClientOriginalExtension() == 'jpeg' || $_file->getClientOriginalExtension() == 'mp4' || $_file->getClientOriginalExtension() == 'mov' || $_file->getClientOriginalExtension() == 'wmv' || $_file->getClientOriginalExtension() == 'avi' || $_file->getClientOriginalExtension() == 'flv' || $_file->getClientOriginalExtension() == 'mkv') {
			$sizeInMBs = $this->getUploadedFileSizeInMbs($_file->getSize());
			if ($sizeInMBs != '') {
				if ($_file->getClientOriginalExtension() == 'png' || $_file->getClientOriginalExtension() == 'jpg' || $_file->getClientOriginalExtension() == 'jpeg') {
					// if ($sizeInMBs > 10) {
					// 	return "Image_Size_Error";
					// }
				} else if ($_file->getClientOriginalExtension() == 'mp4' || $_file->getClientOriginalExtension() == 'mov' || $_file->getClientOriginalExtension() == 'wmv' || $_file->getClientOriginalExtension() == 'avi' || $_file->getClientOriginalExtension() == 'flv' || $_file->getClientOriginalExtension() == 'mkv') {
					// if ($sizeInMBs > 50) {
					// 	return "Video_Size_Error";
					// }
				}
			} else {
				return "Size_Error";
			}
		} else {
			return "Extension_Error";
		}
		return true;
	}
	public function getUsersWhoHaveStories(Request $request) {
		$users = DB::table('user_stories')
            ->select('users.*')
            ->distinct('user_id')
            ->limit(5)
            ->join('users', 'users.id', '=', 'user_stories.user_id')
			->orderBy("user_stories.user_id",'DESC')
			->where('user_stories.status', 1)
			->where('user_stories.deleted_at', NULL)
			->where('user_stories.created_at', '>=', now()->subDay())
            ->get();
		$this->attachDefaultImage($users,"users","admin_assets/media/custom/blank-person.jpg" );
		return $users;
	}
	public function attachDefaultImage($eloquentObjects, $table, $path) {
		if( $eloquentObjects != '' && (is_object($eloquentObjects) || is_array($eloquentObjects)) && $eloquentObjects->count() > 0 ) {
			foreach ($eloquentObjects as $key => $obj) {
				if( $table == "users" ) {
					$avatar = $obj->avatar;
					if( $avatar == "" ) {
						$obj->avatar = "admin_assets/media/custom/blank-person.jpg";
					}
				}
			}
		} else {
			if( $table == "users" ) {
				if( $eloquentObjects == "" ) {
					$eloquentObjects = "admin_assets/media/custom/blank-person.jpg";
				}
			}
		}
		return $eloquentObjects;
	}
	public function getUserStoriesByUserId(Request $request, $user_id) {
		$response = array(
			"stories_count"=>0,
				'stories'=>
				array('stories_actions'=>
					array(
						"stories_views_count"=>0,
						"stories_views"=>array(),
						"stories_likes_count"=>0,
						"stories_likes"=>array(),
						"stories_replies_count"=>0,
						"stories_replies"=>array()
					)
				)
			);
		$page = 1;
		if( (isset($request->page) && $request->page != '' && is_numeric($request->page) && $request->page > 0)) {
			$page = $request->page;
		}

		$response = array();
		if( isset($user_id) && $user_id != '' && is_numeric($user_id) ) {
			$stories = DB::table('user_stories')
			->where('deleted_at', NULL)
			->where('status', 1)
			->where('user_id', $user_id)
			->where('created_at', '>=', now()->subDay());


			$response['stories_count'] = $stories->count();
			$stories = $stories->skip(0)->take(5)->orderBy("user_stories.id", "DESC")->get();
			$response['stories'] = $stories;

			if( $stories->count() > 0 ) {
				foreach ($stories as $story_key => $story) {
					$stories_replies = $this->getStoryReplies($story->id, $page);
					$response['stories'][$story_key]->stories_replies_count = $stories_replies['stories_replies_count'];
					$response['stories'][$story_key]->stories_replies = $stories_replies['stories_replies'];

					$stories_views = $this->getStoryViews($story->id, $page);
					$response['stories'][$story_key]->stories_views_count = $stories_views['stories_views_count'];
					$response['stories'][$story_key]->stories_views = $stories_views['stories_views'];

					$stories_likes = $this->getStoryLikes($story->id, $page);
					$response['stories'][$story_key]->stories_likes_count = $stories_likes['stories_likes_count'];
					$response['stories'][$story_key]->stories_likes = $stories_likes['stories_likes'];
				}
			}
		}
		return $response;
	}
	public function getStoryReplies($story_id, $page=NULL) {
		$response = array(
			"stories_replies_count"=>0,
			"stories_replies"=>array()
		);
		if( isset($story_id) && $story_id != '' && is_numeric($story_id) ) {
			$stories_replies = DB::table('users_replied_stories')
			->join('users', 'users.id', '=', 'users_replied_stories.users_id')
			->where('users_replied_stories.deleted_at', NULL)
			->where('users_replied_stories.user_stories_id', $story_id)
			->orderBy('users_replied_stories.id', 'DESC');
			$stories_replies_count = $stories_replies->count();
			if( (isset($page) && $page != '' && is_numeric($page) && $page > 0)) {
				$perPage = intval(20);
				$page = $page;
				$length = $perPage;
				$start = $perPage*($page-1);
				$stories_replies = $stories_replies->skip($start)->take($length);
			}

			$stories_replies = $stories_replies->orderBy("users_replied_stories.id", "DESC")->get();

			$this->attachDefaultImage($stories_replies,"users","admin_assets/media/custom/blank-person.jpg" );

			$response['stories_replies_count'] = $stories_replies_count;
			$response['stories_replies'] = $stories_replies;
		}
		return $response;
	}
	public function getStoryViews($story_id, $page=NULL) {
		$response = array(
			"stories_views_count"=>0,
			"stories_views"=>array()
		);
		if( isset($story_id) && $story_id != '' && is_numeric($story_id) ) {
			$stories_views = DB::table('users_viewed_stories')
				->join('users', 'users.id', '=', 'users_viewed_stories.users_id')
				->where('users_viewed_stories.deleted_at', NULL)
				->where('users_viewed_stories.user_stories_id', $story_id)
				->orderBy('users_viewed_stories.id', 'DESC');

			if(isset($page) && $page != '' && is_numeric($page) && $page > 0) {
				$perPage = intval(20);
				$page = $page;
				$length = $perPage;
				$start = $perPage*($page-1);
				$stories_views = $stories_views->skip($start)->take($length);
			}

			$stories_views_count = $stories_views->count();

			$stories_views = $stories_views->get();

			if( $stories_views->count() > 0 ) {

				foreach ($stories_views as $key => $views) {
					$stories_views_like = DB::table('users_likes_stories')
						->where('users_likes_stories.deleted_at', NULL)
						->where('users_likes_stories.user_stories_id', $story_id)
						->where('users_likes_stories.users_id', $views->users_id)->get();
					if( $stories_views_like->count() > 0 ) {
						$stories_views[$key]->if_story_liked_by_user = true;
					} else {
						$stories_views[$key]->if_story_liked_by_user = false;
					}
				}
			}
			$this->attachDefaultImage($stories_views,"users","admin_assets/media/custom/blank-person.jpg" );
			$response['stories_views_count'] = $stories_views_count;
			$response['stories_views'] = $stories_views;
		}
		return $response;
	}
	public function getStoryLikes($story_id, $page=NULL) {
		$response = array(
			"stories_likes_count"=>0,
			"stories_likes"=>array()
		);
		if( isset($story_id) && $story_id != '' && is_numeric($story_id) ) {

			$stories_likes = DB::table('users_likes_stories')
				->join('users', 'users.id', '=', 'users_likes_stories.users_id')
				->where('users_likes_stories.deleted_at', NULL)
				->where('users_likes_stories.user_stories_id', $story_id)
				->orderBy('users_likes_stories.id', 'DESC');
				$stories_likes_count = $stories_likes->count();
				if( (isset($page) && $page != '' && is_numeric($page) && $page > 0)) {
					$perPage = intval(20);
					$page = $page;
					$length = $perPage;
					$start = $perPage*($page-1);
					$stories_likes = $stories_likes->skip($start)->take($length);
				}

			$stories_likes = $stories_likes->get();
			$this->attachDefaultImage($stories_likes,"users","admin_assets/media/custom/blank-person.jpg" );
			$response['stories_likes_count'] = $stories_likes_count;
			$response['stories_likes'] = $stories_likes;
		}
		return $response;
	}
	public function getAllOffersAgainstCaseId($request=NULL, $case_id) {
		$response = array("case_offers"=>array());
		if( isset($case_id) && $case_id != '' && is_numeric($case_id) && $case_id > 0 ) {
			$case_offers = CaseOffer::where("case_offers.case_id",$case_id)
			->select('case_offers.*','users.first_name','users.last_name','users.avatar',
				DB::raw('(SELECT SUM(case_payments.amount) FROM case_payments WHERE case_offers.id = case_payments.offer_id AND case_offers.status=1 AND case_offers.deleted_at IS NULL) AS total_collected_amount')
			)
			->join('users', 'case_offers.user_id', '=', 'users.id')
			->where("case_offers.status",1)
			->where('case_offers.deleted_at', NULL)
			->orderBy('case_offers.created_at', 'DESC');
			if( (isset($request->page) && $request->page != '' && is_numeric($request->page) && $request->page > 0)) {
				$perPage = intval(20);
				$page = $request->page;
				$length = $perPage;
				$start = $perPage*($page-1);
				$case_offers = $case_offers->skip($start)->take($length);
			}

			$case_offers = $case_offers->get();
			$response = $case_offers;
		}
		return $response;
	}
	public function checkIfAnyOfferAcceptedAgainstACaseOrPaymentMade($p_case_id) {
		if(isset($p_case_id) && $p_case_id != '' && is_numeric($p_case_id) && $p_case_id > 0 ) {
			$offers_objects = $this->getAllOffersAgainstCaseId("",$p_case_id);
			if( $offers_objects->count() != '' && $offers_objects->count() > 0 ) {

				$this->attachDefaultImage($offers_objects,"users","admin_assets/media/custom/blank-person.jpg" );

				foreach ($offers_objects as $key => $offer) {
					if( $offer->is_accepted == 1 ) {
						return $offer;
						break;
					}
				}
			}
		}
		return 0;
	}
	public function checkIfAcceptedOfferPaymentCompletelyPaid($accepted_offer_id) {
		if(isset($accepted_offer_id) && $accepted_offer_id != '' && is_numeric($accepted_offer_id) && $accepted_offer_id > 0 ) {
			$offerData = CaseOffer::where("id",$accepted_offer_id)->first();
			$offer_amount = $offerData->offer_amount;

			$collected_amount = $this->getAllPaidAmountAgainstAnOffer($accepted_offer_id);

			if( isset($collected_amount->total_amount_collected) && $collected_amount->total_amount_collected != '' && is_numeric($collected_amount->total_amount_collected) ){
				if($collected_amount->total_amount_collected >= $offer_amount ) {
					return 1;
				}
			}
		}
		return 0;
	}
	public function getAllPaidAmountAgainstAnOffer($accepted_offer_id) {
		if(isset($accepted_offer_id) && $accepted_offer_id != '' && is_numeric($accepted_offer_id) && $accepted_offer_id > 0 ) {
			return CasePayments::selectRaw("SUM(case_payments.amount) as total_amount_collected")
			->join('case_offers', 'case_payments.offer_id', '=', 'case_offers.id')
			->where("case_payments.offer_id", $accepted_offer_id)
			->where("case_payments.status", 1)
			->whereNull('case_payments.deleted_at')
			->first();
		}
	}
	public function getAllAreas() {
		$response = array();
		return $area_data = Area::with('region')->where('deleted_at', NULL)->where('status', 1)->get();
	}

	public function getAllPostedUpdates($p_case_id) {
		if(isset($p_case_id) && $p_case_id != '' && is_numeric($p_case_id) && $p_case_id > 0 ) {
			$caseUpdates = CaseUpdate::
				select('case_updates.*','users.first_name','users.last_name','users.avatar')
				->join('users', 'case_updates.user_id', '=', 'users.id')
				->where('case_updates.deleted_at', NULL)
				->where('case_updates.status', 1)
				->where('case_updates.case_id', $p_case_id)
				->orderBy('case_updates.created_at', 'DESC')
				->get();
			$this->attachDefaultImage($caseUpdates,"users","admin_assets/media/custom/blank-person.jpg" );
			return $caseUpdates;
		}
	}

	public function getCaseAllPayment($p_case_id) {
		if(isset($p_case_id) && $p_case_id != '' && is_numeric($p_case_id) && $p_case_id > 0 ) {
			$casePayments = CasePayments::
				select('case_payments.*','users.first_name','users.last_name','users.avatar')
				->join('users', 'case_payments.user_id', '=', 'users.id')
				->where('case_payments.deleted_at', NULL)
				->where('case_payments.status', 1)
				->where('case_payments.case_id', $p_case_id)
				->orderBy('case_payments.created_at', 'DESC')
				->get();

				$this->attachDefaultImage($casePayments,"users","admin_assets/media/custom/blank-person.jpg" );
			return $casePayments;
		}
	}

	public function getUserDataUsingUserID($p_user_id) {
		if( $p_user_id != '' ) {
			$user_data = User::where('id', $p_user_id)->first();
			$user_data->avatar = $this->attachDefaultImage($user_data->avatar,"users","admin_assets/media/custom/blank-person.jpg" );
			return $user_data;
		}
	}
	public function addOfferAutomation($request, $offerData) {
		$caseOffers = new CaseOffer();
		$caseOffers->case_id = $offerData['case_id'];
		$caseOffers->user_id = $offerData['user_id'];
		$caseOffers->offer_amount = $offerData['offer_amount'];
		$caseOffers->data = NULL;
		$caseOffers->status = $offerData['status'];
		$caseOffers->is_accepted = $offerData['is_accepted'];
		$caseOBJ = $caseOffers->save();
		if( $caseOBJ ) {
			activityLog('ApiController', 'CaseOffer', 'addOfferAutomation', "create", "user", "Case Offers successfully created", null, $caseOffers, $request->ip(), $request,$offerData['user_id']);
		} else {
			return $this->sendError("could_not_create_case_offer",201);
		}
	}
	public function addDistanceKeyToCases($request, $case_details) {
		foreach ($case_details as $key => $case) {

			if( (isset($request->lat) && $request->lat != '') && (isset($request->lng) && $request->lng != '') ) {
				if( (isset($case->lat) && $case->lat != '') && (isset($case->lng) && $case->lng != '') ) {
					$case_details[$key]->distance = vincentyGreatCircleDistance($request->lat, $request->lng, $case->lat, $case->lng);
				} else {
					$case_details[$key]->distance = "N/A";
				}
			} else {
				$case_details[$key]->distance = "N/A";
			}
		}
		return $case_details;
	}

	public function checkIfAnyPaymentMadeOnACase($p_case_id) {
		if(isset($p_case_id) && $p_case_id != '' && is_numeric($p_case_id) && $p_case_id > 0 ) {
			$casePaymentsCount = CasePayments::where('case_payments.deleted_at', NULL)
				->where('case_payments.status', 1)
				->where('case_payments.case_id', $p_case_id)
				->count();
			return $casePaymentsCount;
		}
	}
	public function addRatingKeyToCasesAndCheckCaseUserRatedOrNot($case_listing, $p_user_id) {
		foreach ($case_listing as $key => $case) {
			$rating_of_case = Rating::where("case_id", $case->id)->where("status",1)->whereNull('deleted_at')->get();
			if( $rating_of_case != '' && $rating_of_case->count() > 0 ) {
				$case_listing[$key]->rating = $rating_of_case[0]->rating;
			} else {
				$case_listing[$key]->rating = 0;
			}

			if( isset($p_user_id) && $p_user_id != '' && is_numeric($p_user_id) && $p_user_id > 0  ) {
				if( $p_user_id == $case->user_id ) {
					$hasPostedRating = Rating::where("case_id", $case->id)->where("status",1)->whereNull('deleted_at')->count();
					if( $hasPostedRating != '' && $hasPostedRating > 0 ) {
						$case_listing[$key]->user_has_posted_rating = 1;
					} else {
						$case_listing[$key]->user_has_posted_rating = 0;
					}
				} else {
					$case_listing[$key]->user_has_posted_rating = 0;
				}
			}
		}
		return $case_listing;
	}
}
