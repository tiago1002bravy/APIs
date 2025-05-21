import axios from "axios";
import { NextResponse } from "next/server";

interface CustomFieldOption {
  id: string;
  name: string;
  color: string | null;
  orderindex: number;
}

interface CustomFieldTypeConfig {
  sorting: string;
  new_drop_down: boolean;
  options: CustomFieldOption[];
}

interface CustomFieldRequest {
  id: string;
  name: string;
  type: string;
  type_config: CustomFieldTypeConfig;
  date_created: string;
  hide_from_guests: boolean;
  value: number;
  value_richtext: string | null;
  required: boolean;
}

export async function POST(req) {
  if (req.method && req.method !== 'POST') {
    return NextResponse.json({ error: 'Método não permitido' }, { status: 405 });
  }

  try {
    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload JSON inválido: deve ser um objeto' }, { status: 400 });
    }

    // ... (toda a lógica de extração e processamento, igual ao original)

    const outputData = {
      nome: nomeFinal,
      email: emailFinal,
      telefone: telefoneFinal,
      produto: produtoFinal,
      acao: acaoFinal,
      tag: tagFinal,
      idproduto: idprodutoFinal,
      valor: valorFinal,
      liquidado: liquidadoFinal
    };

    return NextResponse.json(outputData);
  } catch (error) {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
} 