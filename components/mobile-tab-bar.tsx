"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, Package, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileTabBar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    (href === "/partner-logistics" && (pathname === "/" || pathname.startsWith("/partner-logistics"))) ||
    pathname === href;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 lg:hidden shadow-lg pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-3">
        <Tab href="/partner-logistics" label="合作物流" icon={<Package className="h-6 w-6" />} active={isActive("/partner-logistics")} />
        <Tab href="/chinapost" label="邮政" icon={<Mail className="h-6 w-6" />} active={isActive("/chinapost")} />
        <Tab href="/me" label="简介" icon={<User className="h-6 w-6" />} active={isActive("/me")} />
      </div>
    </nav>
  );
}

function Tab({ href, label, icon, active }: { href: string; label: string; icon: React.ReactNode; active?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center justify-center gap-1.5 py-3 text-base font-medium",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
