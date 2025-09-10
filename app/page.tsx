"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Search } from "lucide-react";
import { type Service, type PricingInput, type ServiceWithComputed } from "@/types/shipping";
import { fetchServices, computeForAll } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import ServiceRow from "@/components/service-row";

export default function HomePage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const [unit, setUnit] = useState<"kg" | "g">("kg");
  const [weightStr, setWeightStr] = useState<string>(""); // 输入为字符串，避免自动补0
  const [dims, setDims] = useState({ l: 20, w: 15, h: 5 }); // cm
  const [state, setState] = useState<"solid" | "liquid" | "gas">("solid");
  const [battery, setBattery] = useState(false);

  useEffect(() => {
    // 加载服务列表
    fetchServices().then(setServices).catch(console.error);
    // 读取默认单位与上次重量
    const savedUnit = (localStorage.getItem("default_unit") as "kg" | "g" | null) ?? null;
    if (savedUnit === "kg" || savedUnit === "g") setUnit(savedUnit);
    const savedWeight = localStorage.getItem("last_weightStr");
    if (savedWeight !== null) setWeightStr(savedWeight);
  }, []);

  useEffect(() => {
    // 持久化默认单位与最近一次输入
    localStorage.setItem("default_unit", unit);
    localStorage.setItem("last_weightStr", weightStr);
  }, [unit, weightStr]);

  const numericWeight = useMemo(() => {
    const n = parseFloat(weightStr);
    return Number.isFinite(n) ? n : 0;
  }, [weightStr]);

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

  const selectedList = filtered.filter((f) => selected[f.id]);

  function goCompare() {
    const payload = selectedList.map((s) => ({
      id: s.id,
      name: s.name,
      group: s.group,
      totalPriceCNY: s.totalPriceCNY,
      available: s.available,
      reason: s.reason,
    }));
    localStorage.setItem("compare_items", JSON.stringify({
      ts: Date.now(),
      input,
      items: payload,
    }));
    // 写入简易历史（最多 50 条）
    const historyRaw = localStorage.getItem("calc_history");
    const history = historyRaw ? JSON.parse(historyRaw) : [];
    history.unshift({ ts: Date.now(), input, top: filtered.slice(0, 5).map((x) => ({ id: x.id, name: x.name, price: x.totalPriceCNY })) });
    while (history.length > 50) history.pop();
    localStorage.setItem("calc_history", JSON.stringify(history));
    router.push("/compare");
  }

  return (
    <div className="py-6">
      <header className="flex flex-col gap-2 py-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Calculator className="h-6 w-6" /> 中国邮政到俄罗斯 运费计算器
        </h1>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h2 className="mb-3 font-medium">重量</h2>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              value={weightStr}
              placeholder="输入重量"
              onChange={(e) => setWeightStr(e.target.value)}
              className="flex-1 rounded-md border px-3 py-2 text-sm"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as any)}
              className="rounded-md border px-2 py-2 text-sm"
            >
              <option value="kg">千克(kg)</option>
              <option value="g">克(g)</option>
            </select>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">默认单位会自动记忆；输入支持两位小数。</p>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="mb-3 font-medium">尺寸 (cm)</h2>
          <div className="grid grid-cols-3 gap-2">
            {(["l","w","h"] as const).map((k) => (
              <div key={k} className="flex items-center gap-1">
                <span className="w-6 uppercase text-xs text-muted-foreground">{k}</span>
                <input
                  type="number"
                  step="0.1"
                  value={(dims as any)[k]}
                  onChange={(e) => setDims({ ...dims, [k]: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-md border px-2 py-2 text-sm"
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">用于 e特快 体积重计算（当任一边 ≥ 40cm）。</p>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="mb-3 font-medium">属性</h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm">状态：</label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value as any)}
              className="rounded-md border px-2 py-2 text-sm"
            >
              <option value="solid">固体</option>
              <option value="liquid">液体</option>
              <option value="gas">气体</option>
            </select>

            <label className="ml-4 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={battery} onChange={(e) => setBattery(e.target.checked)} />
              含电池
            </label>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">部分渠道禁限寄含电池/液体/易燃品，以渠道规则为准。</p>
        </div>
      </section>

      <section className="mt-6 flex items-center gap-2">
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索渠道、分组..."
            className="w-full rounded-md border px-3 py-2 pr-8 text-sm"
          />
          <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
        <Button disabled={selectedList.length === 0} onClick={goCompare}>
          比较({selectedList.length})
        </Button>
      </section>
      {/* 列表布局：长列表而非宫格卡片 */}
      <section className="mt-4 rounded-lg border divide-y">
        {filtered.map((s) => (
          <ServiceRow
            key={s.id}
            service={s}
            selected={!!selected[s.id]}
            onToggle={() => setSelected((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
          />
        ))}
      </section>
    </div>
  );
}
