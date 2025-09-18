"use client";
import { useEffect, useMemo, useState } from "react";
import { Calculator, Search, Settings } from "lucide-react";
import { type Service, type PricingInput, type ServiceWithComputed } from "@/types/shipping";
import { fetchServices, computeForAll } from "@/lib/pricing";
import ServiceRow from "@/components/service-row";
import CPResultSummary from "@/components/chinapost/CPResultSummary";
import CPDimsDialog from "@/components/chinapost/CPDimsDialog";
import SettingsDialog from "@/components/ozon/SettingsDialog";
import FxToolbar from "@/components/ozon/FxToolbar";
import CPProductParamsCard from "@/components/chinapost/CPProductParamsCard";
import CPAttrsCard from "@/components/chinapost/CPAttrsCard";
import CPServiceDetail from "@/components/chinapost/CPServiceDetail";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function HomePage() {
  const [services, setServices] = useState<Service[]>([]);
  const [query, setQuery] = useState("");

  const [unit, setUnit] = useState<"kg" | "g">("g");
  const [weightStr, setWeightStr] = useState<string>("66"); // 默认66g，输入为字符串，避免自动补0
  const [dims, setDims] = useState({ l: 20, w: 15, h: 5 }); // cm
  const [state, setState] = useState<"solid" | "liquid" | "gas">("solid");
  const [battery, setBattery] = useState(false);

  // 售价（RUB）与商品成本（CNY）
  const [priceRubStr, setPriceRubStr] = useState<string>("1100");
  const [costCny, setCostCny] = useState<number>(66);

  // 费率参数（与 Partner Logistics 独立）
  const [commission, setCommission] = useState(0.12);
  const [acquiring, setAcquiring] = useState(0.019);
  const [fx, setFx] = useState(0.012);
  const [fxIncludeIntl, setFxIncludeIntl] = useState(true);
  const [lastmileRate, setLastmileRate] = useState(0.02);
  const [lastmileMin, setLastmileMin] = useState(15);
  const [lastmileMax, setLastmileMax] = useState(200);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 汇率（独立的顶部工具条）
  const [rubPerCny, setRubPerCny] = useState<number>(11.830961);
  const [rubFxMode, setRubFxMode] = useState<'auto'|'manual'>("auto");
  const [rubPerCnyInput, setRubPerCnyInput] = useState<string | null>(null);
  const [loadingFx, setLoadingFx] = useState(false);
  const [fxUpdatedAt, setFxUpdatedAt] = useState<string | null>(null);
  const [fxSource, setFxSource] = useState<string | null>(null);

  // 当前选择的渠道（用于计算利润）
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const LS_KEY = "chinapost_page_state_v1";

  useEffect(() => {
    // 加载服务列表
    fetchServices().then(setServices).catch(console.error);
    // 读取默认单位与上次重量
    const savedUnit = (localStorage.getItem("default_unit") as "kg" | "g" | null) ?? null;
    if (savedUnit === "kg" || savedUnit === "g") setUnit(savedUnit);
    const savedWeight = localStorage.getItem("last_weightStr");
    if (savedWeight !== null) setWeightStr(savedWeight);
    // 读取 China Post 页面的持久化设置
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw || "{}");
        if (typeof s.priceRubStr === 'string') setPriceRubStr(s.priceRubStr);
        if (typeof s.costCny === 'number') setCostCny(s.costCny);
        if (typeof s.commission === 'number') setCommission(s.commission);
        if (typeof s.acquiring === 'number') setAcquiring(s.acquiring);
        if (typeof s.fx === 'number') setFx(s.fx);
        if (typeof s.fxIncludeIntl === 'boolean') setFxIncludeIntl(s.fxIncludeIntl);
        if (typeof s.lastmileRate === 'number') setLastmileRate(s.lastmileRate);
        if (typeof s.lastmileMin === 'number') setLastmileMin(s.lastmileMin);
        if (typeof s.lastmileMax === 'number') setLastmileMax(s.lastmileMax);
        if (typeof s.rubPerCny === 'number') setRubPerCny(s.rubPerCny);
        if (s.rubFxMode === 'auto' || s.rubFxMode === 'manual') setRubFxMode(s.rubFxMode);
        if (typeof s.selectedId === 'string') setSelectedId(s.selectedId);
      }
    } catch {}
  }, []);

  useEffect(() => {
    // 持久化默认单位与最近一次输入
    localStorage.setItem("default_unit", unit);
    localStorage.setItem("last_weightStr", weightStr);
    try {
      const s = {
        priceRubStr,
        costCny,
        commission,
        acquiring,
        fx,
        fxIncludeIntl,
        lastmileRate,
        lastmileMin,
        lastmileMax,
        rubPerCny,
        rubFxMode,
        selectedId,
      };
      localStorage.setItem(LS_KEY, JSON.stringify(s));
    } catch {}
  }, [unit, weightStr]);

  useEffect(() => {
    try {
      const s = {
        priceRubStr,
        costCny,
        commission,
        acquiring,
        fx,
        fxIncludeIntl,
        lastmileRate,
        lastmileMin,
        lastmileMax,
        rubPerCny,
        rubFxMode,
        selectedId,
      };
      localStorage.setItem(LS_KEY, JSON.stringify(s));
    } catch {}
  }, [priceRubStr, costCny, commission, acquiring, fx, fxIncludeIntl, lastmileRate, lastmileMin, lastmileMax, rubPerCny, rubFxMode, selectedId]);

  const numericWeight = useMemo(() => {
    const n = parseFloat(weightStr);
    return Number.isFinite(n) ? n : 0;
  }, [weightStr]);

  // 用于公式展示的重量（克）
  const weightG = useMemo(() => (unit === 'kg' ? numericWeight * 1000 : numericWeight), [unit, numericWeight]);

  const priceRub = useMemo(() => {
    const n = parseFloat(priceRubStr);
    return Number.isFinite(n) ? n : 0;
  }, [priceRubStr]);

  const input: PricingInput = useMemo(
    () => ({ unit, weight: numericWeight, dims, productState: state, battery }),
    [unit, numericWeight, dims, state, battery]
  );

  const computed: ServiceWithComputed[] = useMemo(() => computeForAll(services, input), [services, input]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return computed
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.group.toLowerCase().includes(q))
      .sort((a, b) => (a.totalPriceCNY ?? Number.MAX_SAFE_INTEGER) - (b.totalPriceCNY ?? Number.MAX_SAFE_INTEGER));
  }, [computed, query]);

  // 默认选中第一个可用渠道
  useEffect(() => {
    if (!filtered.length) return;
    const exists = selectedId && filtered.some(s => s.id === selectedId && s.available);
    if (!exists) {
      const firstOk = filtered.find(s => s.available);
      if (firstOk) setSelectedId(firstOk.id);
    }
  }, [filtered.length]);

  const selectedService = useMemo(() => filtered.find(s => s.id === selectedId) || null, [filtered, selectedId]);

  // 尺寸超限提示弹窗
  const [dimsOpen, setDimsOpen] = useState(false);
  const [lastDimsKey, setLastDimsKey] = useState<string>("");
  useEffect(() => {
    if (!selectedService) return;
    const reason = selectedService.reason || "";
    const key = `${dims.l}x${dims.w}x${dims.h}-${selectedService.id}`;
    if (reason.includes("尺寸") && key !== lastDimsKey) {
      setLastDimsKey(key);
      setDimsOpen(true);
    }
  }, [selectedService?.id, selectedService?.reason, dims.l, dims.w, dims.h]);

  // 汇率刷新（自动模式）
  async function refreshFx() {
    setLoadingFx(true);
    try {
      let ok = false;
      try {
        const res = await fetch("https://api.exchangerate.host/latest?base=CNY&symbols=RUB");
        if (res.ok) {
          const data = await res.json();
          const v = data?.rates?.RUB;
          if (typeof v === 'number' && isFinite(v)) {
            setRubPerCny(v);
            setFxSource("exchangerate.host");
            setFxUpdatedAt(new Date().toLocaleString());
            ok = true;
          }
        }
      } catch {}
      if (!ok) {
        const res2 = await fetch("https://open.er-api.com/v6/latest/CNY");
        if (res2.ok) {
          const data2 = await res2.json();
          const v2 = data2?.rates?.RUB;
          if (typeof v2 === 'number' && isFinite(v2)) {
            setRubPerCny(v2);
            const ts = data2?.time_last_update_utc || new Date().toUTCString();
            setFxSource("open.er-api.com");
            setFxUpdatedAt(new Date(ts).toLocaleString());
            ok = true;
          }
        }
      }
    } finally {
      setLoadingFx(false);
    }
  }

  useEffect(() => {
    if (rubFxMode === 'auto') refreshFx();
  }, [rubFxMode]);

  const [profitOpen, setProfitOpen] = useState(false);
  const [profitService, setProfitService] = useState<ServiceWithComputed | null>(null);

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xl font-semibold">
          <Calculator className="h-5 w-5 text-primary" />
          <span>Ozon运费计算器 - 中国邮政</span>
        </div>
      </div>

      {/* 顶部：商品参数 + 属性 + 售价与成本（三卡） */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <CPProductParamsCard
          unit={unit}
          setUnit={setUnit}
          weightStr={weightStr}
          setWeightStr={setWeightStr}
          dims={dims}
          setDims={setDims}
        />

        <CPAttrsCard
          state={state}
          setState={setState}
          battery={battery}
          setBattery={setBattery}
        />

        <div className="rounded-lg border p-4">
          <h2 className="mb-3 font-medium">售价与成本</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm w-16">售价(RUB)</label>
              <input type="number" step="0.01" value={priceRubStr} onChange={(e)=>setPriceRubStr(e.target.value)} className="flex-1 rounded-md border px-3 py-2 text-sm" />
            </div>
            <div className="text-xs text-muted-foreground">≈ ¥ {(rubPerCny>0? (parseFloat(priceRubStr||"0")/rubPerCny):0).toFixed(2)}</div>
            <div className="flex items-center gap-2">
              <label className="text-sm w-16">成本(CNY)</label>
              <input type="number" step="0.01" value={costCny} onChange={(e)=>setCostCny(Number(e.target.value)||0)} className="flex-1 rounded-md border px-3 py-2 text-sm" />
            </div>
            <button type="button" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline" onClick={()=>setSettingsOpen(true)}>
              <Settings className="h-3.5 w-3.5"/> 更多设置
            </button>
          </div>
        </div>
      </section>

      {/* 汇率工具条 */}
      <section className="rounded-lg border p-3">
        <FxToolbar
          rubFxMode={rubFxMode}
          setRubFxMode={setRubFxMode}
          rubPerCny={rubPerCny}
          setRubPerCny={setRubPerCny}
          rubPerCnyInput={rubPerCnyInput}
          setRubPerCnyInput={setRubPerCnyInput}
          loadingFx={loadingFx}
          refreshFx={refreshFx}
          fxSource={fxSource}
          fxUpdatedAt={fxUpdatedAt}
        />
      </section>

      {/* 汇总明细通过“利润详请”弹窗查看 */}

      <section className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索渠道、分组..."
            className="w-full rounded-md border px-3 py-2 pr-8 text-sm"
          />
          <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
      </section>
      {/* 列表布局：长列表而非宫格卡片 */}
      <section className="rounded-lg border divide-y">
        {filtered.map((s) => (
          <ServiceRow
            key={s.id}
            service={s}
            selected={selectedId===s.id}
            onProfit={(it)=> { setSelectedId(it.id); setProfitService(it); setProfitOpen(true); }}
            priceRub={priceRub}
            rubPerCny={rubPerCny}
            commission={commission}
            acquiring={acquiring}
            fx={fx}
            last_mile={{ rate: lastmileRate, min_rub: lastmileMin, max_rub: lastmileMax }}
            costCny={costCny}
            fxIncludeIntl={fxIncludeIntl}
            weightG={weightG}
          />
        ))}
      </section>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        commission={commission}
        setCommission={setCommission}
        acquiring={acquiring}
        setAcquiring={setAcquiring}
        fx={fx}
        setFx={setFx}
        lastmileRate={lastmileRate}
        setLastmileRate={setLastmileRate}
        lastmileMin={lastmileMin}
        setLastmileMin={setLastmileMin}
        lastmileMax={lastmileMax}
        setLastmileMax={setLastmileMax}
        fxIncludeIntl={fxIncludeIntl}
        setFxIncludeIntl={setFxIncludeIntl}
      />

      <CPDimsDialog open={dimsOpen} onOpenChange={setDimsOpen} service={selectedService} dims={dims} />

      {/* 详请弹窗（利润详请 + 物流详请） */}
      <Dialog open={profitOpen} onOpenChange={setProfitOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>详请</DialogTitle>
          </DialogHeader>
          <CPResultSummary
            service={profitService ?? selectedService}
            priceRub={priceRub}
            rubPerCny={rubPerCny}
            commission={commission}
            acquiring={acquiring}
            fx={fx}
            last_mile={{ rate: lastmileRate, min_rub: lastmileMin, max_rub: lastmileMax }}
            costCny={costCny}
            fxIncludeIntl={fxIncludeIntl}
            onOpenSettings={()=>setSettingsOpen(true)}
            weightG={weightG}
          />
          <CPServiceDetail
            service={profitService ?? selectedService}
            weightG={weightG}
            rubPerCny={rubPerCny}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
