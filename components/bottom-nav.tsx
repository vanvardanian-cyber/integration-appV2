"use client";

import Link from "next/link";
import { Home, Target, BookOpen, User } from "lucide-react";

type Tab = "home" | "path" | "learn" | "me";

export function BottomNav({ active }: { active: Tab }) {
  const items: { k: Tab; href: string; icon: React.ReactNode; label: string }[] = [
    { k: "home", href: "/home", icon: <Home size={18} />, label: "Home" },
    { k: "path", href: "/path", icon: <Target size={18} />, label: "Path" },
    { k: "learn", href: "/learn", icon: <BookOpen size={18} />, label: "Learn" },
    { k: "me", href: "/me", icon: <User size={18} />, label: "Me" },
  ];

  return (
    <div className="fixed bottom-3 left-3 right-3 max-w-md mx-auto z-50">
      <div className="bg-ink-700/95 backdrop-blur-md rounded-3xl p-2 flex">
        {items.map(({ k, href, icon, label }) => (
          <Link
            key={k}
            href={href}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-2xl transition-all ${
              active === k
                ? "bg-warm-orange/25 text-warm-peach"
                : "text-ink-300 hover:text-cream-100"
            }`}
          >
            {icon}
            <span className="text-[10px] font-semibold">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
