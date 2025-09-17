import { carrierName } from "@/lib/carrier_names";
import { getCarrierRates, getCarrierJson, getCarrierDetailsUrl } from "@/lib/ozon_data_meta";
import Link from "next/link";

// 静态导出（NEXT_EXPORT）下，动态段必须提供 generateStaticParams
export const dynamicParams = false;
export async function generateStaticParams() { return []; }

export default async function CarrierDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await props.params;
  const id = String(rawId || "").toLowerCase();
  const json = getCarrierJson(id);
  const rates = getCarrierRates(id);
  function batteryBadge(v?: boolean) {
    if (v === true) return <span className="inline-flex items-center rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700">电池 允许</span>;
    if (v === false) return <span className="inline-flex items-center rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700">电池 不允许</span>;
    return <span className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-600">电池 未知</span>;
  }

  return (
    <div className="py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{carrierName(id)} 详情</h1>
        <Link className="text-sm text-blue-600 hover:underline" href={getCarrierDetailsUrl(id)} target="_blank" rel="noreferrer noopener">官方来源</Link>
      </div>

      {!json ? (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">暂无该承运商的详细信息。</div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border p-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <div className="text-muted-foreground">数据日期</div>
                <div>{json.data_date || "-"}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-muted-foreground">数据来源</div>
                <div className="truncate"><a className="text-blue-600 hover:underline" href={json.data_source} target="_blank" rel="noreferrer">{json.data_source}</a></div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border">
            <div className="px-4 py-3 border-b font-medium">服务/档位</div>
            <div className="divide-y">
              {rates.map((r, i) => (
                <div key={i} className="px-4 py-3 text-sm grid grid-cols-1 md:grid-cols-6 gap-2">
                  <div><span className="text-muted-foreground">档位：</span>{r.tier}</div>
                  <div><span className="text-muted-foreground">分组：</span>{r.group}</div>
                  <div><span className="text-muted-foreground">配送：</span>{r.delivery === 'door' ? '上门' : '取货点'}</div>
                  <div><span className="text-muted-foreground">起步价：</span>¥ {r.pricing.base_cny}</div>
                  <div><span className="text-muted-foreground">每克：</span>¥ {r.pricing.per_gram_cny}</div>
                  <div className="flex items-center gap-2">
                    <div><span className="text-muted-foreground">莫斯科时效：</span>{r.eta_days || '-'}天</div>
                    {batteryBadge(r.battery_allowed)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
