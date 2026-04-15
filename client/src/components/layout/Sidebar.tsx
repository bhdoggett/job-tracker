import { NavLink } from "react-router-dom";
import styles from "./Sidebar.module.css";

const links = [
  { to: "/projects", label: "Projects" },
  { to: "/tasks", label: "Tasks" },
  { to: "/time-entries", label: "Time Entries" },
  { to: "/invoices", label: "Invoices" },
];

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>Job Tracker</div>
      <nav className={styles.nav}>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `${styles.navLink}${isActive ? ` ${styles.navLinkActive}` : ""}`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
