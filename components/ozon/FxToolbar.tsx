"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function FxToolbar({
  rubFxMode,
  setRubFxMode,
  rubPerCny,
  setRubPerCny,
  rubPerCnyInput,
  setRubPerCnyInput,
  loadingFx,
  refreshFx,
  fxSource,
  fxUpdatedAt,
}: {
  rubFxMode: 'auto' | 'manual';
  setRubFxMode: (m: 'auto' | 'manual') => void;
  rubPerCny: number;
  setRubPerCny: (v: number) => void;
  rubPerCnyInput: string | null;
  setRubPerCnyInput: (s: string | null) => void;
  loadingFx: boolean;
  refreshFx: () => Promise<void> | void;
  fxSource: string | null;
  fxUpdatedAt: string | null;
}) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">汇率模式</span>
        <div className="relative inline-flex rounded-full bg-slate-200 p-1 select-none">
          <div
            className="absolute top-1 bottom-1 rounded-full bg-white shadow transition-all"
            style={{ left: rubFxMode === 'manual' ? 2 : 52, right: rubFxMode === 'manual' ? 52 : 2 }}
          />
          <button
            type="button"
            className={`relative z-10 px-3 h-6 rounded-full ${rubFxMode === 'manual' ? 'text-slate-900' : 'text-slate-600'}`}
            onClick={() => setRubFxMode('manual')}
          >手动</button>
          <button
            type="button"
            className={`relative z-10 px-3 h-6 rounded-full ${rubFxMode === 'auto' ? 'text-slate-900' : 'text-slate-600'}`}
            onClick={() => setRubFxMode('auto')}
          >自动</button>
        </div>
      </div>
      {rubFxMode === 'auto' ? (
        <>
          <span className="text-muted-foreground">汇率 RUB/CNY：</span>
          <span className="font-mono">{rubPerCny.toFixed(6)}</span>
          {fxSource && <span className="text-muted-foreground">[{fxSource}]</span>}
          {fxUpdatedAt && <span className="text-muted-foreground">{fxUpdatedAt}</span>}
          <Button size="sm" variant="outline" onClick={() => refreshFx()} disabled={loadingFx}>
            {loadingFx ? "刷新中..." : "刷新"}
          </Button>
        </>
      ) : (
        <>
          <span className="text-muted-foreground">汇率 RUB/CNY：</span>
          <Input
            className="h-7 w-[140px] font-mono"
            value={rubPerCnyInput ?? rubPerCny.toFixed(6)}
            onChange={(e) => {
              setRubPerCnyInput(e.target.value);
            }}
            onBlur={() => {
              if (rubPerCnyInput === null) return;
              const v = Number(rubPerCnyInput);
              if (!Number.isNaN(v) && isFinite(v) && v > 0) {
                setRubPerCny(v);
                setRubFxMode('manual');
              }
              setRubPerCnyInput(null);
            }}
          />
        </>
      )}
    </div>
  );
}
