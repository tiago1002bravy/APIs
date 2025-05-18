const axios = require('axios');

// Constantes para a API do ClickUp
const CLICKUP_API_BASE_URL = 'https://api.clickup.com/api/v2';
const LIST_ID = '901305222206';
const EMAIL_FIELD_ID = 'c34aaeb2-0233-42d3-8242-cd9a603b5b0b';
const API_TOKEN = 'pk_18911835_PZA4YYUSR3JI37KV7CMEKNV62796SML1';

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

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const { email_lead } = req.body;

        // Validar email
        if (!email_lead || typeof email_lead !== 'string' || !email_lead.trim()) {
            return res.status(400).json({ 
                error: 'Email do lead é obrigatório e deve ser uma string válida' 
            });
        }

        // Consultar lead no ClickUp
        const lead = await getLeadByEmail(email_lead.trim());

        if (lead) {
            return res.status(200).json([{
                "task id": lead.id,
                "name": lead.name,
                "email": email_lead,
                "status": lead.status?.status,
                "tags": lead.tags,
                "custom_fields": lead.custom_fields
            }]);
        } else {
            return res.status(200).json([{
                "task id": "não encontrado"
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