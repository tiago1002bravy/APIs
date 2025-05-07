import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { produtos_comprados, todos_produtos } = body;

    if (!produtos_comprados || !todos_produtos || typeof produtos_comprados !== "string" || typeof todos_produtos !== "string") {
      return NextResponse.json(
        { erro: "Dados não fornecidos corretamente" },
        { status: 400 }
      );
    }

    // Processa a lista de todos os produtos
    const produtosMap = new Map<string, string>();
    const linhas = todos_produtos.split("\n");

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i].trim();
      if (linha.startsWith("ID:")) {
        const id = linha.replace("ID:", "").trim();
        const nome = linhas[i + 1].replace("Nome:", "").trim();
        produtosMap.set(id, nome);
      }
    }

    // Processa os produtos comprados
    const arrayIds = produtos_comprados.split(",").map(id => id.trim());
    const nomesProdutos = arrayIds
      .map(id => produtosMap.get(id))
      .filter(nome => nome !== undefined);

    // Junta os nomes com vírgula
    const resultado = nomesProdutos.join(", ");

    return NextResponse.json({
      produtos: resultado
    });
  } catch (error) {
    return NextResponse.json(
      { erro: "Erro ao processar a requisição" },
      { status: 500 }
    );
  }
} 