import axios from "axios";
import { NextResponse } from "next/server";

// Constantes para a API do ClickUp
const CLICKUP_API_BASE_URL = 'https://api.clickup.com/api/v2';
const LIST_ID = '901304813310';
const API_TOKEN = 'pk_18911835_PZA4YYUSR3JI37KV7CMEKNV62796SML1';

// Status permitidos para filtro
const ALLOWED_STATUSES = ['onboarding', 'execução', 'encerramento'];

// Interface para tipagem da resposta
interface ClickUpTask {
    id: string;
    name: string;
    status: {
        status: string;
    };
    custom_fields: Array<{
        id: string;
        value: string | number | boolean;
    }>;
    tags?: Array<string | { name: string }>;
}

interface ClickUpResponse {
    tasks: ClickUpTask[];
}

// Função para buscar todas as tarefas ativas
async function getActiveTasks(): Promise<ClickUpTask[]> {
    try {
        const headers = {
            'Authorization': API_TOKEN,
            'accept': 'application/json'
        };

        // Parâmetros para buscar apenas tarefas com os status específicos
        const params = {
            include_closed: 'false', // Não incluir tarefas fechadas
            page: 0, // Começar da primeira página
            limit: 100, // Máximo de tarefas por página
            statuses: ALLOWED_STATUSES // Filtrar por status específicos
        };

        const response = await axios.get<ClickUpResponse>(
            `${CLICKUP_API_BASE_URL}/list/${LIST_ID}/task`,
            {
                headers,
                params
            }
        );

        return response.data.tasks;
    } catch (error) {
        console.error('Erro ao buscar tarefas:', error instanceof Error ? error.message : 'Erro desconhecido');
        throw error;
    }
}

// Rota que será executada pelo cron job
export async function GET() {
    try {
        const tasks = await getActiveTasks();
        
        // Log para monitoramento
        console.log(`[${new Date().toISOString()}] Consulta de tarefas executada. Total de tarefas com status ${ALLOWED_STATUSES.join(', ')}: ${tasks.length}`);

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            total_tasks: tasks.length,
            status_filter: ALLOWED_STATUSES,
            tasks: tasks
        });

    } catch (error) {
        console.error('Erro ao processar requisição:', error instanceof Error ? error.message : 'Erro desconhecido');
        
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 401) {
                return NextResponse.json({ 
                    error: 'Token de autorização inválido ou expirado' 
                }, { status: 401 });
            }
            if (error.response?.status === 404) {
                return NextResponse.json({ 
                    error: 'Lista não encontrada no ClickUp' 
                }, { status: 404 });
            }
        }

        return NextResponse.json({ 
            error: 'Erro interno do servidor ao consultar o ClickUp' 
        }, { status: 500 });
    }
}

// Configuração do cron job
export const config = {
    runtime: 'edge',
    regions: ['gru1'], // Região de São Paulo para garantir UTC-3
    cron: '0 8 * * *' // Executa todos os dias às 8h da manhã (UTC-3)
}; 