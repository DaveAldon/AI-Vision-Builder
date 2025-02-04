import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  const { config } = await request.json();

  if (!config) {
    return NextResponse.json({ error: "Config is required" }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), "yoloConfig.json");
  fs.writeFileSync(filePath, config, "utf8");
  return NextResponse.json(
    { message: "Config saved successfully" },
    { status: 200 }
  );
}
