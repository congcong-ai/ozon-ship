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
    <div className="w-full text-xs">
      {/* Mobile 布局：两行 */}
      <div className="flex flex-col gap-1 sm:hidden">
        {/* 第1行：模式切换 + 刷新 */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">模式</span>
          <div className="inline-flex rounded-full border bg-slate-50 p-0.5">
            <button
              type="button"
              className={`px-2.5 h-7 rounded-full transition ${rubFxMode === 'manual' ? 'bg-white text-slate-900 shadow' : 'text-slate-600 hover:text-slate-900'}`}
              onClick={() => setRubFxMode('manual')}
            >手动</button>
            <button
              type="button"
              className={`px-2.5 h-7 rounded-full transition ${rubFxMode === 'auto' ? 'bg-white text-slate-900 shadow' : 'text-slate-600 hover:text-slate-900'}`}
              onClick={() => setRubFxMode('auto')}
            >自动</button>
          </div>
          {rubFxMode === 'auto' && (
            <Button size="sm" variant="outline" className="ml-auto h-7" onClick={() => refreshFx()} disabled={loadingFx}>
              {loadingFx ? '刷新中...' : '刷新'}
            </Button>
          )}
        </div>
        {/* 第2行：汇率行（自动包含来源；手动为输入框） */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">汇率</span>
          {rubFxMode === 'auto' ? (
            <>
              <span className="font-mono">{rubPerCny.toFixed(6)}</span>
              {fxSource && <span className="text-muted-foreground">[{fxSource}]</span>}
            </>
          ) : (
            <Input
              className="h-8 w-32 font-mono"
              value={rubPerCnyInput ?? rubPerCny.toFixed(6)}
              onChange={(e) => setRubPerCnyInput(e.target.value)}
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
          )}
        </div>
      </div>

      {/* Desktop ≥ sm：单行布局 */}
      <div className="hidden sm:flex sm:flex-wrap sm:items-center sm:gap-2">
        <span className="text-muted-foreground">模式</span>
        <div className="inline-flex rounded-full border bg-slate-50 p-0.5">
          <button
            type="button"
            className={`px-2.5 h-6 rounded-full transition ${rubFxMode === 'manual' ? 'bg-white text-slate-900 shadow' : 'text-slate-600 hover:text-slate-900'}`}
            onClick={() => setRubFxMode('manual')}
          >手动</button>
          <button
            type="button"
            className={`px-2.5 h-6 rounded-full transition ${rubFxMode === 'auto' ? 'bg-white text-slate-900 shadow' : 'text-slate-600 hover:text-slate-900'}`}
            onClick={() => setRubFxMode('auto')}
          >自动</button>
        </div>
        {rubFxMode === 'auto' ? (
          <>
            <span className="text-muted-foreground">汇率 RUB/CNY：</span>
            <span className="font-mono">{rubPerCny.toFixed(6)}</span>
            {fxSource && <span className="text-muted-foreground">[{fxSource}]</span>}
            {fxUpdatedAt && <span className="text-muted-foreground">{fxUpdatedAt}</span>}
            <Button size="sm" variant="outline" onClick={() => refreshFx()} disabled={loadingFx}>
              {loadingFx ? '刷新中...' : '刷新'}
            </Button>
          </>
        ) : (
          <>
            <span className="text-muted-foreground">汇率 RUB/CNY：</span>
            <Input
              className="h-7 w-[140px] font-mono"
              value={rubPerCnyInput ?? rubPerCny.toFixed(6)}
              onChange={(e) => setRubPerCnyInput(e.target.value)}
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
    </div>
  );
}
