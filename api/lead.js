const axios = require('axios');

// Constantes para a API do ClickUp
const CLICKUP_API_BASE_URL = 'https://api.clickup.com/api/v2';
const LIST_ID = '901305222206';
const EMAIL_FIELD_ID = 'c34aaeb2-0233-42d3-8242-cd9a603b5b0b';
const PHONE_FIELD_ID = '9c5b9ad9-b085-4fdd-a0a9-0110d341de7c';
const VALUE_FIELD_ID = 'ae3dc146-154c-4287-b2aa-17e4f643cbf8';
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
            include_closed: 'false',
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

async function createTask(email, nome, phone, valor) {
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
        }

        // Adiciona valor se fornecido
        if (valor) {
            customFields.push({
                id: VALUE_FIELD_ID,
                value: parseFloat(valor)
            });
        }

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

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const { email_lead, nome_lead, phone_lead, valor } = req.body;

        // Validar email
        if (!email_lead || typeof email_lead !== 'string' || !email_lead.trim()) {
            return res.status(400).json({ 
                error: 'Email do lead é obrigatório e deve ser uma string válida' 
            });
        }

        const email = email_lead.trim();

        // Consultar lead no ClickUp
        const lead = await getLeadByEmail(email);

        if (lead) {
            return res.status(200).json([{
                "task id": lead.id,
                "name": lead.name,
                "email": email,
                "status": lead.status?.status,
                "tags": lead.tags,
                "custom_fields": lead.custom_fields
            }]);
        } else {
            // Criar nova task quando lead não for encontrado
            const newTask = await createTask(email, nome_lead, phone_lead, valor);
            return res.status(200).json([{
                "task id": newTask.id,
                "name": newTask.name,
                "email": email,
                "status": newTask.status?.status,
                "custom_fields": newTask.custom_fields
            }]);
        }

    } catch (error) {
        console.error('Erro ao processar requisição:', error);
        
        // Tratar erros específicos do ClickUp
        if (error.response) {
            if (error.response.status === 401) {
                return res.status(401).json({ 
                    error: 'Token de autorização inválido ou expirado' 
                });
            }
            if (error.response.status === 404) {
                return res.status(404).json({ 
                    error: 'Lista não encontrada no ClickUp' 
                });
            }
        }

        return res.status(500).json({ 
            error: 'Erro interno do servidor ao consultar o ClickUp' 
        });
    }
}; 