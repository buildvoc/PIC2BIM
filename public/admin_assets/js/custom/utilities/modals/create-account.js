"use strict";

// Class definition
var KTCreateAccount = function () {
	// Elements
	var modal;	
	var modalEl;

	var stepper;
	var form;
	var formSubmitButton;
	var formContinueButton;
 
	// Variables
	var stepperObj;
	var validations = [];

	// Private Functions
	var initStepper = function () {
		// Initialize Stepper
		stepperObj = new KTStepper(stepper);

		// Stepper change event
		stepperObj.on('kt.stepper.changed', function (stepper) {
			console.log(stepperObj.getCurrentStepIndex());
			if (stepperObj.getCurrentStepIndex() === 4) {
				formSubmitButton.classList.remove('d-none');
				formSubmitButton.classList.add('d-inline-block');
				formContinueButton.classList.add('d-none');
			} else if (stepperObj.getCurrentStepIndex() === 3) {
				
				formSubmitButton.classList.add('d-none');
				formContinueButton.classList.add('d-none');
			} else {
				formSubmitButton.classList.remove('d-none');
				formSubmitButton.classList.add('d-inline-block');
				formContinueButton.classList.add('d-none');
				formContinueButton.classList.remove('d-inline-block');
				handleRadioButtonChange();
			}
		});

		// Validation before going to next page
		stepperObj.on('kt.stepper.next', function (stepper) {
			
			var validator = validations[stepper.getCurrentStepIndex() - 1];
			console.log(validator);
			if (validator) {
				validator.validate().then(function (status) {
					if (status == 'Valid') {
						stepper.goNext();
						KTUtil.scrollTop();
					} else {
						Swal.fire({
							text: "Required fields are missing or invalid",
							icon: "error",
							buttonsStyling: false,
							confirmButtonText: "Ok, got it!",
							customClass: {
								confirmButton: "btn btn-light"
							}
						}).then(function () {
							KTUtil.scrollTop();
						});
					}
				});
			} else {
				console.log("HEREE");
				stepper.goNext();
				KTUtil.scrollTop();
			}
		});

		// Prev event
		stepperObj.on('kt.stepper.previous', function (stepper) {
			console.log('stepper.previous');
			stepper.goPrevious();
			
			formSubmitButton.classList.add('d-none');
			formContinueButton.classList.remove('d-none');
			formContinueButton.classList.add('d-inline-block');

			KTUtil.scrollTop();
		});
	}

	var handleForm = function() {
		formSubmitButton.addEventListener('click', function (e) {
			var validator = validations[1];
			validator.validate().then(function (status) {
				if (status == 'Valid') {
					
					e.preventDefault();
					formSubmitButton.disabled = true;
					document.querySelector("#submit_buttononon").setAttribute('data-kt-indicator', 'on');
					formSubmitButton.disabled = false;
					form.submit();

				} else {
					Swal.fire({
						text: "Required fields are missing or invalid",
						icon: "error",
						buttonsStyling: false,
						confirmButtonText: "Ok, got it!",
						customClass: {
							confirmButton: "btn btn-light"
						}
					}).then(function () {
						KTUtil.scrollTop();
					});
				}
			});
		});

		// Expiry month. For more info, plase visit the official plugin site: https://select2.org/
        $(form.querySelector('[name="card_expiry_month"]')).on('change', function() {
            // Revalidate the field when an option is chosen
            validations[3].revalidateField('card_expiry_month');
        });

		// Expiry year. For more info, plase visit the official plugin site: https://select2.org/
        $(form.querySelector('[name="card_expiry_year"]')).on('change', function() {
            // Revalidate the field when an option is chosen
            validations[3].revalidateField('card_expiry_year');
        });

		// Expiry year. For more info, plase visit the official plugin site: https://select2.org/
        $(form.querySelector('[name="business_type"]')).on('change', function() {
            // Revalidate the field when an option is chosen
            validations[2].revalidateField('business_type');
        });
	}

	var initValidation = function () {
		
		// Step 1
		validations.push(FormValidation.formValidation(
			form,
			{
				fields: {
					profile_type: {
						validators: {
							notEmpty: {
								message: 'Account type is required'
							}
						}
					}
				},
				plugins: {
					trigger: new FormValidation.plugins.Trigger(),
					bootstrap: new FormValidation.plugins.Bootstrap5({
						rowSelector: '.fv-row',
                        eleInvalidClass: '',
                        eleValidClass: ''
					})
				}
			}
		));


		// Step 2
		validations.push(FormValidation.formValidation(
			form,
			{
				fields: {
					'supplier_name': {
						validators: {
							notEmpty: {
								enabled: false,
								message: 'Supplier name is required'
							}
						}
					},
					'clinic_name': {
						validators: {
							notEmpty: {
								enabled: false,
								message: 'Clinic name is required'
							}
						}
					},
					'location': {
						validators: {
							notEmpty: {
								message: 'Location is required'
							}
						}
					},
					'first_name': {
						validators: {
							notEmpty: {
								enabled: false,
								message: 'First name is required'
							}
						}
					},
					'last_name': {
						validators: {
							notEmpty: {
								enabled: false,
								message: 'Last name is required'
							}
						}
					},
					'username': {
						validators: {
							notEmpty: {
								enabled: false,
								message: 'Username is required'
							},
							remote: {
								url: baseURL+'signupCheckFieldValidations',
								type: 'GET',
								delay: 1000,
								data: function() {
									return {
										field_value: form.querySelector('[name="username"]').value,
										field_type: "username"
									};
								},		
								message: 'The Username is already registered'
							}
						}
					},
					'country_code': {
						validators: {
							notEmpty: {
								enabled: false,
								message: 'Country Code is required'
							}
						}
					},
					'phone': {
						validators: {
							notEmpty: {
								enabled: false,
								message: 'Phone is required'
							},
							numeric: {
								message: 'Phone must be a numeric value'
							},
							remote: {
								url: baseURL+'signupCheckFieldValidations',
								type: 'GET',
								delay: 1000,
								data: function() {
									return {
										field_value: "+"+form.querySelector('[name="country_code"]').value+""+form.querySelector('[name="phone"]').value,
										field_type: "phone"
									};
								},		
								message: 'Phone # is already registered'
							}
						}
					},
					'email': {
						validators: {
							notEmpty: {
								enabled: false,
								message: 'Email is required'
							},
							emailAddress: {
							  message: 'The email address is not valid'
							},
							remote: {
								url: baseURL+'signupCheckFieldValidations',
								type: 'GET',
								delay: 1000,
								data: function() {
									return {
										field_value: form.querySelector('[name="email"]').value,
										field_type: "email"
									};
								},		
								message: 'Email is already registered'
							}
						}
					}
				},
				plugins: {
					trigger: new FormValidation.plugins.Trigger(),
					// Bootstrap Framework Integration
					bootstrap: new FormValidation.plugins.Bootstrap5({
						rowSelector: '.fv-row',
						eleInvalidClass: '',
						eleValidClass: ''
					})
				}
			}
		));
	}

	function handleRadioButtonChange() {
		console.log("HURRAH");
		const supplierNameField = form.querySelector('[name="supplier_name"]');
		const clinicNameField = form.querySelector('[name="clinic_name"]');
		const locationField = form.querySelector('[name="location"]');
		
		const firstNameField = form.querySelector('[name="first_name"]');
		const lastNameField = form.querySelector('[name="last_name"]');
		const usernameField = form.querySelector('[name="username"]');
		const countryCodeField = form.querySelector('[name="country_code"]');
		const phoneField = form.querySelector('[name="phone"]');
		const emailField = form.querySelector('[name="email"]');
	
		const profile_type = document.querySelector('input[name="profile_type"]:checked').value;
	
		$("#supplier_name_container").hide();
		$("#location_name_container").hide();
		$("#clinic_name_container").hide();
	
		if( profile_type == 1 ) {
			$("#clinic_name_container").show();
			$("#location_name_container").show();
		} else if( profile_type == 4 ) {
			$("#supplier_name_container").show();
			$("#location_name_container").show();
		}
	
		firstNameField.setAttribute('required', 'required');
		validations[1].enableValidator('first_name', 'notEmpty');
	
		lastNameField.setAttribute('required', 'required');
		validations[1].enableValidator('last_name', 'notEmpty');
	
		usernameField.setAttribute('required', 'required');
		validations[1].enableValidator('username', 'notEmpty');
	
		countryCodeField.setAttribute('required', 'required');
		validations[1].enableValidator('country_code', 'notEmpty');
	
		phoneField.setAttribute('required', 'required');
		validations[1].enableValidator('phone', 'notEmpty');
	
		emailField.setAttribute('required', 'required');
		validations[1].enableValidator('email', 'notEmpty');
	
		const isSupplierSelected = document.querySelector('input[name="profile_type"]:checked').value === '4';
		const isClinicSelected = document.querySelector('input[name="profile_type"]:checked').value === '1';
		if (isSupplierSelected) {
			supplierNameField.setAttribute('required', 'required');
			validations[1].enableValidator('supplier_name', 'notEmpty');
			$("#supplier_name_label_required").addClass('required');
	
			locationField.setAttribute('required', 'required');
			validations[1].enableValidator('location', 'notEmpty');
			$("#location_label_required").addClass('required');
			
		} else if (isClinicSelected) {
			clinicNameField.setAttribute('required', 'required');
			validations[1].enableValidator('clinic_name', 'notEmpty');
			$("#clinic_name_label_required").addClass('required');
	
			locationField.setAttribute('required', 'required');
			validations[1].enableValidator('location', 'notEmpty');
			$("#location_label_required").addClass('required');
		} else {
	
			clinicNameField.removeAttribute('required', 'required');
			validations[1].disableValidator('clinic_name', 'notEmpty');
	
			supplierNameField.removeAttribute('required');
			validations[1].disableValidator('supplier_name', 'notEmpty');
	
			locationField.removeAttribute('required', 'required');
			validations[1].disableValidator('location', 'notEmpty');
	
		}
	}

	return {
		// Public Functions
		init: function () {
			// Elements
			modalEl = document.querySelector('#kt_modal_create_account');

			if ( modalEl ) {
				modal = new bootstrap.Modal(modalEl);	
			}					

			stepper = document.querySelector('#kt_create_account_stepper');

			if ( !stepper ) {
				return;
			}

			form = stepper.querySelector('#kt_create_account_form');
			formSubmitButton = stepper.querySelector('[data-kt-stepper-action="submit"]');
			formContinueButton = stepper.querySelector('[data-kt-stepper-action="next"]');

			initStepper();
			initValidation();
			handleForm();
		}
	};
}();




// On document ready
KTUtil.onDOMContentLoaded(function() {
    KTCreateAccount.init();
});