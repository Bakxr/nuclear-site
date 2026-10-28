import { useState } from "react";
import UserIcon from "../access/UserIcon.jsx";

const SECTION_LINKS = [
  { key: "front", label: "Today" },
  { key: "stocks", label: "Markets" },
  { key: "news", label: "The wire" },
  { key: "globe", label: "Reactor map" },
  { key: "smr", label: "SMR tracker" },
];

function SearchIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 14 14" fill="none">
      <circle cx="6" cy="6" r="4.6" stroke="currentColor" strokeWidth="1.4" />
      <line x1="9.4" y1="9.4" x2="13" y2="13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// Broadsheet masthead: a date line with the day's key readings and account
// actions, the nameplate, then a sticky section nav with search. On the
// /learn page the section links lead back to the front page.
export default function Masthead({
  appView,
  activeSection,
  onSection,
  onView,
  isDark,
  onToggleTheme,
  user,
  accountStatusMeta,
  onOpenAccount,
  readings,
  searchQuery,
  onSearchChange,
  onSearchFocus,
  onSearchBlur,
  searchOverlay,
}) {
  const [mobileSearch, setMobileSearch] = useState(false);
  const today = new Date();
  const longDate = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const shortDate = today.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const searchInput = (
    <input
      type="search"
      aria-label="Search plants, companies and stories"
      placeholder="Search plants, stocks, stories"
      value={searchQuery}
      onChange={(e) => onSearchChange(e.target.value)}
      onFocus={onSearchFocus}
      onBlur={onSearchBlur}
    />
  );

  return (
    <header>
      <div className="np-mast-top">
        <div className="np-wrap">
          <span><span className="np-mast-date-long">{longDate}</span><span className="np-mast-date-short" aria-hidden="true">{shortDate}</span></span>
          {readings ? <span className="np-mast-readings">{readings}</span> : null}
          <div className="np-mast-actions">
            <button type="button" className="np-mast-btn np-mast-search-toggle" aria-label="Search" aria-expanded={mobileSearch} onClick={() => setMobileSearch((v) => !v)}>
              <SearchIcon />
            </button>
            <button type="button" className="np-mast-btn" onClick={onToggleTheme} aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}>
              <span aria-hidden="true">{isDark ? "☀︎" : "☾︎"}</span>
            </button>
            <button
              type="button"
              className="np-mast-btn"
              onClick={onOpenAccount}
              aria-label={user ? `Account (${accountStatusMeta.detail})` : "Sign in"}
              title={user ? `${user.email} · ${accountStatusMeta.detail}` : undefined}
            >
              <UserIcon size={16} />
              <span className="np-mast-signin-label">{user ? "Account" : "Sign in"}</span>
            </button>
            <button type="button" className="np-mast-btn np-mast-btn--solid" onClick={() => onView("terminal")}>
              Terminal<span className="np-mast-trial"> · 7 days free</span>
            </button>
          </div>
        </div>
      </div>

      {mobileSearch ? (
        <div className="np-wrap np-mast-search np-mast-search--mobile" style={{ paddingTop: 10 }}>
          {searchInput}
          {searchOverlay}
        </div>
      ) : null}

      <div className="np-mast-title">
        <a href="/" onClick={(e) => { e.preventDefault(); onView("home"); }}>Nuclear Pulse</a>
        <div className="np-mast-tagline">Reactors · Uranium · Markets · Policy — from primary sources, every day</div>
      </div>

      <nav className="np-mast-nav" aria-label="Sections">
        <div className="np-wrap">
          <div className="np-mast-nav-links">
            {SECTION_LINKS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={appView === "home" && activeSection === item.key ? "is-active" : undefined}
                onClick={() => onSection(item.key)}
              >{item.label}</button>
            ))}
            <a href="/reactor-outages">Outages</a>
            <a
              href="/learn"
              className={appView === "learn" ? "is-active" : undefined}
              aria-current={appView === "learn" ? "page" : undefined}
              onClick={(e) => { e.preventDefault(); onView("learn"); }}
            >Learn</a>
          </div>
          {!mobileSearch ? (
            <div className="np-mast-search">
              {searchInput}
              {searchOverlay}
            </div>
          ) : null}
        </div>
      </nav>
    </header>
  );
}
