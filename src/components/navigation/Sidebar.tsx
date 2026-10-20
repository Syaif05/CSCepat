"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquareText,
  LayoutTemplate,
  Settings,
  LogOut,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/features/auth/actions";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    name: "Buat Pesan",
    href: "/app",
    icon: MessageSquareText,
  },
  {
    name: "Template Saya",
    href: "/app/templates",
    icon: LayoutTemplate,
  },
  {
    name: "Pengaturan",
    href: "/app/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden lg:flex w-56 flex-col justify-between border-r border-border-subtle bg-surface px-4 py-6 shrink-0 h-screen sticky top-0"
      aria-label="Navigasi Utama"
    >
      <div className="flex flex-col gap-6">
        {/* Brand / Logo */}
        <Link
          href="/app"
          className="flex items-center gap-2.5 px-3 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-text-main leading-tight">
              PesanRapi
            </span>
            <span className="text-[11px] text-text-muted font-medium">
              CS Workspace
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1.5" aria-label="Menu Aplikasi">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-pill px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isActive
                    ? "bg-primary text-white shadow-xs"
                    : "text-text-muted hover:bg-input-bg hover:text-text-main"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-text-muted")} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Account & Logout */}
      <div className="border-t border-border-subtle pt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => signOutAction()}
          className="flex items-center gap-3 rounded-pill px-4 py-2.5 text-sm font-medium text-text-muted hover:bg-danger/10 hover:text-danger transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger text-left w-full cursor-pointer"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
