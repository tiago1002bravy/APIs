import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { telefone } = body;

    if (!telefone || typeof telefone !== "string") {
      return NextResponse.json({ telefone: "" }, { status: 200 });
    }

    // Remove todos os caracteres não numéricos
    const numeroFormatado = telefone.replace(/\D/g, "");

    return NextResponse.json({ telefone: numeroFormatado }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ telefone: "" }, { status: 200 });
  }
} 