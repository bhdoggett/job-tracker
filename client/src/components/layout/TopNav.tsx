import { NavLink } from "react-router-dom";
import { JobzLogo } from "./JobzLogo";
import styles from "./TopNav.module.css";

export function TopNav() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `${styles.link}${isActive ? ` ${styles.linkActive}` : ""}`;

  return (
    <nav className={styles.nav}>
      <NavLink to="/projects" className={styles.brand}>
        <JobzLogo className={styles.logo} />
      </NavLink>
      <div className={styles.links}>
        <NavLink to="/business" className={linkClass}>Business</NavLink>
        <NavLink to="/projects" className={linkClass}>Projects</NavLink>
        <NavLink to="/reports" className={linkClass}>Reports</NavLink>
      </div>
      <NavLink to="/profile" className={({ isActive }) => `${styles.profileLink}${isActive ? ` ${styles.linkActive}` : ""}`}>
        Profile
      </NavLink>
    </nav>
  );
}
