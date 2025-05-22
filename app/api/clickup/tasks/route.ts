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

// Interface para o status das reuniões
type ReuniaoStatus = 'sem_reunioes' | 'sem_reuniao_agendada' | 'com_reuniao_agendada';

// Interface para a tarefa filtrada
interface FilteredTask {
    id: string;
    name: string;
    agenda_clientes: AgendaCliente[];
    status_reunioes: ReuniaoStatus;
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

        console.log('[ClickUp API] Iniciando requisição com params:', JSON.stringify(params, null, 2));
        console.log('[ClickUp API] URL:', `${CLICKUP_API_BASE_URL}/list/${LIST_ID}/task`);
        console.log('[ClickUp API] Headers:', JSON.stringify(headers, null, 2));

        const response = await axios.get<ClickUpResponse>(
            `${CLICKUP_API_BASE_URL}/list/${LIST_ID}/task`,
            {
                headers,
                params
            }
        );

        console.log('[ClickUp API] Status da resposta:', response.status);
        console.log('[ClickUp API] Headers da resposta:', JSON.stringify(response.headers, null, 2));

        if (!response.data || !Array.isArray(response.data.tasks)) {
            console.error('[ClickUp API] Resposta inválida:', JSON.stringify(response.data, null, 2));
            throw new Error('Resposta inválida da API do ClickUp');
        }

        // Log detalhado da primeira tarefa para debug
        if (response.data.tasks.length > 0) {
            console.log('[ClickUp API] Exemplo de tarefa:', JSON.stringify(response.data.tasks[0], null, 2));
            console.log('[ClickUp API] Custom fields da primeira tarefa:', JSON.stringify(response.data.tasks[0].custom_fields, null, 2));
        } else {
            console.log('[ClickUp API] Nenhuma tarefa encontrada para o assignee:', assigneeId);
        }

        return response.data.tasks;
    } catch (error) {
        console.error('[ClickUp API] Erro detalhado:', error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
        } : 'Erro desconhecido');

        if (axios.isAxiosError(error)) {
            console.error('[ClickUp API] Detalhes do erro Axios:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                headers: error.response?.headers,
                config: {
                    url: error.config?.url,
                    method: error.config?.method,
                    headers: error.config?.headers,
                    params: error.config?.params
                }
            });
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

// Função para determinar o status das reuniões
function determinarStatusReunioes(agendaItems: AgendaCliente[]): ReuniaoStatus {
    if (!agendaItems || agendaItems.length === 0) {
        return 'sem_reunioes';
    }

    const temReuniaoAgendada = agendaItems.some(item => 
        item.status.toLowerCase() === 'reunião agendada'
    );

    return temReuniaoAgendada ? 'com_reuniao_agendada' : 'sem_reuniao_agendada';
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
            console.log('Erro: ID do assignee não fornecido');
            return NextResponse.json({ 
                error: 'ID do assignee é obrigatório' 
            }, { status: 400 });
        }

        if (isNaN(parseInt(assigneeId))) {
            console.log('Erro: ID do assignee inválido:', assigneeId);
            return NextResponse.json({ 
                error: 'ID do assignee deve ser um número válido' 
            }, { status: 400 });
        }

        const tasks = await getTasksByAssignee(parseInt(assigneeId));
        
        if (!Array.isArray(tasks)) {
            console.error('Erro: Resposta inválida do ClickUp - tasks não é um array:', tasks);
            return NextResponse.json({ 
                error: 'Resposta inválida do ClickUp' 
            }, { status: 500 });
        }

        console.log('Tarefas brutas recebidas:', JSON.stringify(tasks[0], null, 2)); // Log da primeira tarefa para debug
        
        // Filtrar e transformar as tarefas
        const filteredTasks: FilteredTask[] = tasks.map(task => {
            console.log('Processando tarefa:', task.id, task.name);
            const agendaItems = extractAgendaClientes(task.custom_fields);
            console.log('Itens da agenda para tarefa', task.id, ':', agendaItems);
            
            const statusReunioes = determinarStatusReunioes(agendaItems);
            console.log('Status das reuniões para tarefa', task.id, ':', statusReunioes);
            
            return {
                id: task.id,
                name: task.name,
                agenda_clientes: agendaItems,
                status_reunioes: statusReunioes
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
        console.error('Erro ao processar requisição:', error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
        } : 'Erro desconhecido');
        
        if (axios.isAxiosError(error)) {
            console.error('Detalhes do erro Axios:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data
            });

            if (error.response?.status === 401) {
                return NextResponse.json({ 
                    error: 'Token de autorização inválido ou expirado',
                    details: error.response.data
                }, { status: 401 });
            }
            if (error.response?.status === 404) {
                return NextResponse.json({ 
                    error: 'Lista não encontrada no ClickUp',
                    details: error.response.data
                }, { status: 404 });
            }
            if (error.response?.status === 429) {
                return NextResponse.json({ 
                    error: 'Limite de requisições excedido no ClickUp',
                    details: error.response.data
                }, { status: 429 });
            }
        }

        return NextResponse.json({ 
            error: 'Erro interno do servidor ao consultar o ClickUp',
            details: error instanceof Error ? error.message : 'Erro desconhecido'
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