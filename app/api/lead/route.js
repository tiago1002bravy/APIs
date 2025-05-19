import axios from "axios";
import { NextResponse } from "next/server";

// Constantes para a API do ClickUp
const CLICKUP_API_BASE_URL = 'https://api.clickup.com/api/v2';
const LIST_ID = '901305222206';
const EMAIL_FIELD_ID = 'c34aaeb2-0233-42d3-8242-cd9a603b5b0b';
const PHONE_FIELD_ID = '9c5b9ad9-b085-4fdd-a0a9-0110d341de7c';
const VALUE_FIELD_ID = 'ae3dc146-154c-4287-b2aa-17e4f643cbf8';
const WHATSAPP_LINK_FIELD_ID = '2b8641e9-5bda-4416-85a3-bd8f764794c0';
const ACAO_FIELD_ID = '2b8641e9-5bda-4416-85a3-bd8f764794c1';
const TAG_FIELD_ID = '2b8641e9-5bda-4416-85a3-bd8f764794c2';
const LIQUIDADO_FIELD_ID = 'bcb43ba1-d0d9-4068-9943-41509bf24253';
const API_TOKEN = 'pk_18911835_PZA4YYUSR3JI37KV7CMEKNV62796SML1';

// Função para obter timestamp atual em milissegundos
function getCurrentTimestamp() {
    return Date.now();
}

// Função para obter timestamp de amanhã em milissegundos
function getTomorrowTimestamp() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.getTime();
}

async function getLeadByEmail(email) {
    try {
        const params = {
            include_closed: 'true',
            custom_fields: JSON.stringify([{
                field_id: EMAIL_FIELD_ID,
                operator: '=',
                value: email
            }])
        };

        const headers = {
            'Authorization': API_TOKEN,
            'accept': 'application/json'
        };

        const response = await axios.get(`${CLICKUP_API_BASE_URL}/list/${LIST_ID}/task`, {
            params,
            headers
        });

        // Se não houver tasks, retorna null
        if (!response.data.tasks || response.data.tasks.length === 0) {
            return null;
        }

        // Retorna a primeira task encontrada
        return response.data.tasks[0];
    } catch (error) {
        console.error('Erro ao consultar lead:', error.response?.data || error.message);
        throw error;
    }
}

async function createTask(email, nome, phone, valor, acao, tag, liquidado) {
    try {
        const headers = {
            'Authorization': API_TOKEN,
            'accept': 'application/json',
            'content-type': 'application/json'
        };

        const customFields = [
            {
                id: EMAIL_FIELD_ID,
                value: email
            }
        ];

        // Adiciona telefone se fornecido
        if (phone) {
            customFields.push({
                id: PHONE_FIELD_ID,
                value: phone
            });

            // Adiciona link do WhatsApp
            const whatsappLink = `wa.me/${phone.replace('+', '')}`;
            customFields.push({
                id: WHATSAPP_LINK_FIELD_ID,
                value: whatsappLink
            });
        }

        // Adiciona valor se fornecido
        if (valor) {
            customFields.push({
                id: VALUE_FIELD_ID,
                value: parseFloat(valor)
            });
        }

        // Adiciona campo liquidado se acao for comprador e liquidado for enviado
        if (acao && typeof acao === 'string' && acao.trim().toLowerCase() === 'comprador' && liquidado !== undefined) {
            customFields.push({
                id: LIQUIDADO_FIELD_ID,
                value: liquidado
            });
        }

        // TODO: Adicionar campos de ação e tag quando a integração com ClickUp estiver pronta
        console.log('Ação recebida:', acao);
        console.log('Tag recebida:', tag);
        console.log('Liquidado recebido:', liquidado);

        const payload = {
            name: nome || `[Lead] ${email}`,
            start_date: getCurrentTimestamp(),
            start_date_time: true,
            due_date_time: true,
            due_date: getTomorrowTimestamp(),
            custom_fields: customFields
        };

        const response = await axios.post(
            `${CLICKUP_API_BASE_URL}/list/${LIST_ID}/task`,
            payload,
            { headers }
        );

        return response.data;
    } catch (error) {
        console.error('Erro ao criar task:', error.response?.data || error.message);
        throw error;
    }
}

// Função para adicionar tag a uma task
async function addTagToTask(taskId, tagName) {
    try {
        const headers = {
            'Authorization': API_TOKEN,
            'accept': 'application/json'
        };

        const response = await axios.post(
            `${CLICKUP_API_BASE_URL}/task/${taskId}/tag/${tagName}`,
            {},
            { headers }
        );

        return response.data;
    } catch (error) {
        console.error(`Erro ao adicionar tag ${tagName}:`, error.response?.data || error.message);
        throw error;
    }
}

// Função para obter as tags de uma task
async function getTaskTags(taskId) {
    try {
        const headers = {
            'Authorization': API_TOKEN,
            'accept': 'application/json'
        };

        const response = await axios.get(
            `${CLICKUP_API_BASE_URL}/task/${taskId}`,
            { headers }
        );

        // Log para debug
        console.log('Tags da task:', response.data.tags);
        
        // Garantir que retornamos um array de tags
        const tags = response.data.tags || [];
        return Array.isArray(tags) ? tags : [];
    } catch (error) {
        console.error('Erro ao obter tags da task:', error.response?.data || error.message);
        throw error;
    }
}

// Função para verificar se a task tem a tag de produto específica
async function taskHasProductTag(taskId, produto) {
    if (!produto) return true; // Se não houver produto especificado, considera que é compatível
    
    try {
        const tags = await getTaskTags(taskId);
        
        // Log para debug
        console.log('Verificando produto:', produto);
        console.log('Tags encontradas:', tags);
        
        // Verifica se alguma das tags tem o campo name igual ao produto (case insensitive)
        const temProduto = tags.some(tagObj => {
            if (typeof tagObj === 'string') {
                return tagObj.toLowerCase() === produto.toLowerCase();
            } else if (tagObj && tagObj.name) {
                return tagObj.name.toLowerCase() === produto.toLowerCase();
            }
            return false;
        });
        
        console.log('Task tem o produto?', temProduto);
        return temProduto;
    } catch (error) {
        console.error('Erro ao verificar tags da task:', error);
        // Em caso de erro, retorna false para criar uma nova task
        return false;
    }
}

// Função para atualizar o campo liquidado
async function updateLiquidadoField(taskId, valorLiquidado) {
    try {
        console.log('Atualizando campo liquidado:');
        console.log('Task ID:', taskId);
        console.log('Valor Liquidado:', valorLiquidado);
        
        const headers = {
            'Authorization': API_TOKEN,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        console.log('Headers:', headers);
        console.log('URL:', `${CLICKUP_API_BASE_URL}/task/${taskId}/field/${LIQUIDADO_FIELD_ID}`);
        console.log('Body:', JSON.stringify({ value: String(valorLiquidado) }));

        const response = await axios.post(
            `${CLICKUP_API_BASE_URL}/task/${taskId}/field/${LIQUIDADO_FIELD_ID}`,
            { value: String(valorLiquidado) },
            { headers }
        );

        console.log('Resposta da API:', response.data);
        return response.data;
    } catch (error) {
        console.error('Erro detalhado ao atualizar campo liquidado:');
        console.error('Status:', error.response?.status);
        console.error('Data:', error.response?.data);
        console.error('Headers:', error.response?.headers);
        throw error;
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { email_lead, nome_lead, phone_lead, valor, acao, tag, produto, liquidado } = body;

        // Validar email
        if (!email_lead || typeof email_lead !== 'string' || !email_lead.trim()) {
            return NextResponse.json({ 
                error: 'Email do lead é obrigatório e deve ser uma string válida' 
            }, { status: 400 });
        }

        const email = email_lead.trim();

        // Consultar lead no ClickUp
        const lead = await getLeadByEmail(email);
        let taskId;
        let operacao = [];

        if (lead) {
            const temMesmoProduto = await taskHasProductTag(lead.id, produto);
            
            if (temMesmoProduto) {
                operacao.push("task existente atualizada");
                taskId = lead.id;
                
                // Adicionar novas tags à task existente
                if (acao) {
                    await addTagToTask(taskId, acao);
                    operacao.push("tag de ação adicionada");
                }
                if (tag) {
                    await addTagToTask(taskId, tag);
                    operacao.push("tag adicionada");
                }
                if (produto) {
                    await addTagToTask(taskId, produto);
                    operacao.push("tag de produto adicionada");
                }
                if (acao && typeof acao === 'string' && acao.trim().toLowerCase() === 'comprador' && liquidado !== undefined) {
                    await updateLiquidadoField(taskId, liquidado);
                    operacao.push("campo liquidado atualizado");
                }
            } else {
                operacao.push("nova task (produto diferente)");
                const newTask = await createTask(email, nome_lead, phone_lead, valor, acao, tag, liquidado);
                taskId = newTask.id;
                
                if (acao) {
                    await addTagToTask(taskId, acao);
                    operacao.push("tag de ação adicionada");
                }
                if (tag) {
                    await addTagToTask(taskId, tag);
                    operacao.push("tag adicionada");
                }
                if (produto) {
                    await addTagToTask(taskId, produto);
                    operacao.push("tag de produto adicionada");
                }
                if (acao && typeof acao === 'string' && acao.trim().toLowerCase() === 'comprador' && liquidado !== undefined) {
                    await updateLiquidadoField(taskId, liquidado);
                    operacao.push("campo liquidado atualizado");
                }
            }
        } else {
            operacao.push("nova task");
            const newTask = await createTask(email, nome_lead, phone_lead, valor, acao, tag, liquidado);
            taskId = newTask.id;
            
            if (acao) {
                await addTagToTask(taskId, acao);
                operacao.push("tag de ação adicionada");
            }
            if (tag) {
                await addTagToTask(taskId, tag);
                operacao.push("tag adicionada");
            }
            if (produto) {
                await addTagToTask(taskId, produto);
                operacao.push("tag de produto adicionada");
            }
            if (acao && typeof acao === 'string' && acao.trim().toLowerCase() === 'comprador' && liquidado !== undefined) {
                await updateLiquidadoField(taskId, liquidado);
                operacao.push("campo liquidado atualizado");
            }
        }

        return NextResponse.json([{
            "task id": taskId,
            "operacao": operacao.join(", "),
            "tags_adicionadas": { acao, tag, produto }
        }]);

    } catch (error) {
        console.error('Erro ao processar requisição:', error);
        
        // Tratar erros específicos do ClickUp
        if (error.response) {
            if (error.response.status === 401) {
                return NextResponse.json({ 
                    error: 'Token de autorização inválido ou expirado' 
                }, { status: 401 });
            }
            if (error.response.status === 404) {
                return NextResponse.json({ 
                    error: 'Lista ou task não encontrada no ClickUp' 
                }, { status: 404 });
            }
        }

        return NextResponse.json({ 
            error: 'Erro interno do servidor ao consultar o ClickUp' 
        }, { status: 500 });
    }
} 