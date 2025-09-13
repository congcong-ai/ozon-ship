"use client";
import Link from "next/link";
import { Mail, Package, User } from "lucide-react";

export default function MobileTabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sm:hidden">
      <div className="mx-auto grid max-w-6xl grid-cols-3">
        <Tab href="/" label="邮政" icon={<Mail className="h-5 w-5" />} />
        <Tab href="/ozon" label="Ozon" icon={<Package className="h-5 w-5" />} />
        <Tab href="/me" label="我的" icon={<User className="h-5 w-5" />} />
      </div>
    </nav>
  );
}

function Tab({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center justify-center gap-1 py-2 text-sm">
      {icon}
      <span>{label}</span>
    </Link>
  );
}
