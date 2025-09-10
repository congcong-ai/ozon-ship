import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { Service } from "@/types/shipping";

export async function GET() {
  const file = path.join(process.cwd(), "data", "chinapost_russia.json");
  const content = await fs.readFile(file, "utf8");
  const json = JSON.parse(content) as { services: Service[] };
  return NextResponse.json({ services: json.services });
}
