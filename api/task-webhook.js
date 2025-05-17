const axios = require('axios');
const express = require('express');
const app = express();

// Constantes (mesmas do FastAPI)
const TASK_API_BASE_URL = "https://api.clickup.com/api/v2";
const LIST_ID = "901305222206";
const EMAIL_FIELD_ID = "c34aaeb2-0233-42d3-8242-cd9a603b5b0b";
const PHONE_FIELD_ID = "9c5b9ad9-b085-4fdd-a0a9-0110d341de7c";
const VALUE_FIELD_ID = "ae3dc146-154c-4287-b2aa-17e4f643cbf8";
const DOCUMENT_FIELD_ID = "document";
const PAYMENT_METHOD_FIELD_ID = "payment_method";
const PAYMENT_BRAND_FIELD_ID = "payment_brand";
const COUPON_FIELD_ID = "coupon";

// Enums (convertidos para objetos JavaScript)
const WebhookType = {
    SALE: "sale",
    CONTRACT: "contract",
    LEAD: "lead"
};

const WebhookEvent = {
    SALE_UPDATED: "saleUpdated",
    CONTRACT_UPDATED: "contractUpdated",
    CHECKOUT_ABANDONED: "checkoutAbandoned"
};

const SaleStatus = {
    CREATED: "created",
    PAID: "paid",
    WAITING_PAYMENT: "waiting_payment",
    REFUSED: "refused",
    REFUNDED: "refunded",
    CHARGEDBACK: "chargedback"
};

const ProductType = {
    TRANSACTION: "TRANSACTION",
    SUBSCRIPTION: "SUBSCRIPTION"
};

const PaymentMethod = {
    CREDIT_CARD: "CREDIT_CARD",
    TWO_CREDIT_CARDS: "TWO_CREDIT_CARDS",
    BOLETO: "BOLETO",
    PIX: "PIX",
    PAYPAL: "PAYPAL"
};

// Mapeamentos (mesmos do FastAPI)
const STATUS_TO_ACAO = {
    "created": "criada",
    "paid": "comprador",
    "waiting_payment": "aguardando",
    "refused": "recusada",
    "refunded": "reembolsada",
    "chargedback": "chargeback"
};

const PRODUCT_NAME_TO_PRODUTO = {
    "Implementação Bravy": "implementacao",
    // Adicione outros produtos conforme necessário
};

// Funções auxiliares
function validateSaleStatus(status) {
    return Object.values(SaleStatus).includes(status);
}

function validateProductType(productType) {
    return Object.values(ProductType).includes(productType);
}

function validatePaymentMethod(method) {
    if (!method) return false;
    const methods = method.split(",");
    return methods.every(m => Object.values(PaymentMethod).includes(m.trim()));
}

function extractPaymentMetadata(saleMetas) {
    const metadata = {
        brand: null,
        reuse_credit_card: false,
        assoc_ticket: false
    };
    
    if (!saleMetas) return metadata;
    
    for (const meta of saleMetas) {
        if (meta.meta_key === "brand") {
            metadata.brand = meta.meta_value;
        } else if (meta.meta_key === "reuse_credit_card") {
            metadata.reuse_credit_card = meta.meta_value === "1";
        } else if (meta.meta_key === "assoc_ticket") {
            metadata.assoc_ticket = meta.meta_value === "1";
        }
    }
    
    return metadata;
}

async function getTaskByEmail(email, apiToken) {
    try {
        const params = {
            include_closed: "false",
            custom_fields: JSON.stringify([{
                field_id: EMAIL_FIELD_ID,
                operator: "=",
                value: email
            }])
        };
        
        const response = await axios.get(
            `${TASK_API_BASE_URL}/list/${LIST_ID}/task`,
            {
                params,
                headers: {
                    Authorization: apiToken,
                    accept: "application/json"
                }
            }
        );
        
        const data = response.data;
        if (!data.tasks || data.tasks.length === 0) {
            return null;
        }
        
        return data.tasks[0];
    } catch (error) {
        throw new Error(`Erro ao consultar task: ${error.message}`);
    }
}

async function createTask(taskData, apiToken) {
    try {
        const payload = {
            name: `[Lead] ${taskData.name}`,
            custom_fields: [
                { id: EMAIL_FIELD_ID, value: taskData.email }
            ],
            tags: [taskData.tag]
        };
        
        if (taskData.phone) {
            payload.custom_fields.push({ id: PHONE_FIELD_ID, value: taskData.phone });
        }
        if (taskData.value) {
            payload.custom_fields.push({ id: VALUE_FIELD_ID, value: taskData.value });
        }
        if (taskData.document) {
            payload.custom_fields.push({ id: DOCUMENT_FIELD_ID, value: taskData.document });
        }
        if (taskData.payment_method) {
            payload.custom_fields.push({ id: PAYMENT_METHOD_FIELD_ID, value: taskData.payment_method });
        }
        if (taskData.payment_brand) {
            payload.custom_fields.push({ id: PAYMENT_BRAND_FIELD_ID, value: taskData.payment_brand });
        }
        
        const response = await axios.post(
            `${TASK_API_BASE_URL}/list/${LIST_ID}/task`,
            payload,
            { headers: { Authorization: apiToken } }
        );
        
        return response.data;
    } catch (error) {
        throw new Error(`Erro ao criar task: ${error.message}`);
    }
}

async function addTagToTask(taskId, tag, apiToken) {
    try {
        const response = await axios.post(
            `${TASK_API_BASE_URL}/task/${taskId}/tag/${encodeURIComponent(tag)}`,
            {},
            { headers: { Authorization: apiToken } }
        );
        return response.data;
    } catch (error) {
        throw new Error(`Erro ao adicionar tag: ${error.message}`);
    }
}

// Configurar o express para parsear JSON
app.use(express.json());

// Handler da rota
app.post('/api/task-webhook', async (req, res) => {
    try {
        // Extrair payload
        let rawPayload = req.body;
        let payload, webhookToken;

        if (Array.isArray(rawPayload)) {
            if (!rawPayload.length) {
                return res.status(400).json({ error: 'Lista de payload vazia' });
            }
            const webhookData = rawPayload[0];
            payload = webhookData.body || {};
            webhookToken = webhookData.headers?.['x-webhook-token'];
        } else {
            payload = rawPayload;
            webhookToken = null;
        }

        // Extrair token (opcional agora)
        const apiToken = req.headers.authorization || webhookToken;

        // Validar tipo de webhook
        const payloadType = payload.type;
        if (!Object.values(WebhookType).includes(payloadType)) {
            return res.status(400).json({ error: `Tipo de webhook não suportado: ${payloadType}` });
        }

        // Validar evento
        const payloadEvent = payload.event;
        if (!Object.values(WebhookEvent).includes(payloadEvent)) {
            return res.status(400).json({ error: `Evento não suportado: ${payloadEvent}` });
        }

        // Validar combinação tipo/evento
        if (payloadType === WebhookType.SALE && payloadEvent !== WebhookEvent.SALE_UPDATED) {
            return res.status(400).json({ error: 'Evento inválido para webhook de venda' });
        } else if (payloadType === WebhookType.CONTRACT && payloadEvent !== WebhookEvent.CONTRACT_UPDATED) {
            return res.status(400).json({ error: 'Evento inválido para webhook de contrato' });
        } else if (payloadType === WebhookType.LEAD && payloadEvent !== WebhookEvent.CHECKOUT_ABANDONED) {
            return res.status(400).json({ error: 'Evento inválido para webhook de lead' });
        }

        // Extrair dados básicos
        const nome = payload.client?.name;
        const email = payload.client?.email;
        const telefone = payload.client?.cellphone;
        const document = payload.client?.cpf_cnpj;
        const produtoOriginal = payload.product?.name;

        // Validar dados obrigatórios
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ error: 'Email é obrigatório e deve ser uma string' });
        }
        if (!nome || typeof nome !== 'string') {
            return res.status(400).json({ error: 'Nome é obrigatório e deve ser uma string' });
        }

        // Processar telefone
        let telefoneFinal = null;
        if (typeof telefone === 'string' && telefone.trim()) {
            telefoneFinal = telefone.trim();
        } else if (typeof telefone === 'number') {
            telefoneFinal = telefone.toString();
        }

        // Processar dados específicos por tipo
        let tagFinal, valorFinal, paymentMethod, paymentBrand, sellerBalance;

        if (payloadType === WebhookType.SALE) {
            // Validar status
            const currentStatus = payload.currentStatus;
            if (!validateSaleStatus(currentStatus)) {
                return res.status(400).json({ error: `Status de venda inválido: ${currentStatus}` });
            }

            // Validar tipo do produto
            const productType = payload.product?.type;
            if (productType && !validateProductType(productType)) {
                return res.status(400).json({ error: `Tipo de produto inválido: ${productType}` });
            }

            // Validar método de pagamento
            const paymentMethodRaw = payload.product?.method;
            if (paymentMethodRaw && !validatePaymentMethod(paymentMethodRaw)) {
                return res.status(400).json({ error: `Método de pagamento inválido: ${paymentMethodRaw}` });
            }

            // Extrair dados da venda
            valorFinal = payload.sale?.amount;
            paymentMethod = payload.sale?.method;
            sellerBalance = payload.sale?.seller_balance;
            const saleMetas = payload.saleMetas;
            const paymentMetadata = extractPaymentMetadata(saleMetas);
            paymentBrand = paymentMetadata.brand;

            // Determinar tag
            const produtoFinal = PRODUCT_NAME_TO_PRODUTO[produtoOriginal] || 'produto';
            const acaoFinal = STATUS_TO_ACAO[currentStatus.toLowerCase()] || 'outro';
            tagFinal = `${acaoFinal}-${produtoFinal}`;
        } else if (payloadType === WebhookType.CONTRACT) {
            // Determinar tag para contrato
            const produtoFinal = PRODUCT_NAME_TO_PRODUTO[produtoOriginal] || 'prodato';
            const acaoFinal = STATUS_TO_ACAO[payload.currentStatus.toLowerCase()] || 'outro';
            tagFinal = `${acaoFinal}-${produtoFinal}`;
        } else { // WebhookType.LEAD
            // Tag fixa para abandono
            const produtoFinal = PRODUCT_NAME_TO_PRODUTO[produtoOriginal] || 'produto';
            tagFinal = `abandonada-${produtoFinal}`;
        }

        // Validar tag final
        if (!tagFinal) {
            return res.status(400).json({ error: 'Não foi possível determinar a tag da task' });
        }

        // Consultar task existente
        const existingTask = await getTaskByEmail(email, apiToken);

        if (existingTask) {
            // Adicionar tag à task existente
            await addTagToTask(existingTask.id, tagFinal, apiToken);
            return res.json({
                message: 'Tag adicionada à task existente',
                task_id: existingTask.id,
                tag: tagFinal,
                email,
                type: payloadType,
                event: payloadEvent,
                status: payloadType !== WebhookType.LEAD ? payload.currentStatus : null
            });
        } else {
            // Criar nova task
            const taskData = {
                name: nome,
                email,
                phone: telefoneFinal,
                tag: tagFinal,
                document,
                value: valorFinal,
                payment_method: paymentMethod,
                payment_brand: paymentBrand,
                seller_balance: sellerBalance
            };

            const newTask = await createTask(taskData, apiToken);
            return res.json({
                message: 'Nova task criada',
                task: newTask,
                tag: tagFinal,
                email,
                type: payloadType,
                event: payloadEvent,
                status: payloadType !== WebhookType.LEAD ? payload.currentStatus : null
            });
        }
    } catch (error) {
        console.error('Erro ao processar webhook:', error);
        return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
    }
});

// Exportar o app para a Vercel
module.exports = app; 