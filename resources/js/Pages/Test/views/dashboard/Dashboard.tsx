
import styles from "./dashboard.module.css"
import Navbar from "../../components/navbar/navbar";

export function Dashboard({logout}:any) {
return (
    <div className={styles.container}>
          <div className={styles.content}>
          <Navbar logout={logout}/>
          </div>
      </div>
)
}
export default Dashboard;