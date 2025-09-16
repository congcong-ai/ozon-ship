import ural from "@/data/ozon_ural.json";
import abt from "@/data/ozon_abt.json";
import atc from "@/data/ozon_atc.json";
import cel from "@/data/ozon_cel.json";
import guoo from "@/data/ozon_guoo.json";
import iml from "@/data/ozon_iml.json";
import leader from "@/data/ozon_leader.json";
import oyx from "@/data/ozon_oyx.json";
import rets from "@/data/ozon_rets.json";
import tanais from "@/data/ozon_tanais.json";
import uni from "@/data/ozon_uni.json";
import xy from "@/data/ozon_xy.json";
import zto from "@/data/ozon_zto.json";
import chinapost from "@/data/chinapost_russia.json";
import type { OzonRateTable } from "@/types/ozon";

export type CarrierMeta = {
  carrier: string;
  data_source: string;
  data_date: string;
  details_url: string;
};

const OZON_BASE_SOURCE = "https://docs.ozon.ru/global/zh-hans/fulfillment/rfbs/logistic-settings/partner-delivery-ozon/?country=CN";

function metaFrom(json: any, carrier: string): CarrierMeta {
  const lower = carrier.toLowerCase();
  const data_source = json?.data_source || OZON_BASE_SOURCE;
  const data_date = json?.data_date || "2025-09-15";
  const details_url = json?.details_url || `https://docs.ozon.ru/global/zh-hans/fulfillment/rfbs/logistic-settings/partner-delivery-ozon/${lower}/?country=CN`;
  return { carrier: lower, data_source, data_date, details_url };
}

function chinapostMeta(): CarrierMeta {
  const data_source = (chinapost as any)?.data_source || OZON_BASE_SOURCE;
  const data_date = (chinapost as any)?.data_date || "2025-09-15";
  const details_url = (chinapost as any)?.details_url || "https://docs.ozon.ru/global/zh-hans/fulfillment/rfbs/logistic-settings/china-post/?country=CN";
  return { carrier: "chinapost", data_source, data_date, details_url };
}

export const ALL_CARRIER_META: Record<string, CarrierMeta> = {
  ural: metaFrom(ural, "ural"),
  abt: metaFrom(abt, "abt"),
  atc: metaFrom(atc, "atc"),
  cel: metaFrom(cel, "cel"),
  guoo: metaFrom(guoo, "guoo"),
  iml: metaFrom(iml, "iml"),
  leader: metaFrom(leader, "leader"),
  oyx: metaFrom(oyx, "oyx"),
  rets: metaFrom(rets, "rets"),
  tanais: metaFrom(tanais, "tanais"),
  uni: metaFrom(uni, "uni"),
  xy: metaFrom(xy, "xy"),
  zto: metaFrom(zto, "zto"),
  chinapost: chinapostMeta(),
};

const ALL_CARRIER_JSON: Record<string, any> = {
  ural,
  abt,
  atc,
  cel,
  guoo,
  iml,
  leader,
  oyx,
  rets,
  tanais,
  uni,
  xy,
  zto,
};

export function getCarrierDetailsUrl(id: string): string {
  const k = String(id || "").toLowerCase();
  return (ALL_CARRIER_META[k]?.details_url) || OZON_BASE_SOURCE;
}

export function getDataSourceUrl(): string { return OZON_BASE_SOURCE; }

export function getAllDataDates(): { carrier: string; date: string }[] {
  return Object.keys(ALL_CARRIER_META).map((k) => ({ carrier: k, date: ALL_CARRIER_META[k].data_date }));
}

export function getCarrierJson(id: string): any | null {
  const k = String(id || "").toLowerCase();
  return ALL_CARRIER_JSON[k] || null;
}

export function getCarrierRates(id: string): OzonRateTable[] {
  const js = getCarrierJson(id);
  if (!js || !Array.isArray(js.rates)) return [] as OzonRateTable[];
  return js.rates as OzonRateTable[];
}
