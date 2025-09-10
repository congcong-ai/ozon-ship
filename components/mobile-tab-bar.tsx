"use client";
import Link from "next/link";
import { Calculator, History, Scale } from "lucide-react";

export default function MobileTabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sm:hidden">
      <div className="mx-auto grid max-w-6xl grid-cols-3">
        <Tab href="/" label="计算" icon={<Calculator className="h-5 w-5" />} />
        <Tab href="/compare" label="比较" icon={<Scale className="h-5 w-5" />} />
        <Tab href="/history" label="历史" icon={<History className="h-5 w-5" />} />
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
