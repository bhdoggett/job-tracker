import { NavLink } from "react-router-dom";
import styles from "./Sidebar.module.css";

const projectLinks = [
  { to: "/projects", label: "Projects" },
  { to: "/tasks", label: "Tasks" },
  { to: "/time-entries", label: "Time Entries" },
  { to: "/invoices", label: "Invoices" },
  { to: "/expenses", label: "Expenses" },
];

const businessLinks = [
  { to: "/business", label: "Business" },
];

const settingsLinks = [
  { to: "/profile", label: "Profile" },
];

function NavGroup({ label, links }: { label: string; links: { to: string; label: string }[] }) {
  return (
    <div className={styles.group}>
      <div className={styles.groupLabel}>{label}</div>
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
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>Job Tracker</div>
      <nav className={styles.nav}>
        <NavGroup label="Client Work" links={projectLinks} />
        <NavGroup label="General" links={businessLinks} />
        <NavGroup label="Settings" links={settingsLinks} />
      </nav>
    </aside>
  );
}
