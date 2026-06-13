"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { clearStoredAccountId } from "../../lib/storage.js";
import { useAccount } from "../../hooks/useAccount.js";
import { useNotifications } from "../../hooks/useNotifications.js";
import Badge from "../ui/Badge.jsx";

const purchaserLinks = [
  { href: "/", label: "Marketplace" },
  { href: "/wallet", label: "My Tickets", showBadge: true },
];

const organizerLinks = [{ href: "/events", label: "My Events" }];

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const { accountId, isSignedIn, isOrganizer, loading } = useAccount();
  const { actionCount, totalCount } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);

  function logout() {
    clearStoredAccountId();
    router.push("/login");
  }

  const navLinks = isOrganizer ? organizerLinks : purchaserLinks;

  const shortId = accountId
    ? accountId.length > 12
      ? `${accountId.slice(0, 6)}…${accountId.slice(-4)}`
      : accountId
    : null;

  const isActive = (href) => {
    if (href === "/events") return pathname === "/events" || pathname.startsWith("/events/");
    if (href === "/") return pathname === "/" || pathname.startsWith("/collections/");
    if (href === "/wallet") return pathname === "/wallet";
    return pathname === href;
  };

  return (
    <nav className="mb-[var(--section-y)] border-b border-border pb-4">
      <div className="flex items-center justify-between gap-4">
        <Link
          href={isOrganizer ? "/events" : "/"}
          className="text-sm font-semibold tracking-tight text-text hover:text-accent transition-colors"
        >
          WC Ticket
        </Link>

        <button
          type="button"
          className="md:hidden text-xs text-muted hover:text-text tracking-wide uppercase"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? "Close" : "Menu"}
        </button>

        <div className="hidden md:flex items-center gap-6 text-sm">
          {navLinks.map((link) => (
            <NavLink
              key={link.href}
              {...link}
              active={isActive(link.href)}
              badge={!isOrganizer && link.showBadge && actionCount > 0 ? actionCount : null}
            />
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4 text-xs">
          {!loading && isSignedIn ? (
            <>
              {isOrganizer && (
                <span className="text-muted uppercase tracking-widest text-[10px]">Organizer</span>
              )}
              <span className="font-mono text-muted">{shortId}</span>
              <button
                type="button"
                onClick={logout}
                className="text-muted hover:text-text transition-colors tracking-wide"
              >
                Log out
              </button>
            </>
          ) : !loading ? (
            <>
              <Link href="/login" className="text-muted hover:text-text transition-colors">
                Log in
              </Link>
              <Link href="/onboard" className="text-accent hover:text-accent-dim transition-colors">
                Create wallet
              </Link>
            </>
          ) : null}
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden mt-4 flex flex-col gap-3 text-sm border-t border-border pt-4">
          {navLinks.map((link) => (
            <NavLink
              key={link.href}
              {...link}
              active={isActive(link.href)}
              badge={!isOrganizer && link.showBadge && totalCount > 0 ? totalCount : null}
              onClick={() => setMenuOpen(false)}
            />
          ))}
          {!loading && isSignedIn ? (
            <>
              <span className="font-mono text-xs text-muted">{shortId}</span>
              <button type="button" onClick={logout} className="text-left text-muted">
                Log out
              </button>
            </>
          ) : !loading ? (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)}>Log in</Link>
              <Link href="/onboard" onClick={() => setMenuOpen(false)}>Create wallet</Link>
            </>
          ) : null}
        </div>
      )}
    </nav>
  );
}

function NavLink({ href, label, active, badge, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`transition-colors tracking-wide ${
        active ? "text-accent" : "text-muted hover:text-text"
      }`}
    >
      {label}
      {badge != null && badge > 0 && (
        <Badge variant="pending" className="ml-1.5">
          {badge}
        </Badge>
      )}
    </Link>
  );
}
