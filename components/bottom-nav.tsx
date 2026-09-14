"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/",
    label: "Home",
    icon: Home,
  },
  {
    href: "/randomizer",
    label: "List món ăn",
    icon: List,
  },
  {
    href: "/add",
    label: "Thêm món",
    icon: PlusCircle,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-[24.5rem] -translate-x-1/2 rounded-3xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg shadow-slate-300/35 backdrop-blur">
      <ul className="grid grid-cols-3 gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          const isCenter = item.href === "/randomizer";

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center rounded-2xl px-3 py-2 text-xs font-semibold transition",
                  isCenter
                    ? active
                      ? "bg-lime-300 text-slate-900"
                      : "bg-lime-200/80 text-slate-800 hover:bg-lime-300"
                    : active
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:bg-slate-100",
                )}
              >
                <Icon className="mb-1 h-5 w-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
