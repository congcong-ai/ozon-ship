"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function SearchBar({
  query,
  setQuery,
  placeholder = "搜索渠道、组名或价格",
}: {
  query: string;
  setQuery: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full">
      <Input placeholder={placeholder} value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 h-10" />
      <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    </div>
  );
}
