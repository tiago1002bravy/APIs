import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

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

export async function POST(req: NextRequest) {
  if (req.method && req.method !== 'POST') {
    return NextResponse.json({ error: 'Método não permitido' }, { status: 405 });
  }

  try {
    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload JSON inválido: deve ser um objeto' }, { status: 400 });
    }

    // Extrair dados do body
    const {
      nome = '',
      email = '',
      telefone = '',
      produto = '',
      acao = '',
      tag = '',
      idproduto = '',
      valor = 0,
      liquidado = false
    } = body;

    // Validar campos obrigatórios
    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    // Processar e sanitizar os dados
    const nomeFinal = String(nome).trim();
    const emailFinal = String(email).trim().toLowerCase();
    const telefoneFinal = String(telefone).trim();
    const produtoFinal = String(produto).trim();
    const acaoFinal = String(acao).trim();
    const tagFinal = String(tag).trim();
    const idprodutoFinal = String(idproduto).trim();
    const valorFinal = Number(valor) || 0;
    const liquidadoFinal = Boolean(liquidado);

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
    console.error('Erro ao processar requisição:', error instanceof Error ? error.message : 'Erro desconhecido');
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
} 