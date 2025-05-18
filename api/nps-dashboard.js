const axios = require('axios');

// Constantes para a API do ClickUp
const CLICKUP_API_BASE_URL = 'https://api.clickup.com/api/v2';
const LIST_ID = '901305222206';
const API_TOKEN = 'pk_18911835_PZA4YYUSR3JI37KV7CMEKNV62796SML1';

// IDs dos campos personalizados do ClickUp para NPS
const NPS_ENVIADO_FIELD_ID = 'nps_enviado'; // Substitua pelo ID real
const NPS_RESPONDIDO_FIELD_ID = 'nps_respondido'; // Substitua pelo ID real
const NPS_SCORE_FIELD_ID = 'nps_score'; // Substitua pelo ID real

async function getNPSTasks() {
    try {
        const headers = {
            'Authorization': API_TOKEN,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        // Buscar todas as tasks da lista
        const response = await axios.get(
            `${CLICKUP_API_BASE_URL}/list/${LIST_ID}/task`,
            { 
                headers,
                params: {
                    include_closed: 'true',
                    custom_fields: JSON.stringify([
                        { field_id: NPS_ENVIADO_FIELD_ID },
                        { field_id: NPS_RESPONDIDO_FIELD_ID },
                        { field_id: NPS_SCORE_FIELD_ID }
                    ])
                }
            }
        );

        return response.data.tasks || [];
    } catch (error) {
        console.error('Erro ao buscar tasks do NPS:', error.response?.data || error.message);
        throw error;
    }
}

function calculateNPSMetrics(tasks) {
    let metrics = {
        total: 0,
        enviados: 0,
        respondidos: 0,
        detratores: 0,
        promotores: 0,
        neutros: 0
    };

    tasks.forEach(task => {
        metrics.total++;
        
        // Verificar se NPS foi enviado
        const npsEnviado = task.custom_fields?.find(field => field.id === NPS_ENVIADO_FIELD_ID)?.value;
        if (npsEnviado) {
            metrics.enviados++;
        }

        // Verificar se NPS foi respondido
        const npsRespondido = task.custom_fields?.find(field => field.id === NPS_RESPONDIDO_FIELD_ID)?.value;
        if (npsRespondido) {
            metrics.respondidos++;
        }

        // Verificar score do NPS
        const npsScore = task.custom_fields?.find(field => field.id === NPS_SCORE_FIELD_ID)?.value;
        if (npsScore !== undefined && npsScore !== null) {
            const score = parseInt(npsScore);
            if (score >= 0 && score <= 10) {
                if (score <= 6) {
                    metrics.detratores++;
                } else if (score >= 9) {
                    metrics.promotores++;
                } else {
                    metrics.neutros++;
                }
            }
        }
    });

    return metrics;
}

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const tasks = await getNPSTasks();
        const metrics = calculateNPSMetrics(tasks);

        return res.status(200).json(metrics);
    } catch (error) {
        console.error('Erro ao processar requisição:', error);
        
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