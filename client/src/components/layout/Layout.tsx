import { Outlet } from "react-router-dom";
import { TopNav } from "./TopNav";
import styles from "./Layout.module.css";

export function Layout() {
  return (
    <div className={styles.layout}>
      <TopNav />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
