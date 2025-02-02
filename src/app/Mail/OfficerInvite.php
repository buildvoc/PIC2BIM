<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OfficerInvite extends Mailable
{
    use Queueable, SerializesModels;

    public $signupUrl;

    /**
     * Create a new message instance.
     */
    public function __construct($signupUrl)
    {
        $this->signupUrl = $signupUrl;
    }

    /**
     * Get the message content definition.
     */
    public function build()
    {
        return $this->markdown('emails.invite_officer')
                    ->subject('Sign Up for ' . config('app.name'))
                    ->with('signupUrl', $this->signupUrl);
    }
}
