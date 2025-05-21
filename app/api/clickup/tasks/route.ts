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
    assignees: Array<{
        id: number;
        username: string;
    }>;
    custom_fields: Array<{
        id: string;
        value: string | number | boolean;
    }>;
    tags?: Array<string | { name: string }>;
}

interface ClickUpResponse {
    tasks: ClickUpTask[];
}

// Interface para o custom field de agenda
interface AgendaCliente {
    id: string;
    name: string;
    status: string;
    color: string;
    url: string;
}

// Interface para a tarefa filtrada
interface FilteredTask {
    id: string;
    name: string;
    agenda_clientes: AgendaCliente[];
}

// Função para buscar tarefas por assignee
async function getTasksByAssignee(assigneeId: number): Promise<ClickUpTask[]> {
    try {
        const headers = {
            'Authorization': API_TOKEN,
            'accept': 'application/json'
        };

        // Parâmetros para buscar tarefas com os status específicos e assignee
        const params = {
            include_closed: 'false',
            page: 0,
            limit: 100,
            statuses: ALLOWED_STATUSES,
            assignees: [assigneeId]
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

// Função para extrair os dados do custom field de agenda
function extractAgendaClientes(customFields: Array<{id: string, value: any}>): AgendaCliente[] {
    const agendaField = customFields.find(field => 
        field.id === '0218d951-f901-42f6-949c-a40e17eb77e1' || 
        field.value?.type_config?.field_inverted_name === '04. Agenda cliente ok'
    );

    if (!agendaField || !agendaField.value?.value) {
        return [];
    }

    return agendaField.value.value.map((item: any) => ({
        id: item.id,
        name: item.name,
        status: item.status,
        color: item.color,
        url: item.url
    }));
}

// Função para processar a requisição
async function processRequest(request: Request) {
    console.log('=== INÍCIO DA REQUISIÇÃO ===');
    console.log('URL:', request.url);
    console.log('Método:', request.method);
    
    try {
        const { searchParams } = new URL(request.url);
        const assigneeId = searchParams.get('assignee');
        console.log('Assignee ID recebido:', assigneeId);

        if (!assigneeId) {
            return NextResponse.json({ 
                error: 'ID do assignee é obrigatório' 
            }, { status: 400 });
        }

        const tasks = await getTasksByAssignee(parseInt(assigneeId));
        
        // Filtrar e transformar as tarefas
        const filteredTasks: FilteredTask[] = tasks.map(task => ({
            id: task.id,
            name: task.name,
            agenda_clientes: extractAgendaClientes(task.custom_fields)
        }));

        console.log(`[${new Date().toISOString()}] Consulta de tarefas executada para assignee ${assigneeId}. Total de tarefas: ${tasks.length}`);

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            assignee_id: assigneeId,
            total_tasks: tasks.length,
            tasks: filteredTasks
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

// Handler para GET
export async function GET(request: Request) {
    return processRequest(request);
}

// Handler para POST
export async function POST(request: Request) {
    return processRequest(request);
}

export async function PUT(request: Request) {
    console.log('=== TENTATIVA DE PUT NÃO PERMITIDA ===');
    return NextResponse.json({ 
        error: 'Método PUT não é permitido. Use GET.' 
    }, { status: 405 });
}

export async function DELETE(request: Request) {
    console.log('=== TENTATIVA DE DELETE NÃO PERMITIDA ===');
    return NextResponse.json({ 
        error: 'Método DELETE não é permitido. Use GET.' 
    }, { status: 405 });
} 