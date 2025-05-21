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
            assignees: [assigneeId],
            custom_fields: '["0218d951-f901-42f6-949c-a40e17eb77e1"]' // Adicionando o ID do custom field específico
        };

        console.log('Fazendo requisição para ClickUp com params:', params);

        const response = await axios.get<ClickUpResponse>(
            `${CLICKUP_API_BASE_URL}/list/${LIST_ID}/task`,
            {
                headers,
                params
            }
        );

        // Log detalhado da primeira tarefa para debug
        if (response.data.tasks.length > 0) {
            console.log('Exemplo de tarefa do ClickUp:', JSON.stringify(response.data.tasks[0], null, 2));
            console.log('Custom fields da primeira tarefa:', JSON.stringify(response.data.tasks[0].custom_fields, null, 2));
        }

        return response.data.tasks;
    } catch (error) {
        console.error('Erro detalhado ao buscar tarefas:', error instanceof Error ? error.message : 'Erro desconhecido');
        if (axios.isAxiosError(error)) {
            console.error('Resposta do ClickUp:', error.response?.data);
        }
        throw error;
    }
}

// Função para extrair os dados do custom field de agenda
function extractAgendaClientes(customFields: Array<{id: string, value: any}>): AgendaCliente[] {
    console.log('=== Extraindo dados do custom field de agenda ===');
    console.log('Custom Fields recebidos:', JSON.stringify(customFields, null, 2));
    
    // Procurar pelo custom field de agenda
    const agendaField = customFields.find(field => {
        const fieldName = field.value?.type_config?.field_inverted_name;
        console.log('Verificando field:', {
            id: field.id,
            name: fieldName,
            value: field.value
        });
        return fieldName === '04. Agenda cliente ok';
    });

    if (!agendaField) {
        console.log('Campo de agenda não encontrado nos custom fields');
        return [];
    }

    console.log('Agenda field encontrado:', JSON.stringify(agendaField, null, 2));

    if (!agendaField.value?.value) {
        console.log('Valor do campo de agenda está vazio');
        return [];
    }

    // Verificar se o valor é um array
    if (!Array.isArray(agendaField.value.value)) {
        console.log('Valor não é um array:', agendaField.value.value);
        return [];
    }

    const agendaItems = agendaField.value.value.map((item: any) => {
        console.log('Processando item da agenda:', item);
        return {
            id: item.id,
            name: item.name,
            status: item.status,
            color: item.color,
            url: item.url
        };
    });

    console.log('Itens da agenda processados:', agendaItems);
    return agendaItems;
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
        console.log('Tarefas brutas recebidas:', JSON.stringify(tasks[0], null, 2)); // Log da primeira tarefa para debug
        
        // Filtrar e transformar as tarefas
        const filteredTasks: FilteredTask[] = tasks.map(task => {
            console.log('Processando tarefa:', task.id, task.name);
            const agendaItems = extractAgendaClientes(task.custom_fields);
            console.log('Itens da agenda para tarefa', task.id, ':', agendaItems);
            
            return {
                id: task.id,
                name: task.name,
                agenda_clientes: agendaItems
            };
        });

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