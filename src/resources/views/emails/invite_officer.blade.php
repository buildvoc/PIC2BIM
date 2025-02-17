@component('mail::message')
# Welcome to {{ config('app.name') }}

Please use the link below to sign up for {{ config('app.name') }}.

@component('mail::button', ['url' => $signupUrl])
Sign Up
@endcomponent

Thanks,<br>
{{ config('app.name') }} Team
@endcomponent