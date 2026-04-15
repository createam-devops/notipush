import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL_INTERNAL || "http://localhost:8080";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const res = await fetch(`${API_URL}/admin/projects`, {
    headers: {
      Authorization: `Bearer ${ADMIN_SECRET}`,
      "Content-Type": "application/json",
    },
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { name, webhook_url } = body as {
    name?: string;
    webhook_url?: string;
  };

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const payload: { name: string; webhook_url?: string } = {
    name: name.trim(),
  };
  if (webhook_url && typeof webhook_url === "string") {
    payload.webhook_url = webhook_url;
  }

  const res = await fetch(`${API_URL}/admin/projects`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ADMIN_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
