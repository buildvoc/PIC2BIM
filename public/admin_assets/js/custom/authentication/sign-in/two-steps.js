"use strict";

// Class Definition
var KTSigninTwoSteps = function() {
    // Elements
    var form;
    var submitButton;

    // Handle form
    var handleForm = function(e) {
        // Handle form submit
        submitButton.addEventListener('click', function (e) {
            e.preventDefault();

            var validated = true;
            var inputArray = [];
            var i = 0;
            var inputs = [].slice.call(form.querySelectorAll('input[maxlength="1"]'));
            inputs.map(function (input) {
                if (input.value == '' || input.value.length == 0) {
                    validated = false;
                }
                inputArray[i] = input.value;
                i++;
            });

            if (validated === true) {

                $.ajax({
                    type:'Post',
                    url: baseURL+'admin/login',
                    data: {data:inputArray},
                    success: function (data) {
                            if(data == 1){
                                window.location.href = baseURL+'admin/dashboard';
                            }
                            else if(data == 0){

                                swal.fire({
                                    text: "Please Enter Valid Verification Code",
                                    icon: "error",
                                    buttonsStyling: false,
                                    confirmButtonText: "Ok, got it!",
                                    customClass: {
                                        confirmButton: "btn fw-bold btn-light-primary"
                                    }
                                }).then(function() {
                                    KTUtil.scrollTop();
                                });
                            }
                            else if(data == 2){
                                swal.fire({
                                    text: "You have entered a wrong verification code twice and this is your last try. If your verification code is incorrect again, your account will be blocked.",
                                    icon: "error",
                                    buttonsStyling: false,
                                    confirmButtonText: "Ok, got it!",
                                    customClass: {
                                        confirmButton: "btn fw-bold btn-light-primary"
                                    }
                                }).then(function() {
                                    KTUtil.scrollTop();
                                });
                            }
                            else if(data == 3){

                                swal.fire({
                                    text: "Your account is deactivated, please contact Admin to activate your account",
                                    icon: "error",
                                    buttonsStyling: false,
                                    confirmButtonText: "Ok, got it!",
                                    customClass: {
                                        confirmButton: "btn fw-bold btn-light-primary"
                                    }
                                }).then(function() {
                                    KTUtil.scrollTop();

                                });
                                setInterval(function () { window.location.href = baseURL+"admin/login";}, 5000)

                            }
                    },
                    error: function (data) {
                        swal.fire({
                            text: "Please enter the verification code first and try again",
                            icon: "error",
                            buttonsStyling: false,
                            confirmButtonText: "Ok, got it!",
                            customClass: {
                                confirmButton: "btn fw-bold btn-light-primary"
                            }
                        }).then(function() {
                            KTUtil.scrollTop();
                        });
                    }
                });
            }
             else {

                swal.fire({
                    text: "Please enter the verification code first and try again",
                    icon: "error",
                    buttonsStyling: false,
                    confirmButtonText: "Ok, got it!",
                    customClass: {
                        confirmButton: "btn fw-bold btn-light-primary"
                    }
                }).then(function() {
                    KTUtil.scrollTop();
                });
            }
        });
    }

    // Public functions
    return {
        // Initialization
        init: function() {
            form = document.querySelector('#kt_sing_in_two_steps_form');
            submitButton = document.querySelector('#kt_sing_in_two_steps_submit');

            handleForm();
        }
    };
}();

// On document ready
KTUtil.onDOMContentLoaded(function() {
    KTSigninTwoSteps.init();
});
