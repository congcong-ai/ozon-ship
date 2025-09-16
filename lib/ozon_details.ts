import type { CarrierDetail } from "@/types/ozon_details";

// 动态详情获取（避免顶层静态引入不存在的 JSON 导致构建失败）
export async function getCarrierDetailAsync(id: string): Promise<CarrierDetail | null> {
  if (!id) return null;
  const k = String(id).toLowerCase();
  // 尝试通过运行时 URL 拉取（若部署将 details JSON 放入 public/details/）
  try {
    const url = `/details/${encodeURIComponent(k)}.json`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data as CarrierDetail;
    }
  } catch {}
  // 若无静态资源，则返回空（当前 UI 未依赖该详情，安全降级）
  return null;
}

// 同步占位：兼容旧 API，改为始终返回 null
export function getCarrierDetail(_id: string): CarrierDetail | null {
  return null;
}

export const ALL_CARRIER_DETAILS: Record<string, CarrierDetail> = {};
