import { NavLink } from "react-router-dom";
import { JobzLogo } from "./JobzLogo";
import styles from "./TopNav.module.css";

export function TopNav() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `${styles.link}${isActive ? ` ${styles.linkActive}` : ""}`;

  return (
    <nav className={styles.nav}>
      {/* SVG clip-path definition — objectBoundingBox scales it per-element */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <clipPath id="jobz-tab" clipPathUnits="objectBoundingBox">
            {/*
              Folder tab: angled sides + rounded top corners.
              From bottom-left → up angled left side → rounded top-left →
              flat top → rounded top-right → down angled right side → bottom-right.
              Y-values use ~22% of height for corner curvature (≈8px on a 36px tall tab).
            */}
            <path d="M 0 1 L 0.04 0.22 Q 0.08 0 0.16 0 L 0.84 0 Q 0.92 0 0.96 0.22 L 1 1 Z" />
          </clipPath>
        </defs>
      </svg>

      <NavLink to="/projects" className={styles.brand}>
        <JobzLogo className={styles.logo} />
      </NavLink>
      <div className={styles.links}>
        <NavLink to="/business" className={linkClass}>Business</NavLink>
        <NavLink to="/projects" className={linkClass}>Projects</NavLink>
        <NavLink to="/reports" className={linkClass}>Reports</NavLink>
        <div className={styles.spacer} />
        <NavLink to="/profile" className={linkClass}>Profile</NavLink>
      </div>
    </nav>
  );
}
