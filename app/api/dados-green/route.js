import { NextResponse } from "next/server";

// Mapeamentos de status e produtos
const STATUS_TO_ACAO = {
    "created": "lead",
    "paid": "comprador",
    "waiting_payment": "pixgerado",
    "refused": "recusado",
    "refunded": "reembolsado",
    "chargedback": "chargeback"
};

const PRODUCT_NAME_TO_PRODUTO = {
    "Mentoria Black": "mentoria-black",
    "Implementação Bravy": "implementacao-bravy",
    "Bravy Club": "bravy-club",
    "Floow PRO": "floow-pro",
    "Bravy Black": "bravy-black",
    "ClickUp Pro": "clickup-pro",
    "Club+Floow": "club+floow",
    "ClickUp Start": "clickup-start",
    "CRM Automatizado": "crm-automatizado"
};

// Função auxiliar para extrair campos do payload
function extractField(payload, paths) {
    for (const path of paths) {
        let value = payload;
        for (const key of path) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                value = null;
                break;
            }
        }
        if (value !== null) {
            return value;
        }
    }
    return null;
}

export async function POST(req) {
    try {
        let payload = await req.json();
        // Se for um array com campo body, extrai o body
        if (Array.isArray(payload) && payload.length > 0 && payload[0].body) {
            payload = payload[0].body;
        }
        if (!payload || typeof payload !== 'object') {
            return NextResponse.json({ error: 'Payload JSON inválido: deve ser um objeto' }, { status: 400 });
        }

        // Detectar tipo do webhook
        const type = payload.type;
        const event = payload.event;
        let nomeFinal = null, emailFinal = null, telefoneFinal = null, produtoFinal = null, valorFinal = null, acaoFinal = null, tagFinal = null, idprodutoFinal = null, liquidadoFinal = null;

        if (type === 'sale') {
            // Webhook de venda
            nomeFinal = payload.client?.name || null;
            emailFinal = payload.client?.email || null;
            telefoneFinal = payload.client?.cellphone || null;
            produtoFinal = PRODUCT_NAME_TO_PRODUTO[payload.product?.name?.trim()] || (payload.product?.name?.trim()?.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')) || null;
            valorFinal = payload.sale?.amount || null;
            acaoFinal = STATUS_TO_ACAO[payload.sale?.status?.toLowerCase()] || null;
            tagFinal = (acaoFinal && produtoFinal) ? `${acaoFinal}-${produtoFinal}` : null;
            idprodutoFinal = tagFinal;
            if (acaoFinal === 'comprador') {
                liquidadoFinal = payload.sale?.seller_balance || null;
            }
        } else if (type === 'contract') {
            // Webhook de contrato
            nomeFinal = payload.client?.name || null;
            emailFinal = payload.client?.email || null;
            telefoneFinal = payload.client?.cellphone || null;
            produtoFinal = PRODUCT_NAME_TO_PRODUTO[payload.product?.name?.trim()] || (payload.product?.name?.trim()?.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')) || null;
            valorFinal = payload.currentSale?.amount || null;
            acaoFinal = STATUS_TO_ACAO[payload.currentSale?.status?.toLowerCase()] || null;
            tagFinal = (acaoFinal && produtoFinal) ? `${acaoFinal}-${produtoFinal}` : null;
            idprodutoFinal = tagFinal;
            if (acaoFinal === 'comprador') {
                liquidadoFinal = payload.currentSale?.seller_balance || null;
            }
        } else if (type === 'lead' && event === 'checkoutAbandoned') {
            // Webhook de abandono de carrinho
            nomeFinal = payload.lead?.name || null;
            emailFinal = payload.lead?.email || null;
            telefoneFinal = payload.lead?.cellphone || null;
            produtoFinal = PRODUCT_NAME_TO_PRODUTO[payload.product?.name?.trim()] || (payload.product?.name?.trim()?.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')) || null;
            valorFinal = payload.product?.amount || null;
            acaoFinal = 'abandonado';
            tagFinal = (acaoFinal && produtoFinal) ? `${acaoFinal}-${produtoFinal}` : null;
            idprodutoFinal = tagFinal;
        } else {
            return NextResponse.json({ error: 'Tipo de webhook não suportado' }, { status: 400 });
        }

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

        return NextResponse.json([outputData]);
    } catch (error) {
        console.error('Erro ao processar webhook:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
} 