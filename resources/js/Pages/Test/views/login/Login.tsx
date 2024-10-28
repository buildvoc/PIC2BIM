
import styles from "./login.module.css"
import React, { useState } from 'react';


export function Login({handleSubmit,err}:any) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const handleChange = (event:any) => {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name]: value // Update the appropriate field (username or password)
    });
  };
  
  function handle(e:any)
  {
    e.preventDefault();
    handleSubmit(formData)
  }

return (
    <div className={styles.container}>
       <div className={styles.login}>
        <form onSubmit={handle}  className={styles.login_form}>
          <div className={styles.login_logo}></div>
          <table>
            <tbody>
            <tr>
              <td>
                <label itemType="name" title="Login:" className={styles.label}>
                  User name:
                </label>
              </td>
              <td>
                <input
                  className={`form-control ${styles.form_control}`}
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  />
              </td>
            </tr>
            <tr>
              <td>
                <label itemType="name" title="Login:" className={styles.label}>
                  Password:
                </label>
              </td>
              <td>
                <input
                  className={`form-control ${styles.form_control}`}
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </td>
            </tr>
            </tbody>
          </table>
          <button
            className={`btn btn-primary my-4 ${styles.btn} ${styles.btn_primary} ${styles.btn_login}`}
            type="submit"
            value="enter"
          >
            ENTER
          </button>
          { err && <p className="danger">{err}</p>}
        </form>
      </div>
    </div>
)
}
export default Login;