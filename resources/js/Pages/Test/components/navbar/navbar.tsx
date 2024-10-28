"use client";
import styles from "./navbar.module.css";
import { FaSignOutAlt } from "react-icons/fa";
import { Navbar, Nav, NavDropdown, Container } from "react-bootstrap";
// import { logout } from "../../utils/auth_operations";
// import { authenticated_user } from "../../types/user_types";
import { get_auth_session } from '../../utils/auth_operations';
import { useEffect, useState } from "react";
const handle_logout = ()=>{
    // logout()
}   
const Navbar_ = ({logout}:any) => {
    const [name,set_name]=useState<string>("")
  // useEffect(()=>{
  //   (async()=>{
  //       const session :any= await get_auth_session();
  //       let user:authenticated_user = await JSON.parse(session?.value)
  //       set_name(`${user.name} ${user.surname}`)
  //   })()
  // },[])
  return (
    <div className={styles.container}>
      <Navbar
        bg="transparent"
        expand="lg"
        className={styles.nav}
        variant="dark"
      >
        <Container aria-expanded="true" className={styles.nav_container} fluid>
            <Navbar.Brand><img src="/logo_egnss4all_white.png"  style={{height:"30px"}}
            className="d-inline-block align-top"
            alt="PIC2BIM"
            /></Navbar.Brand>
          <Navbar.Toggle
            aria-controls="basic-navbar-nav"
            type="button"
            aria-expanded="false"
            aria-label="Toggle Navigation"
            className={styles.toggler_custom}
          ></Navbar.Toggle>
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className={`me-auto ${styles.custom_me_auto}`} >
                <Nav.Link href="/home" className={styles.link}>Home</Nav.Link>
                <Nav.Link href="/about" className={styles.link}>Release Notes</Nav.Link>
            </Nav>
            <Nav className={`ms-auto ${styles.custom_me_auto}`} >
                <Nav.Link href="/about" className={styles.link}>Change Password</Nav.Link>
              <span className={styles.separator}>|</span>
                <Nav.Link>CZ</Nav.Link>
                <Nav.Link>EN</Nav.Link>
                <Nav.Link>IT</Nav.Link>
              <span className={styles.separator}>|</span>
            <Nav.Item className={`d-flex align-items-center  ${styles.user_text}`}  >
              {/* <span className={styles.link} >{name}</span> */}
              <span className={styles.link} >{"farmer farmer"}</span>

            </Nav.Item>
              <span className={styles.separator}>|</span>
                <Nav.Link onClick={logout} className={styles.link} >
                  {" "}
                  <div style={{display:"flex"}}>
                  <FaSignOutAlt size={18} className={ `${styles.logout} `} style={{verticalAlign:"sub"}}/> <div>Logout</div></div>
                </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </div>
  );
};

export default Navbar_;
