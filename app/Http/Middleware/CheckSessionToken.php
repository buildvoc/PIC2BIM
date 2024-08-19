<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
use App\Models\SessionTokens;
use App\Models\User;
use Carbon\Carbon;

class CheckSessionToken
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next)
    {
        $authToken = $request->authToken;
        if( $authToken ) {
            $currentTimestamp = Carbon::now();
            $session = SessionTokens::where('token', $authToken)->where('status', 1)->where('expiry', '>', $currentTimestamp)->first();
            if( $session ) {
                if( !isset($session->id) || $session->id == '' || !is_numeric($session->id) ) {
                    $this->onErrorResponse();
                } else {
                    if( isset($session->user_id) && $session->user_id != '' && is_numeric($session->user_id) && $session->user_id > 0 ) {
                        $user = User::find($session->user_id);
                        if( $user != '' && isset($user->id) ) {
                            if( $user->status == 1 ) {
                                if( $user->deleted_at == "" || $user->deleted_at == NULL ) {
                                    if( $user->is_deleted == 1) {
                                        $this->onErrorResponseDeletedAccount();
                                    }        
                                } else {
                                    $this->onErrorResponseDeletedAccount();
                                }
                            } else {
                                $this->onErrorResponseDeletedAccount();
                            }
                        } else {
                            $this->onErrorResponseDeletedAccount();
                        }
                    } else {
                        $this->onErrorResponseDeletedAccount();
                    }
                }
            } else {
                $this->onErrorResponse();
            }
        } else {
            $this->onErrorResponse();
        }
        return $next($request);
    }

    public function onErrorResponse () {
        echo json_encode(array("status"=>401,"message"=>"Session Mismatched, Please try to login again","error"=>"Access denied"));
        header('HTTP/1.1 401 Authorization Required');
        header('WWW-Authenticate: Basic realm="Access denied"');
        exit;
    }

    public function onErrorResponseDeletedAccount () {
        echo json_encode(array("status"=>401,"message"=>"User Blocked","error"=>"Access denied"));
        header('HTTP/1.1 401 Authorization Required');
        header('WWW-Authenticate: Basic realm="Access denied"');
        exit;
    }
}
