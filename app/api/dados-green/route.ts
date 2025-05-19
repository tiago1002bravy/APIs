import { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Tipos para os mapeamentos
type StatusType = 'created' | 'paid' | 'waiting_payment' | 'refused' | 'refunded' | 'chargedback';
type ProductNameType = 'Mentoria Black' | 'Implementação Bravy' | 'Bravy Club' | 'Floow PRO' | 'Bravy Black' | 'ClickUp Pro' | 'Club+Floow' | 'ClickUp Start' | 'CRM Automatizado';

// Mapeamentos de status e produtos
const STATUS_TO_ACAO: Record<StatusType, string> = {
    "created": "lead",
    "paid": "comprador",
    "waiting_payment": "pixgerado",
    "refused": "recusado",
    "refunded": "reembolsado",
    "chargedback": "chargeback"
};

const PRODUCT_NAME_TO_PRODUTO: Record<ProductNameType, string> = {
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

// Função auxiliar para verificar se uma string é um status válido
function isValidStatus(status: string): status is StatusType {
    return status in STATUS_TO_ACAO;
}

// Função auxiliar para verificar se uma string é um nome de produto válido
function isValidProductName(name: string): name is ProductNameType {
    return name in PRODUCT_NAME_TO_PRODUTO;
}

// Interfaces para tipagem
interface WebhookPayload {
    type?: string;
    event?: string;
    client?: {
        name?: string;
        email?: string;
        cellphone?: string;
    };
    product?: {
        name?: string;
        amount?: number;
    };
    sale?: {
        amount?: number;
        status?: string;
        seller_balance?: number;
    };
    currentSale?: {
        amount?: number;
        status?: string;
        seller_balance?: number;
    };
    lead?: {
        name?: string;
        email?: string;
        cellphone?: string;
    };
    body?: WebhookPayload;
}

// Função auxiliar para extrair campos do payload
function extractField(payload: Record<string, any> | null, paths: string[][]): any {
    if (!payload) return null;
    for (const path of paths) {
        let value: any = payload;
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

export async function POST(req: NextRequest): Promise<Response> {
    try {
        let payload: WebhookPayload | null = await req.json();
        // Se for um array com campo body, extrai o body
        if (Array.isArray(payload) && payload.length > 0 && payload[0]?.body) {
            payload = payload[0].body;
        } else if (payload?.body && typeof payload.body === 'object') {
            payload = payload.body;
        }
        if (!payload || typeof payload !== 'object') {
            return NextResponse.json({ error: 'Payload JSON inválido: deve ser um objeto' }, { status: 400 });
        }

        // Detectar tipo do webhook
        const type = payload.type;
        const event = payload.event;
        let nomeFinal: string | null = null;
        let emailFinal: string | null = null;
        let telefoneFinal: string | null = null;
        let produtoFinal: string | null = null;
        let valorFinal: number | null = null;
        let acaoFinal: string | null = null;
        let tagFinal: string | null = null;
        let idprodutoFinal: string | null = null;
        let liquidadoFinal: number | null = null;

        if (type === 'sale') {
            // Webhook de venda
            nomeFinal = payload.client?.name ?? null;
            emailFinal = payload.client?.email ?? null;
            telefoneFinal = payload.client?.cellphone ?? null;
            const productName = payload.product?.name?.trim();
            produtoFinal = productName ? (isValidProductName(productName) ? PRODUCT_NAME_TO_PRODUTO[productName] : productName.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')) : null;
            valorFinal = payload.sale?.amount ?? null;
            const status = payload.sale?.status?.toLowerCase();
            acaoFinal = status && isValidStatus(status) ? STATUS_TO_ACAO[status] : null;
            tagFinal = (acaoFinal && produtoFinal) ? `${acaoFinal}-${produtoFinal}` : null;
            idprodutoFinal = tagFinal;
            if (acaoFinal === 'comprador') {
                liquidadoFinal = payload.sale?.seller_balance ?? null;
            }
        } else if (type === 'contract') {
            // Webhook de contrato
            nomeFinal = payload.client?.name ?? null;
            emailFinal = payload.client?.email ?? null;
            telefoneFinal = payload.client?.cellphone ?? null;
            const productName = payload.product?.name?.trim();
            produtoFinal = productName ? (isValidProductName(productName) ? PRODUCT_NAME_TO_PRODUTO[productName] : productName.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')) : null;
            valorFinal = payload.currentSale?.amount ?? null;
            const status = payload.currentSale?.status?.toLowerCase();
            acaoFinal = status && isValidStatus(status) ? STATUS_TO_ACAO[status] : null;
            tagFinal = (acaoFinal && produtoFinal) ? `${acaoFinal}-${produtoFinal}` : null;
            idprodutoFinal = tagFinal;
            if (acaoFinal === 'comprador') {
                liquidadoFinal = payload.currentSale?.seller_balance ?? null;
            }
        } else if (type === 'lead' && event === 'checkoutAbandoned') {
            // Webhook de abandono de carrinho
            nomeFinal = payload.lead?.name ?? null;
            emailFinal = payload.lead?.email ?? null;
            telefoneFinal = payload.lead?.cellphone ?? null;
            const productName = payload.product?.name?.trim();
            produtoFinal = productName ? (isValidProductName(productName) ? PRODUCT_NAME_TO_PRODUTO[productName] : productName.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')) : null;
            valorFinal = payload.product?.amount ?? null;
            acaoFinal = 'abandonado';
            tagFinal = (acaoFinal && produtoFinal) ? `${acaoFinal}-${produtoFinal}` : null;
            idprodutoFinal = tagFinal;
        } else {
            return NextResponse.json({ error: 'Tipo de webhook não suportado' }, { status: 400 });
        }

        // Debug: log do email extraído
        console.log('Email extraído:', emailFinal);

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