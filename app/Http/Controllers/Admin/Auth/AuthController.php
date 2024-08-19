<?php
namespace App\Http\Controllers\Admin\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    function index(){
        if(isset(auth()->user()->id)){
            return redirect('admin/dashboard');
        }
		return view('admin.authentication.login');
	}
	public function logout(Request $request)
    {
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect()->route('login.page');
    }
	public function login(LoginRequest $request)
    {
        $request->validated();
        $userCheck = User::where(['login' => $request->email])->first();        
        if(!$userCheck){
            return redirect()->route('login.page')->with('error','Invalid Credentials')->withInput();
        }
        $user = User::where(['login' => $request->email])->first();
        Auth::login($user);
        return redirect()->route('admin.users.index');
    }
	public function loginPage(Request $request)
    {
        if(!$request->session()->has('invalidlogin')){
            $request->session()->put('invalidlogin', 0);
        }
        return view('admin.authentication.login');
    }
}
