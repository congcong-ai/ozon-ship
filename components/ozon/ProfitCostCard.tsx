"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ProfitCostCard({
  minMargin,
  setMinMargin,
  maxMargin,
  setMaxMargin,
  costCny,
  setCostCny,
  sliderRange,
  setSliderPrice,
}: {
  minMargin: number;
  setMinMargin: (v: number) => void;
  maxMargin: number;
  setMaxMargin: (v: number) => void;
  costCny: number;
  setCostCny: (v: number) => void;
  sliderRange: { min: number; max: number } | null;
  setSliderPrice: (p: number) => void;
}) {
  const [minInput, setMinInput] = useState<string | null>(null);
  const [maxInput, setMaxInput] = useState<string | null>(null);
  const [costInput, setCostInput] = useState<string | null>(null);

  return (
    <Card className="shadow-none h-full min-h-[150px]">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-base">利润与成本</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 items-center">
            <div className="text-sm text-muted-foreground">最低利润率</div>
            <Input
              type="number"
              step="0.01"
              className="h-8"
              value={minInput ?? String(minMargin * 100)}
              onChange={(e) => {
                const s = e.target.value;
                setMinInput(s);
                if (s === "") return;
                const p = Number(s);
                if (!Number.isNaN(p)) setMinMargin(p / 100);
              }}
              onBlur={() => setMinInput(null)}
            />
            <div className="text-xs text-muted-foreground">%</div>
          </div>
          <div className="grid grid-cols-3 gap-2 items-center">
            <div className="text-sm text-muted-foreground">最高利润率</div>
            <Input
              type="number"
              step="0.01"
              className="h-8"
              value={maxInput ?? String(maxMargin * 100)}
              onChange={(e) => {
                const s = e.target.value;
                setMaxInput(s);
                if (s === "") return;
                const p = Number(s);
                if (!Number.isNaN(p)) setMaxMargin(p / 100);
              }}
              onBlur={() => setMaxInput(null)}
            />
            <div className="text-xs text-muted-foreground">%（0 = 禁用）</div>
          </div>
          <div className="grid grid-cols-3 gap-2 items-center">
            <div className="text-sm text-muted-foreground">进货价</div>
            <Input
              id="cost"
              type="number"
              step="0.01"
              className="h-8"
              placeholder="CNY"
              value={costInput ?? String(costCny)}
              onChange={(e) => {
                const s = e.target.value;
                setCostInput(s);
                if (s === "") return;
                const v = Number(s);
                if (!Number.isNaN(v)) setCostCny(v);
              }}
              onBlur={() => {
                if (costInput === null) return;
                const v = Number(costInput);
                if (!Number.isNaN(v)) {
                  setCostCny(v > 0 ? v : 0.000001);
                } else {
                  setCostCny(0.000001);
                }
                setCostInput(null);
              }}
            />
            <div className="text-xs text-muted-foreground">CNY</div>
          </div>
          {/** 已移除“定位到下限/上限”按钮 */}
        </div>
      </CardContent>
    </Card>
  );
}
