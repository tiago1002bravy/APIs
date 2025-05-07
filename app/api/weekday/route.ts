import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data } = body;

    if (!data || typeof data !== "string") {
      return NextResponse.json(
        { erro: "Data não fornecida" },
        { status: 400 }
      );
    }

    const dataObj = new Date(data);
    
    if (isNaN(dataObj.getTime())) {
      return NextResponse.json(
        { erro: "Data inválida" },
        { status: 400 }
      );
    }

    const diaSemana = dataObj.getDay();

    return NextResponse.json({
      dia: diaSemana.toString()
    });
  } catch (error) {
    return NextResponse.json(
      { erro: "Erro ao processar a requisição" },
      { status: 500 }
    );
  }
} 