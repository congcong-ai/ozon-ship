import type { CarrierDetail } from "@/types/ozon_details";
import abt from "@/data/details/abt.json";
import atc from "@/data/details/atc.json";
import cel from "@/data/details/cel.json";
import chinapost from "@/data/details/chinapost.json";
import guoo from "@/data/details/guoo.json";
import iml from "@/data/details/iml.json";
import leader from "@/data/details/leader.json";
import oyx from "@/data/details/oyx.json";
import rets from "@/data/details/rets.json";
import tanais from "@/data/details/tanais.json";
import uni from "@/data/details/uni.json";
import ural from "@/data/details/ural.json";
import xy from "@/data/details/xy.json";
import zto from "@/data/details/zto.json";

export const ALL_CARRIER_DETAILS: Record<string, CarrierDetail> = {
  abt,
  atc,
  cel,
  chinapost,
  guoo,
  iml,
  leader,
  oyx,
  rets,
  tanais,
  uni,
  ural,
  xy,
  zto,
};

export function getCarrierDetail(id: string): CarrierDetail | null {
  if (!id) return null;
  const k = String(id).toLowerCase();
  return ALL_CARRIER_DETAILS[k] || null;
}
