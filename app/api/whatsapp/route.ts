import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mensagem } = body;

    if (!mensagem || typeof mensagem !== "string") {
      return NextResponse.json(
        { erro: "Mensagem não fornecida" },
        { status: 400 }
      );
    }

    // Escapa as aspas com \
    const mensagemFormatada = mensagem.replace(/"/g, '\\"');

    return NextResponse.json({
      mensagem_formatada: mensagemFormatada
    });
  } catch (error) {
    return NextResponse.json(
      { erro: "Erro ao processar a requisição" },
      { status: 500 }
    );
  }
} 