import { usePage } from '@inertiajs/react';
import styles from "./login.module.css"
import { PageProps } from '@/types';

export function Edit({ }: PageProps) {

const { status } = usePage<{
  status : string
}>().props;
return (
    <div className={styles.container}>
       <div className={styles.login}>
        <form  className={styles.login_form}>
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
          {/* { err && <p className="danger">{err}</p>} */}
        </form>
      </div>
    </div>
)
}
export default Edit;