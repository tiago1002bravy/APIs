import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dados } = body;

    if (!dados || typeof dados !== "string") {
      return NextResponse.json(
        { erro: "Dados não fornecidos corretamente" },
        { status: 400 }
      );
    }

    // Divide a string pelos separadores de vírgula e remove espaços em branco
    const [name, email, phone] = dados.split(",").map(item => item.trim());

    // Verifica se todos os campos foram preenchidos
    if (!name || !email || !phone) {
      return NextResponse.json(
        { erro: "Dados incompletos. Necessário nome, email e telefone" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      name,
      email,
      phone
    });
  } catch (error) {
    return NextResponse.json(
      { erro: "Erro ao processar a requisição" },
      { status: 500 }
    );
  }
} 