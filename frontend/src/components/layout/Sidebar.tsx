import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import styles from "./Sidebar.module.css";

const primaryLinks = [
  { to: "/", label: "Dashboard", icon: "📊" },
  { to: "/currencies", label: "Currencies", icon: "💱" },
  { to: "/pairs", label: "Pairs", icon: "🔗" },
  { to: "/events", label: "Events Calendar", icon: "📅" },
];

const marketInputLinks = [
  { to: "/macro-indicators", label: "Macro Indicators", icon: "📈" },
  { to: "/events", label: "Economic Events", icon: "📅" },
  { to: "/central-bank-events", label: "Central Bank Tone", icon: "🏦" },
  { to: "/risk-sentiment", label: "Risk Sentiment", icon: "🌡️" },
  { to: "/positioning", label: "Positioning", icon: "🧭" },
  { to: "/data-import", label: "Data Import", icon: "📥" },
];

const engineLinks = [
  { to: "/currency-bias", label: "Currency Bias", icon: "🧠" },
];

const tradeOutputLinks = [
  { to: "/signals", label: "Signals", icon: "📡" },
  { to: "/setups", label: "Trade Setups", icon: "🎯" },
  { to: "/alerts", label: "Trade Alerts", icon: "🚨" },
];

export function Sidebar() {
  const location = useLocation();
  const marketInputsActive = marketInputLinks.some((link) => location.pathname.startsWith(link.to));
  const engineActive = engineLinks.some((link) => location.pathname.startsWith(link.to));
  const tradeOutputActive = tradeOutputLinks.some((link) => location.pathname.startsWith(link.to));
  const [marketInputsOpen, setMarketInputsOpen] = useState(true);
  const [engineOpen, setEngineOpen] = useState(engineActive);
  const [tradeOutputOpen, setTradeOutputOpen] = useState(tradeOutputActive);

  useEffect(() => {
    if (marketInputsActive) setMarketInputsOpen(true);
  }, [marketInputsActive]);

  useEffect(() => {
    if (engineActive) setEngineOpen(true);
  }, [engineActive]);

  useEffect(() => {
    if (tradeOutputActive) setTradeOutputOpen(true);
  }, [tradeOutputActive]);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>🌐 ForexIntel</div>
      <nav className={styles.nav}>
        {primaryLinks.map((link) => (
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

        <div className={styles.sectionLabel}>Inputs</div>
        <div className={styles.groupWrap}>
          <button
            type="button"
            className={`${styles.groupToggle}${marketInputsActive ? ` ${styles.groupToggleActive}` : ""}`}
            onClick={() => setMarketInputsOpen((open) => !open)}
            aria-expanded={marketInputsOpen}
          >
            <span className={styles.groupLabel}>
              <span>🗂️</span>
              Market Inputs
            </span>
            <span className={`${styles.groupArrow}${marketInputsOpen ? ` ${styles.groupArrowOpen}` : ""}`}>
              &gt;
            </span>
          </button>

          {marketInputsOpen && (
            <div className={styles.groupItems}>
              {marketInputLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `${styles.childLink}${isActive ? ` ${styles.active}` : ""}`
                  }
                >
                  <span>{link.icon}</span>
                  {link.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        <div className={styles.sectionLabel}>Engine</div>
        <div className={styles.groupWrap}>
          <button
            type="button"
            className={`${styles.groupToggle}${engineActive ? ` ${styles.groupToggleActive}` : ""}`}
            onClick={() => setEngineOpen((open) => !open)}
            aria-expanded={engineOpen}
          >
            <span className={styles.groupLabel}>
              <span>⚙️</span>
              Engine
            </span>
            <span className={`${styles.groupArrow}${engineOpen ? ` ${styles.groupArrowOpen}` : ""}`}>
              &gt;
            </span>
          </button>

          {engineOpen && (
            <div className={styles.groupItems}>
              {engineLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `${styles.childLink}${isActive ? ` ${styles.active}` : ""}`
                  }
                >
                  <span>{link.icon}</span>
                  {link.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        <div className={styles.sectionLabel}>Output</div>
        <div className={styles.groupWrap}>
          <button
            type="button"
            className={`${styles.groupToggle}${tradeOutputActive ? ` ${styles.groupToggleActive}` : ""}`}
            onClick={() => setTradeOutputOpen((open) => !open)}
            aria-expanded={tradeOutputOpen}
          >
            <span className={styles.groupLabel}>
              <span>📦</span>
              Trade Output
            </span>
            <span className={`${styles.groupArrow}${tradeOutputOpen ? ` ${styles.groupArrowOpen}` : ""}`}>
              &gt;
            </span>
          </button>

          {tradeOutputOpen && (
            <div className={styles.groupItems}>
              {tradeOutputLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `${styles.childLink}${isActive ? ` ${styles.active}` : ""}`
                  }
                >
                  <span>{link.icon}</span>
                  {link.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}
