import { type NextRequest, NextResponse } from "next/server";

const DIAS_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado"
];

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
    const diaMes = dataObj.getDate();

    return NextResponse.json({
      dia: diaSemana.toString(),
      dia_semana: DIAS_SEMANA[diaSemana],
      dia_mes: diaMes
    });
  } catch (error) {
    return NextResponse.json(
      { erro: "Erro ao processar a requisição" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "API ativa! Use POST para consultar o dia da semana." });
} 