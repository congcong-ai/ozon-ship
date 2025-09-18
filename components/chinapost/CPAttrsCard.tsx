"use client";

import { Card } from "@/components/ui/card";

export default function CPAttrsCard({
  state,
  setState,
  battery,
  setBattery,
}: {
  state: "solid" | "liquid" | "gas";
  setState: (s: "solid" | "liquid" | "gas") => void;
  battery: boolean;
  setBattery: (b: boolean) => void;
}) {
  return (
    <Card className="rounded-lg border p-4">
      <h2 className="mb-3 font-medium">属性</h2>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-muted-foreground">状态</label>
        <select
          value={state}
          onChange={(e)=> setState(e.target.value as any)}
          className="rounded-md border px-2 py-2 text-sm"
        >
          <option value="solid">固体</option>
          <option value="liquid">液体</option>
          <option value="gas">气体</option>
        </select>
        <label className="ml-1 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={battery} onChange={(e)=> setBattery(e.target.checked)} />
          含电池
        </label>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">部分渠道禁限寄含电池/液体/易燃品，以渠道规则为准。</p>
    </Card>
  );
}
