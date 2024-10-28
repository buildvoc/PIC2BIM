
import Login from "../views/login/Login";
import { useEffect, useState,useMemo, memo,useCallback } from "react";
import Dashboard from "../views/dashboard/Dashboard";
import { Auth_LAYOUT } from "../types/auth_layout";
import {login} from "../api/api_client"
import useLocalStorage from "../hooks/useLocalStorage";
function App() {
  const [activeLayout, setActiveLayout] = useState(Auth_LAYOUT.LOGIN);
  const [err,set_err] = useState('')
  const [user, setUser] = useLocalStorage(
    "user",
  null
  );

  const handleSubmit = async (event:any) => {
    console.log('Username:', event.username);
    console.log('Password:', event.password);
    const data:any = await login(event)
    if(!data.error)
    {
      setUser(data)
      setActiveLayout(Auth_LAYOUT.Dashboard)
      set_err("")
    }
    else
    {
      set_err(data.error)
    }

  };

  const handleLogout = () => {
    setActiveLayout(Auth_LAYOUT.LOGIN)

  }

  // useEffect(()=>{
  //   if(user)
  //   {
  //     setActiveLayout(Auth_LAYOUT.Dashboard)

  //   }
  // },[])
  return (
    <div className="App" data-testid="App">
      {
        activeLayout === Auth_LAYOUT.LOGIN && (
      <Login handleSubmit={handleSubmit} err={err} />
        )
      }
           {
        activeLayout === Auth_LAYOUT.Dashboard && (
          <Dashboard logout={handleLogout} /> 
        )
      }
      {/*  */}
  
    </div>
  );
}

export default memo(App);
