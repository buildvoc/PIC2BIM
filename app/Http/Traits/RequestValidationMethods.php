<?php
namespace App\Http\Traits;

use App\Models\Area;
use Illuminate\Support\Facades\Validator;
use Illuminate\Http\Request;
use App\Models\SessionTokens;
use Illuminate\Validation\Rule;


trait RequestValidationMethods {
	public $user_id_from_token = "";

	public function completeUserProfileValidations(Request $request) {

		$this->getUserData($request);
		$validator = Validator::make($request->all(), [
			'first_name' => 'required|string|max:100',
			'last_name' => 'string|max:100',
			'profile_type' => 'required',

			'phone_number' => [
				'required',
				Rule::unique('users', 'phone_number')
					->where(function ($query) {
						return $query->whereNull('deleted_at')
									 ->where('id', '!=', $this->user_id_from_token);
					}),
			],
			'username' => [
				'required',
				'string',
				'max:40',
				'regex:/^[a-z0-9@_\-]+$/',
				Rule::unique('users', 'username')->ignore($this->user_id_from_token),
			],
			'email' => [
				'required',
				'email',
				Rule::unique('users', 'email')
					->where(function ($query) {
						return $query->whereNull('deleted_at')
									 ->where('id', '!=', $this->user_id_from_token);
					}),
			]

		], [
			'first_name.required' => 'First name is required',
			'phone_number.required' => 'Phone Number is required',
			'phone_number.unique' => 'Phone number already associated with another account',

			'profile_type.required' => 'Profile type is required',
			'email.required' => 'Email is required',
			'email.unique' => 'This email has already been taken',

			'username.required' => 'Username is required',
			'username.string' => 'Username must be string',
			'username.max' => 'username must be 40 characters long',
			'username.unique' => 'username has already been taken',
			'username.regex' => 'Username must be in lowercase letters (a-z), numbers (0-9) and the symbols "@" (at), "_" (underscore), and "-" (hyphen)',
		]);

		return $validator;
	}

	public function completeUserProfileValidationsWebSignupForm(Request $request) {
		$validator = Validator::make($request->all(), [
			'first_name' => 'required|string|max:100',
			'last_name' => 'string|max:100',
			'phone_number' => 'required|unique:users,phone_number',
			'username' => 'required|string|max:40|regex:/^[a-z0-9@_\-]+$/|unique:users,username',
			'email' => 'required|email|unique:users,email'
		], [
			'first_name.required' => 'First name is required',

			'phone_number.required' => 'Phone Number is required',
			'phone_number.unique' => 'Phone number already associated with another account',

			'email.required' => 'Email is required',
			'email.unique' => 'Email has already been taken',

			'username.required' => 'Username is required',
			'username.string' => 'Username must be string',
			'username.max' => 'Username must be 40 characters long',
			'username.unique' => 'Username has already been taken',
			'username.regex' => 'Username must be in lowercase letters (a-z), numbers (0-9) and the symbols "@" (at), "_" (underscore), and "-" (hyphen)',


		]);
		return $validator;
	}

	public function completeSpecialUserProfileValidations(Request $request) {
		$this->getUserData($request);
		$validation_rules = [
			// 'location_id' => 'required|integer',

			'location_name' => 'required|string',
			'lat' => 'required|numeric',
			'lng' => 'required|numeric',

			'phone_number' => [
				'required',
				Rule::unique('users', 'phone_number')
					->where(function ($query) {
						return $query->whereNull('deleted_at');
					})
					->ignore($this->user_id_from_token),
			],
			'username' => [
				'required',
				'string',
				'max:40',
				'regex:/^[a-z0-9@_\-]+$/',
				Rule::unique('users', 'username')->ignore($this->user_id_from_token),
			],
			'email' => [
				'required',
				'email',
				Rule::unique('users', 'email')
					->where(function ($query) {
						return $query->whereNull('deleted_at');
					})
					->ignore($this->user_id_from_token),
			],

			'profile_type' => 'required'
		];
		$validation_error_messages = [
			// 'location_id.required' => 'Location is required',
			// 'location_id.integer' => 'Location must be string',

			'location_name.required' => 'Location name is required',
			'location_name.string' => 'Location name must be string',

			'lat.required' => 'Latitude is required',
			'lat.numeric' => 'Latitude must be numeric',

			'lng.required' => 'Longitude is required',
			'lng.numeric' => 'Longitude must be numeric',

			'phone_number.required' => 'Phone Number is required',
			'phone_number.unique' => 'Phone number already associated with another account',
			'profile_type.required' => 'Profile type is required',
			'email.required' => 'Email is required',
			'email.unique' => 'This email has already been taken',
			'username.required' => 'Username is required',
			'username.string' => 'Username must be string',
			'username.max' => 'username must be 40 characters long',
			'username.unique' => 'username has already been taken',
			'username.regex' => 'Username must be in lowercase letters (a-z), numbers (0-9) and the symbols "@" (at), "_" (underscore), and "-" (hyphen)',
		];

		if(  $request->profile_type == 1) {
			$validation_rules['clinic_name'] = 'required|string|max:40';
			$validation_error_messages['clinic_name.required'] = 'Clinic name is required';
			$validation_error_messages['clinic_name.string'] = 'Username must be string';
			$validation_error_messages['clinic_name.max'] = 'Clinic name must be 40 characters long';
			$validation_error_messages['clinic_name.unique'] = 'Clinic name already been taken';
		} else if(  $request->profile_type == 4) {
			$validation_rules['supplier_name'] = 'required|string|max:40';
			$validation_error_messages['supplier_name.required'] = 'Supplier name is required';
			$validation_error_messages['supplier_name.string'] = 'Username must be string';
			$validation_error_messages['supplier_name.max'] = 'Supplier name must be 40 characters long';
			$validation_error_messages['supplier_name.unique'] = 'Supplier name already been taken';
		}
		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}

	public function completeSpecialUserProfileValidationsWebSignupForm(Request $request) {
		$validation_rules = [
			'location' => [
				'required',
				'integer',
				function ($attribute, $value, $fail) {
					if (!Area::where('id', $value)->where('status', 1)->exists()) {
						$fail('Location was not available or has disabled/removed.');
					}
				},
			],
			'phone_number' => 'required|unique:users,phone_number',
			'profile_type' => 'required',
			'username' => 'required|string|max:40|regex:/^[a-z0-9@_\-]+$/|unique:users,username',
			'email' => 'required|email|unique:users,email'
		];
		$validation_error_messages = [
			'location.required' => 'Location is required',
			'location.integer' => 'Location must be string',
			'phone_number.required' => 'Phone Number is required',
			'phone_number.unique' => 'Phone number already associated with another account',
			'profile_type.required' => 'Profile type is required',
			'email.required' => 'Email is required',
			'email.unique' => 'This email has already been taken',
			'username.required' => 'Username is required',
			'username.string' => 'Username must be string',
			'username.max' => 'username must be 40 characters long',
			'username.unique' => 'username has already been taken',
			'username.regex' => 'Username must be in lowercase letters (a-z), numbers (0-9) and the symbols "@" (at), "_" (underscore), and "-" (hyphen)',
		];

		if($request->profile_type == 1) {
			$validation_rules['clinic_name'] = 'required|string|max:40';
			$validation_error_messages['clinic_name.required'] = 'Clinic name is required';
			$validation_error_messages['clinic_name.string'] = 'Username must be string';
			$validation_error_messages['clinic_name.max'] = 'Clinic name must be 40 characters long';
			$validation_error_messages['clinic_name.unique'] = 'Clinic name already been taken';
		} else if(  $request->profile_type == 4) {
			$validation_rules['supplier_name'] = 'required|string|max:40';
			$validation_error_messages['supplier_name.required'] = 'Supplier name is required';
			$validation_error_messages['supplier_name.string'] = 'Username must be string';
			$validation_error_messages['supplier_name.max'] = 'Supplier name must be 40 characters long';
			$validation_error_messages['supplier_name.unique'] = 'Supplier name already been taken';
		}
		$validator = $request->validate($validation_rules , $validation_error_messages);
		return $validator;
	}



	public function updateUserProfileValidations(Request $request, $profile_type) {

		$validation_rules = [
			'bio_info' => 'string|max:500',
		];
		$validation_error_messages = [
			'bio_info.string' => 'Bio info must be string',
			'bio_info.max' => 'Bio info must be 500 character long',
		];

		if( $profile_type == 1) {
			$validation_rules['clinic_name'] = 'required|string|max:40';
			$validation_error_messages['clinic_name.required'] = 'Clinic name is required';
			$validation_error_messages['clinic_name.string'] = 'Username must be string';
			$validation_error_messages['clinic_name.max'] = 'Clinic name must be 40 characters long';
			$validation_error_messages['clinic_name.unique'] = 'Clinic name already been taken';
		} else if( $profile_type == 4) {
			$validation_rules['supplier_name'] = 'required|string|max:40';
			$validation_error_messages['supplier_name.required'] = 'Supplier name is required';
			$validation_error_messages['supplier_name.string'] = 'Username must be string';
			$validation_error_messages['supplier_name.max'] = 'Supplier name must be 40 characters long';
			$validation_error_messages['supplier_name.unique'] = 'Supplier name already been taken';
		} else {
			$validation_rules['first_name'] = 'required|string|max:40';
			$validation_rules['last_name'] = 'string|max:40';
			$validation_error_messages['first_name.required'] = 'First name is required';
		}

		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;

	}
	public function CaseDetailsValidation(Request $request, $method_type) {
		$validation_rules = [
			'title' => 'required|string|max:80',
			'description' => 'required|string|max:300',
			'animal_type' => 'required|integer',
			'priority' => 'required|string',
			'gender' => 'sometimes|string',
			'age' => 'sometimes|integer',
			'location_name' => 'required|string',
			'lat' => 'sometimes|numeric',
			'lng' => 'sometimes|numeric',
		];

		$validation_error_messages = [
			'title.required' => 'Title is required',
			'animal_type.required' => 'Category is required',
			'animal_type.integer' => 'Category must be valid integer',
			'priority.required' => 'Priority is required',
			'priority.string' => 'Priority must be string',

			'location_name.required' => 'Location Name is required',
			'location_name.string' => 'Location Name must be string',

			'gender.string' => 'Gender must be string',
			'age.integer' => 'Age must be integer',
			'lat.numeric' => 'Latitude must be numeric',
			'lng.numeric' => 'Longitude must be numeric'
		];

		if( $method_type == "update" ) {
			$validation_rules['id'] = 'required|integer';
			$validation_error_messages['id.required'] = 'Case Id is required';
			$validation_error_messages['id.integer'] = 'Case Id must be integer';
		}
		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}
	public function CaseOffersValidation(Request $request, $method_type) {

		$validation_rules = [
			'case_id' => 'required|integer',
			'offer_amount' => 'required|numeric|min:'.getMinimumThresholdAmount()
		];

		$validation_error_messages = [
			'case_id.required' => 'Case Id is required',
			'case_id.integer' => 'Case Id must be integer',
			'offer_amount.required' => 'Offer amount is required',
			'offer_amount.numeric' => 'Offer amount must be numeric',
			'offer_amount.min' => 'Minimum offer amount is '.getMinimumThresholdAmount()." AED"
		];

		if( $method_type == "update" ) {
			$validation_rules['id'] = 'required|integer';
			$validation_error_messages['id.required'] = 'Case Offer Id is required';
			$validation_error_messages['id.integer'] = 'Case Offer Id must be integer';
		}
		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}
    public function saveStripeCardValidation(Request $request, $method_type=NULL) {

        $validation_rules = [
            'number' => 'required|integer',
            'exp_month' => 'required|digits:2|between:1,12',
            'exp_year' => 'required|digits:4|between:0,12',
            'cvc' => 'required|numeric',
        ];

        $validation_error_messages = [

            'number.required' => 'Card number is required',
            'number.integer' => 'Card number must be integer',

            'exp_month.required' => 'Card expiry month is required',
            'exp_month.digits' => 'Card expiry month must 2 digits',

            'exp_year.required' => 'Card expiry year is required',
            'exp_year.digits' => 'Card expiry year must 4 digits',

            'cvc.required' => 'CVC is required',
            'cvc.numeric' => 'CVC must be numeric',

        ];

        $validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
        return $validator;
    }
    public function makePaymentValidation(Request $request, $method_type=NULL) {

        if ($method_type == "subscription"){
            $validation_rules = [
                'package_id' => 'required|integer',
                'amount' => 'required|numeric',
                'pm_id' => 'required|string',
                //			'identifier' => 'required|string',
            ];

            $validation_error_messages = [

                'package_id.required' => 'Package Id is required',
                'package_id.integer' => 'Package Id must be integer',

                'amount.required' => 'amount is required',
                'amount.numeric' => 'amount must be numeric',

                'pm_id.required' => 'pm_id is required',
//                'identifier.required' => 'Identifier is required',

            ];
        }elseif ($method_type == "subscription_invoice_payment"){
            $validation_rules = [
                'amount' => 'required|numeric',
                'pm_id' => 'required|string',
            ];

            $validation_error_messages = [
                'amount.required' => 'amount is required',
                'amount.numeric' => 'amount must be numeric',

                'pm_id.required' => 'pm_id is required',

            ];
        }else{
            $validation_rules = [
                'case_id' => 'required|integer',
                'offer_id' => 'required|integer',
                'amount' => 'required|numeric',
                'type' => 'required|string',
                //			'identifier' => 'required|string',
                'status' => 'required|integer',
            ];

            $validation_error_messages = [

                'case_id.required' => 'Case Id is required',
                'case_id.integer' => 'Case Id must be integer',

                'offer_id.required' => 'Offer Id is required',
                'offer_id.integer' => 'Offer Id must be integer',

                'amount.required' => 'amount is required',
                'amount.numeric' => 'amount must be numeric',

                'type.required' => 'Type is required',
                'identifier.required' => 'Identifier is required',

                'status.required' => 'Status is required',
                'status.integer' => 'Status must be integer',
            ];
        }


        $validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
        return $validator;
    }

    public function checkPaymentValidation(Request $request, $method_type=NULL) {

        $validation_rules = [
//            'case_id' => 'required|integer',
            'offer_id' => 'required|integer',
        ];

        $validation_error_messages = [

//            'case_id.required' => 'Case Id is required',
//            'case_id.integer' => 'Case Id must be integer',

            'offer_id.required' => 'Offer Id is required',
            'offer_id.integer' => 'Offer Id must be integer',
        ];

        $validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
        return $validator;
    }
	public function postCaseUpdateValidation(Request $request, $method_type=NULL) {

		$validation_rules = [
			'case_id' => 'required|integer',
			'user_id' => 'required|integer',
			'status' => 'required|integer',
			'title' => 'required|string',
			'description' => 'required|string',
			'update_datetime' => 'required|date_format:Y-m-d H:i:s|string'
		];
		$validation_error_messages = [
			'case_id.required' => 'Case Id is required',
			'case_id.integer' => 'Case Id must be integer',
			'user_id.required' => 'User Id is required',
			'user_id.integer' => 'User Id must be integer',
			'status.required' => 'Status is required',
			'status.integer' => 'Status must be integer',
			'title.required' => 'Title is required',
			'description.required' => 'Description is required',
			'update_datetime.required' => 'DateTime is required',
			'update_datetime.string' => 'DateTime must be string',
			'update_datetime.date_format' => 'DateTime must be format like: YYYY-MM-DD HH:mm:ss',
		];
		if( $method_type == "update" ) {
			$validation_rules['id'] = 'required|integer';
			$validation_error_messages['id.required'] = 'Case Post Update Id is required';
			$validation_error_messages['id.integer'] = 'Case Post Update Id must be integer';
		}

		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}
	public function addUserStoriesValidation(Request $request, $method_type=NULL) {

		// $validation_rules = [
		// 	'user_id' => 'required|integer'
		// ];
		// $validation_error_messages = [
		// 	'user_id.required' => 'User Id is required',
		// 	'user_id.integer' => 'User Id must be integer'
		// ];
		if( $method_type == "update" ) {
			$validation_rules['id'] = 'required|integer';
			$validation_error_messages['id.required'] = 'Story Id is required';
			$validation_error_messages['id.integer'] = 'Story Id must be integer';
			$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
			return $validator;
		}
	}
	public function deleteUserStoryByIdValidations(Request $request, $method_type=NULL) {

		$validation_rules = [
			'id' => 'required|integer'
		];
		$validation_error_messages = [
			'id.required' => 'id is required',
			'id.integer' => 'id must be integer'
		];
		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}
	public function storyLikeDislikeValidation(Request $request) {

		$validation_rules = [
			'story_id' => 'required|integer'
		];
		$validation_error_messages = [
			'story_id.required' => 'Story id is required',
			'story_id.integer' => 'Story id must be integer'
		];
		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}
	public function storyViewDislikeValidation(Request $request) {
		$validation_rules = [
			'story_id' => 'required|numeric'
		];
		$validation_error_messages = [
			'story_id.required' => 'Story id is required',
			'story_id.integer' => 'Story id must be numeric'
		];
		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}
	public function storyReplyDislikeValidation(Request $request) {

		$validation_rules = [
			'story_id' => 'required|numeric',
			'message' => 'required|string'
		];
		$validation_error_messages = [
			'story_id.required' => 'Story id is required',
			'story_id.integer' => 'Story id must be numeric',

			'message.required' => 'Message is required',
			'message.string' => 'Message must be string'
		];
		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}
	public function checkRequestValidations(Request $request) {

		$validation_rules = [
			'field_type' => 'required',
			'field_value' => 'required'
		];
		$validation_error_messages = [
			'field_type.required' => 'Field type is required',
			'field_value.required' => 'Field value is required'
		];
		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}
	public function acceptCaseOfferValidations(Request $request) {

		$validation_rules = [
			'offer_id' => 'required|numeric'
		];
		$validation_error_messages = [
			'offer_id.required' => 'Offer ID is required',
			'offer_id.numeric' => 'Offer ID must be numeric'
		];
		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}
	public function caseDetailsViewValidations(Request $request) {
		$validation_rules = [
			'case_id' => 'required|numeric'
		];
		$validation_error_messages = [
			'case_id.required' => 'Case ID is required',
			'case_id.numeric' => 'Case ID must be numeric'
		];
		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}
	public function getUserNotificationsByDateValidations(Request $request) {
		$validation_rules = [
			'date_group' => 'required|date_format:Y-m-d|string'
		];
		$validation_error_messages = [
			'date_group.required' => 'Date Group value is required',
			'date_group.string' => 'Date Group value must be string',
			'date_group.date_format' => 'Date Group value must be format like:'.date("Y-m-d"),
		];
		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}
	public function createNotificationValidations(Request $request) {
		$validation_rules = [
			'heading' => 'required',
			'description' => 'required|max:200',
			'is_read' => 'numeric',
			'is_sent' => 'numeric',
			'status' => 'numeric',
		];
		$validation_error_messages = [
			'heading.required' => 'heading is required',
			'is_read.numeric' => 'is read must be in numeric',
			'is_sent.numeric' => 'is sent must be in numeric',
			'status.numeric' => 'status must be in numeric',
			'description.required' => 'Description is required',

		];
		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}

	public function createRatingValidation(Request $request) {
		$validation_rules = [
			'case_id' => 'required|numeric',
			'rating' => 'required|numeric|between:1,5',
		];
		$validation_error_messages = [
			'case_id.required' => 'Case Id is required',
			'case_id.numeric' => 'Case Id must be numeric',
			'rating.required' => 'Rating Id is required',
			'rating.numeric' => 'Rating must be numeric',
			'rating.between' => 'Rating must be between 1 - 5',
		];
		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}

	public function getRatingByCaseIdValidation(Request $request) {
		$validation_rules = [
			'case_id' => 'required|numeric'
		];
		$validation_error_messages = [
			'case_id.required' => 'Case Id is required',
			'case_id.numeric' => 'Case Id must be numeric',
		];
		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}

	public function getRatingByUserIdValidation(Request $request) {
		$validation_rules = [
			'user_id' => 'required|numeric'
		];
		$validation_error_messages = [
			'user_id.required' => 'User Id is required',
			'user_id.numeric' => 'User Id must be numeric',
		];
		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}

	public function getUserStoriesValidations(Request $request) {
		$validation_rules = [
			'user_id' => 'required|numeric'
		];
		$validation_error_messages = [
			'user_id.required' => 'User Id is required',
			'user_id.numeric' => 'User Id must be numeric',
		];
		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}

	public function getHomePageContentValidations(Request $request) {
		$validation_rules = [
			'lat' => 'required|numeric',
			'lng' => 'required|numeric'
		];
		$validation_error_messages = [
			'lat.required' => 'Latitude is required',
			'lat.numeric' => 'Latitude must be numeric',
			'lng.required' => 'Longitude is required',
			'lng.numeric' => 'Longitude must be numeric',
		];
		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}

    public function searchCasesOffersValidations(Request $request) {
        $validation_rules = [
            'lat' => 'required|numeric',
            'lng' => 'required|numeric'
        ];
        $validation_error_messages = [
            'lat.required' => 'Latitude is required',
            'lat.numeric' => 'Latitude must be numeric',
            'lng.required' => 'Longitude is required',
            'lng.numeric' => 'Longitude must be numeric',
        ];
        $validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
        return $validator;
    }

	public function advanceSearchValidations(Request $request) {
		$validation_rules = [
			'lat' => 'required|numeric',
			'lng' => 'required|numeric'
		];
		$validation_error_messages = [
			'lat.required' => 'Latitude is required',
			'lat.numeric' => 'Latitude must be numeric',
			'lng.required' => 'Longitude is required',
			'lng.numeric' => 'Longitude must be numeric',
		];
		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}


	public function closeACaseValidation(Request $request) {
		$validation_rules = [
			'case_id' => 'required|numeric'
		];
		$validation_error_messages = [
			'case_id.required' => 'Case Id is required',
			'case_id.numeric' => 'Case Id must be numeric',
		];
		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}



	public function activateTheCaseValidation(Request $request) {
		$validation_rules = [
			'case_id' => 'required|numeric'
		];
		$validation_error_messages = [
			'case_id.required' => 'Case Id is required',
			'case_id.numeric' => 'Case Id must be numeric',
		];
		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}

	public function deactivateTheCaseValidation(Request $request) {
		$validation_rules = [
			'case_id' => 'required|numeric'
		];
		$validation_error_messages = [
			'case_id.required' => 'Case Id is required',
			'case_id.numeric' => 'Case Id must be numeric',
		];
		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}

	public function getAllAutomationOffersValidation(Request $request) {
		$validation_rules = [
			'location_id' => 'required|string'
		];
		$validation_error_messages = [
			'location_id.required' => 'Location is required',
			'location_id.string' => 'Location must be string',
		];
		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}

	public function deleteCaseImageValidation(Request $request) {
		$validation_rules = [
			'case_id' => 'required|numeric',
			'image_name' => 'required|string'
		];
		$validation_error_messages = [
			'case_id.required' => 'Case Id is required',
			'case_id.numeric' => 'Case Id must be numeric',

			'image_name.required' => 'Image name is required',
			'image_name.string' => 'Image name is must be string',
		];
		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}

	public function userPublicProfileViewValidations(Request $request) {
		$validation_rules = [
			'user_id' => 'required|numeric'
		];
		$validation_error_messages = [
			'user_id.required' => 'User Id is required',
			'user_id.numeric' => 'User Id must be numeric',
		];
		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}
	public function checkReferraluserNameExistsValidations(Request $request) {
		$validation_rules = [
			'referral_username' => 'required'
		];
		$validation_error_messages = [
			'referral_username.required' => 'Usrename is required',
		];
		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}

	public function generateStreamTokenValidations(Request $request) {
		$validation_rules = [
			'user_identity' => 'required'
		];
		$validation_error_messages = [
			'user_identity.required' => 'User Identity is required',
		];
		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}

	public function profileTypeCheckValidations(Request $request) {
		$validation_rules = [
			'profile_type' => 'required',
		];
		$validation_error_messages = [
			'profile_type.required' => 'Profile type is required',
		];
		$validator = Validator::make($request->all(), $validation_rules , $validation_error_messages);
		return $validator;
	}

	public function profileTypeCheckValidationsWebSignupForm(Request $request) {
		$validation_rules = [
			'profile_type' => 'required',
			'country_code' => 'required',
			'phone' => 'required|unique:users,phone_number',
			'username' => 'required|string|max:40|regex:/^[a-z0-9@_\-]+$/|unique:users,username',
			'email' => 'required|email|unique:users,email',
			'first_name' => 'required_if:profile_type,2,3|string|max:100',
    		'last_name' => 'string|max:100',
			'location' => [
				function ($attribute, $value, $fail) {
					if (in_array(request()->input('profile_type'), [1, 4]) && empty($value)) {
						$fail('Location is required when the profile type is Clinic or Supplier.');
					}
				},
				function ($attribute, $value, $fail) {
					if (in_array(request()->input('profile_type'), [1, 4]) && empty($value)) {
						if (!Area::where('id', $value)->where('status', 1)->exists()) {
							$fail('Location was not available or has been disabled/removed.');
						}
					}

				},
			],
		];
		$validation_error_messages = [
			'profile_type.required' => 'Profile type is required',

			'country_code.required' => 'Country code is required',

			'phone.required' => 'Phone Number is required',
			'phone.unique' => 'Phone number already associated with another account',

			'email.required' => 'Email is required',
			'email.unique' => 'Email has already been taken',

			'username.required' => 'Username is required',
			'username.string' => 'Username must be string',
			'username.max' => 'Username must be 40 characters long',
			'username.unique' => 'Username has already been taken',

			'username.regex' => 'Username must be in lowercase letters (a-z), numbers (0-9) and the symbols "@" (at), "_" (underscore), and "-" (hyphen)',

			'location.required' => 'Location is required',
			'location.integer' => 'Location must be string',
		];


		if($request->profile_type == 1) {
			$validation_rules['clinic_name'] = 'required|string|max:40';
			$validation_error_messages['clinic_name.required'] = 'Clinic name is required';
			$validation_error_messages['clinic_name.string'] = 'Username must be string';
			$validation_error_messages['clinic_name.max'] = 'Clinic name must be 40 characters long';
			$validation_error_messages['clinic_name.unique'] = 'Clinic name already been taken';
		} else if(  $request->profile_type == 4) {
			$validation_rules['supplier_name'] = 'required|string|max:40';
			$validation_error_messages['supplier_name.required'] = 'Supplier name is required';
			$validation_error_messages['supplier_name.string'] = 'Username must be string';
			$validation_error_messages['supplier_name.max'] = 'Supplier name must be 40 characters long';
			$validation_error_messages['supplier_name.unique'] = 'Supplier name already been taken';
		}

		$validator = $request->validate($validation_rules , $validation_error_messages);
		return $validator;
	}

	public function getUserData(Request $request) {
		$session = $request->authToken;
		if( $session != '' ) {
			$token = SessionTokens::where('token', $session)->first();
			if( $token ) {
				$this->user_id_from_token = $token->user_id;
			}
		}
	}
}
