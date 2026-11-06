"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { approvalsChangedEvent } from "@/components/events";
import { DoomMark } from "@/components/doom-mark";
import { Icon } from "@/components/icon";
import { UserMenu } from "@/components/user-menu";

const unreadPollMilliseconds = 15000;

const links = [
  { href: "/", label: "Chat", icon: "forum" },
  { href: "/bots", label: "Doombots", icon: "smart_toy" },
  { href: "/alerts", label: "Alerts", icon: "notifications" },
  { href: "/briefing", label: "Briefing", icon: "wb_twilight" },
  { href: "/todos", label: "To-do", icon: "task_alt" },
  { href: "/approvals", label: "Approvals", icon: "verified_user" },
  { href: "/connections", label: "Connections", icon: "hub" },
];

export function SidebarNav() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadPending = useCallback(() => {
    fetch("/api/approvals")
      .then((response) => response.json() as Promise<{ approvals: unknown[] }>)
      .then((data) => setPendingCount(data.approvals.length))
      .catch(() => setPendingCount(0));
  }, []);

  const loadUnread = useCallback(() => {
    fetch("/api/notifications")
      .then((response) => response.json() as Promise<{ unread: number }>)
      .then((data) => setUnreadCount(data.unread))
      .catch(() => setUnreadCount(0));
  }, []);

  useEffect(() => {
    loadPending();
    loadUnread();
    const timer = setInterval(loadUnread, unreadPollMilliseconds);
    window.addEventListener(approvalsChangedEvent, loadPending);
    return () => {
      clearInterval(timer);
      window.removeEventListener(approvalsChangedEvent, loadPending);
    };
  }, [loadPending, loadUnread]);

  return (
    <nav
      aria-label="Main"
      className="flex shrink-0 items-center gap-3 border-b border-line bg-panel px-3 py-2 md:w-60 md:flex-col md:items-stretch md:gap-6 md:border-r md:border-b-0 md:px-4 md:py-5"
    >
      <Link href="/" className="flex items-center gap-2.5 rounded-lg px-1">
        <DoomMark size={30} />
        <span className="font-display text-lg font-semibold tracking-tight">DOOMBOT</span>
      </Link>
      <ul className="flex flex-1 gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        {links.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center justify-between gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${
                  active ? "bg-raised font-medium text-ink" : "text-muted hover:bg-raised hover:text-ink"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon name={link.icon} className={`text-[20px] ${active ? "text-doom" : ""}`} />
                  {link.label}
                </span>
                {link.href === "/approvals" && pendingCount > 0 && (
                  <span className="rounded-full bg-doom px-2 py-0.5 text-xs font-semibold text-canvas">
                    {pendingCount}
                  </span>
                )}
                {link.href === "/alerts" && unreadCount > 0 && (
                  <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-canvas">
                    {unreadCount}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      <UserMenu />
    </nav>
  );
}
