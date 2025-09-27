import { NextResponse } from "next/server";
import type { Service } from "@/types/shipping";

export const runtime = "nodejs"; // 使用 Node 运行时以便读取本地资源

export async function GET() {
  try {
    const data = (await import("@/data/chinapost_russia.json")) as any;
    const services = (data.services || []) as Service[];
    return NextResponse.json({ services });
  } catch (e) {
    // 最后兜底：返回空数组，避免 500
    return NextResponse.json({ services: [] as Service[] }, { status: 200 });
  }
}
