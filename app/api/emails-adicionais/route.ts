import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { emails } = body;

    if (!emails || typeof emails !== "string") {
      return NextResponse.json([], { status: 200 });
    }

    const resultado = emails
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.length > 0)
      .map((email) => ({ email }));

    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}
