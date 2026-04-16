import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL_INTERNAL || "http://localhost:8080";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "";

function getProjectId(req: NextRequest): string | null {
  return req.headers.get("x-project-id");
}

function internalHeaders(projectId: string): HeadersInit {
  return {
    "X-Admin-Secret": ADMIN_SECRET,
    "X-Project-Id": projectId,
    "Content-Type": "application/json",
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const projectId = getProjectId(req);
  if (!projectId) {
    return NextResponse.json({ error: "missing project id" }, { status: 400 });
  }

  const { path } = await params;
  const targetPath = `/api/v1/${path.join("/")}`;
  const url = new URL(targetPath, API_URL);
  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const res = await fetch(url.toString(), {
    headers: internalHeaders(projectId),
  });

  if (res.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const projectId = getProjectId(req);
  if (!projectId) {
    return NextResponse.json({ error: "missing project id" }, { status: 400 });
  }

  const { path } = await params;
  const targetPath = `/api/v1/${path.join("/")}`;

  let body: string | undefined;
  try {
    const json = await req.json();
    body = JSON.stringify(json);
  } catch {
    // No body is fine for some endpoints
  }

  const res = await fetch(`${API_URL}${targetPath}`, {
    method: "POST",
    headers: internalHeaders(projectId),
    body,
  });

  if (res.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const projectId = getProjectId(req);
  if (!projectId) {
    return NextResponse.json({ error: "missing project id" }, { status: 400 });
  }

  const { path } = await params;
  const targetPath = `/api/v1/${path.join("/")}`;

  const res = await fetch(`${API_URL}${targetPath}`, {
    method: "DELETE",
    headers: internalHeaders(projectId),
  });

  if (res.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
