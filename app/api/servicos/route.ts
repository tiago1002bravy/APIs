import { type NextRequest, NextResponse } from "next/server";

const SERVICOS = {
  "SPDA": "0f41c296-67f6-4ca9-b5fd-f2488c6662b3",
  "Controle de Acesso": "5d71f1f9-b791-4ea8-9414-0d658b5fd06e",
  "Elétrica": "1d7553b5-a5f8-49f1-ad52-0379fcdd43d5",
  "CVE (Carregador Veicular Elétrico)": "ec3b85a3-add8-4b5d-9bba-ff9fd976fea7",
  "Alarme de incêndio (SDAi)": "f54d0708-b6f8-4b2a-af87-36933f821b29",
  "Alvenaria": "aae19f74-2108-4a76-b841-6322cb152fd1",
  "Fachada": "07d7abd5-37f2-4a8e-bc00-cf77ae045a0c",
  "Serralheria": "ba2a41d9-50ca-4322-94e9-32a9d69c3450",
  "Portaria Inteligente": "222935c8-13df-4a23-bbf9-d5611f138f15",
  "Alarme Perimetral e Intrusão": "1d6f66ad-c42a-4006-9e03-2e340c9c27fb",
  "Nobreak": "55acfb02-3acb-4a2c-a059-1349d340fa9b",
  "PABX em nuvem": "ab0a104c-a82b-4956-b3a1-15e9befa6857",
  "Automatizadores": "ae971fad-ee16-4733-a290-ad1e2d282f5d",
  "Projeto de Segurança": "fa1fc334-af2a-4fad-bcad-a52c757bb4da",
  "Software": "168f9c82-6217-4409-a0a5-1f06385d4ec6"
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { value } = body;

    if (!value || typeof value !== "string") {
      return NextResponse.json(
        { erro: "Valor não fornecido" },
        { status: 400 }
      );
    }

    // Divide a string de serviços em um array e remove espaços
    const servicos = value.split(",").map(servico => servico.trim());
    
    // Mapeia os nomes dos serviços para seus IDs
    const ids = servicos
      .map(servico => SERVICOS[servico as keyof typeof SERVICOS])
      .filter(id => id !== undefined);

    // Junta os IDs com vírgula
    const resultado = ids.join(",");

    return NextResponse.json({
      value_id: resultado
    });
  } catch (error) {
    return NextResponse.json(
      { erro: "Erro ao processar a requisição" },
      { status: 500 }
    );
  }
} 