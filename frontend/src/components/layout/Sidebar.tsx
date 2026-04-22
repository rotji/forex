import { NavLink } from "react-router-dom";
import styles from "./Sidebar.module.css";

const links = [
  { to: "/", label: "Dashboard", icon: "📊" },
  { to: "/currencies", label: "Currencies", icon: "💱" },
  { to: "/pairs", label: "Pairs", icon: "🔗" },
  { to: "/events", label: "Economic Events", icon: "📅" },
  { to: "/signals", label: "Signals", icon: "📡" },
  { to: "/setups", label: "Trade Setups", icon: "🎯" },
];

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>🌐 ForexIntel</div>
      <nav className={styles.nav}>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              `${styles.navLink}${isActive ? ` ${styles.active}` : ""}`
            }
          >
            <span>{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
