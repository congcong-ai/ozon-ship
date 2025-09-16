"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/partner-logistics", label: "合作物流" },
  { href: "/chinapost", label: "邮政" },
  { href: "/me", label: "简介" },
];

export default function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden sm:block sticky top-0 z-40 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-12 flex items-center gap-4">
        <div className="text-sm text-muted-foreground">Ozon Ship</div>
        <div className="flex items-center gap-2">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                ((it.href === "/partner-logistics" && (pathname === "/" || pathname.startsWith("/partner-logistics"))) || pathname === it.href) && "bg-accent text-accent-foreground"
              )}
            >
              {it.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
