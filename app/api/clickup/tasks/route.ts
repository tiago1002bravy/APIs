import axios from "axios";
import { NextResponse } from "next/server";

// Constantes para a API do ClickUp
const CLICKUP_API_BASE_URL = 'https://api.clickup.com/api/v2';
const LIST_ID = '901304813310';
const API_TOKEN = 'pk_18911835_PZA4YYUSR3JI37KV7CMEKNV62796SML1';

// Status permitidos para filtro
const ALLOWED_STATUSES = ['onboarding', 'execução', 'encerramento'];

// Interface para custom field (com name)
interface CustomField {
    id: string;
    name: string;
    value: any;
}

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
    custom_fields: CustomField[];
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

// Interface para o item da agenda no custom field
interface AgendaItemRaw {
    id: string;
    name: string;
    status: string;
    color: string;
    custom_type: number;
    team_id: string;
    deleted: boolean;
    url: string;
    access: boolean;
}

// Constantes para o custom field de status das reuniões
const STATUS_REUNIOES_FIELD_ID = 'dd2d9156-b05f-481f-a2e9-d436a8aa6902';
const STATUS_REUNIOES_OPTIONS = {
    sem_reunioes: '75ed8dcc-e080-4f2d-bd25-2609855aad12',
    com_reuniao_agendada: '978df944-cc82-4eef-8678-4ce7f96dad1d',
    sem_reuniao_agendada: 'dbae5178-feab-425a-a873-ba7bb3ee32d2'
} as const;

// Função para buscar tarefas por assignee
async function getTasksByAssignee(assigneeId: number): Promise<ClickUpTask[]> {
    try {
        const headers = {
            'Authorization': API_TOKEN,
            'accept': 'application/json'
        };

        const params = {
            include_closed: 'false',
            page: 0,
            limit: 100,
            statuses: ALLOWED_STATUSES,
            assignees: [assigneeId]
        };

        console.log('[ClickUp API] Iniciando requisição para buscar tarefas do assignee:', assigneeId);
        console.log('[ClickUp API] Parâmetros da requisição:', JSON.stringify(params, null, 2));

        const response = await axios.get<ClickUpResponse>(
            `${CLICKUP_API_BASE_URL}/list/${LIST_ID}/task`,
            {
                headers,
                params
            }
        );

        // Log detalhado da primeira tarefa para debug
        if (response.data.tasks.length > 0) {
            const primeiraTarefa = response.data.tasks[0];
            console.log('[ClickUp API] Exemplo de tarefa completa:', JSON.stringify(primeiraTarefa, null, 2));
            
            // Log específico dos custom fields
            const customFields = primeiraTarefa.custom_fields;
            console.log('[ClickUp API] Custom Fields da primeira tarefa:', JSON.stringify(customFields, null, 2));
            
            // Log específico do campo de agenda
            const agendaField = customFields.find(field => field.name === '04. Reuniões com clientes');
            if (agendaField) {
                console.log('[ClickUp API] Campo de agenda encontrado:', JSON.stringify(agendaField, null, 2));
                console.log('[ClickUp API] Valor do campo de agenda:', JSON.stringify(agendaField.value, null, 2));
            } else {
                console.log('[ClickUp API] Campo de agenda não encontrado nos custom fields');
            }
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
function extractAgendaClientes(customFields: CustomField[]): AgendaCliente[] {
    console.log('=== Extraindo dados do custom field de agenda ===');
    console.log('Total de custom fields recebidos:', customFields.length);
    
    // Procurar pelo custom field de agenda
    const agendaField = customFields.find(field => {
        const fieldName = field.name;
        const isAgendaField = fieldName === '04. Reuniões com clientes';
        
        if (isAgendaField) {
            console.log('🔍 Campo de reuniões encontrado:', {
                id: field.id,
                name: fieldName,
                valorBruto: field.value
            });
        }

        return isAgendaField;
    });

    if (!agendaField) {
        console.log('❌ Campo "04. Reuniões com clientes" não encontrado nos custom fields');
        return [];
    }

    // Verifica se o campo tem o valor esperado
    let agendaItems: any[] = [];
    
    if (Array.isArray(agendaField.value)) {
        // Se o valor já é um array
        agendaItems = agendaField.value;
    } else if (agendaField.value?.value && Array.isArray(agendaField.value.value)) {
        // Se o valor está dentro de um objeto com propriedade value
        agendaItems = agendaField.value.value;
    } else {
        console.log('❌ Valor do campo de agenda não está no formato esperado');
        console.log('Valor recebido:', JSON.stringify(agendaField.value, null, 2));
        return [];
    }

    console.log('📋 Total de reuniões encontradas:', agendaItems.length);

    // Processa cada item da agenda, mantendo todos independente do status
    const processedItems = agendaItems.map((item: AgendaItemRaw) => {
        // Validação apenas dos campos obrigatórios
        if (!item.id || !item.name || !item.status) {
            console.log('❌ Item da agenda com campos inválidos:', item);
            return null;
        }

        // Mantém todos os campos originais da reunião
        const processedItem = {
            id: item.id,
            name: item.name,
            status: item.status.toLowerCase(), // mantém o status original, apenas em lowercase
            color: item.color || '#000000',
            url: item.url || ''
        };

        console.log('✅ Reunião processada:', {
            id: processedItem.id,
            name: processedItem.name,
            status: processedItem.status
        });

        return processedItem;
    }).filter((item: AgendaCliente | null): item is AgendaCliente => item !== null);

    console.log('📊 Total de reuniões processadas:', processedItems.length);
    console.log('📋 Lista final de reuniões:', JSON.stringify(processedItems, null, 2));
    
    return processedItems;
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

// Função para atualizar o status das reuniões no custom field
async function atualizarStatusReunioes(taskId: string, status: ReuniaoStatus): Promise<void> {
    try {
        console.log('🔄 Atualizando status das reuniões para tarefa:', taskId);
        console.log('📊 Status a ser definido:', status);

        const statusUuid = STATUS_REUNIOES_OPTIONS[status];
        if (!statusUuid) {
            console.error('❌ UUID do status não encontrado para:', status);
            throw new Error(`Status inválido: ${status}`);
        }

        const url = `${CLICKUP_API_BASE_URL}/task/${taskId}/field/${STATUS_REUNIOES_FIELD_ID}`;
        const headers = {
            'Authorization': API_TOKEN,
            'accept': 'application/json',
            'content-type': 'application/json'
        };
        const data = {
            value: statusUuid
        };

        console.log('📤 Enviando requisição para atualizar status:', {
            url,
            status,
            uuid: statusUuid
        });

        const response = await axios.post(url, data, { headers });

        console.log('✅ Status atualizado com sucesso:', {
            taskId,
            status,
            responseStatus: response.status
        });
    } catch (error) {
        console.error('💥 Erro ao atualizar status das reuniões:', error instanceof Error ? {
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
        }
        throw error;
    }
}

// Função para processar a requisição
async function processRequest(request: Request) {
    console.log('🚀 === INÍCIO DA REQUISIÇÃO ===');
    console.log('📝 URL:', request.url);
    console.log('🔧 Método:', request.method);
    console.log('⏰ Timestamp:', new Date().toISOString());
    
    try {
        const { searchParams } = new URL(request.url);
        const assigneeId = searchParams.get('assignee');
        console.log('👤 Assignee ID recebido:', assigneeId);

        if (!assigneeId) {
            console.log('❌ Erro: ID do assignee não fornecido');
            return NextResponse.json({ 
                error: 'ID do assignee é obrigatório' 
            }, { status: 400 });
        }

        if (isNaN(parseInt(assigneeId))) {
            console.log('❌ Erro: ID do assignee inválido:', assigneeId);
            return NextResponse.json({ 
                error: 'ID do assignee deve ser um número válido' 
            }, { status: 400 });
        }

        console.log('✅ Iniciando busca de tarefas para assignee:', assigneeId);
        const tasks = await getTasksByAssignee(parseInt(assigneeId));
        console.log('📊 Total de tarefas encontradas:', tasks.length);
        
        if (!Array.isArray(tasks)) {
            console.error('Erro: Resposta inválida do ClickUp - tasks não é um array:', tasks);
            return NextResponse.json({ 
                error: 'Resposta inválida do ClickUp' 
            }, { status: 500 });
        }

        console.log('Tarefas brutas recebidas:', JSON.stringify(tasks[0], null, 2)); // Log da primeira tarefa para debug
        
        // Filtrar e transformar as tarefas
        const filteredTasks: FilteredTask[] = await Promise.all(tasks.map(async task => {
            console.log('Processando tarefa:', task.id, task.name);
            const agendaItems = extractAgendaClientes(task.custom_fields);
            console.log('Itens da agenda para tarefa', task.id, ':', agendaItems);
            
            const statusReunioes = determinarStatusReunioes(agendaItems);
            console.log('Status das reuniões para tarefa', task.id, ':', statusReunioes);
            
            // Atualiza o status no custom field
            try {
                await atualizarStatusReunioes(task.id, statusReunioes);
            } catch (error) {
                console.error(`Erro ao atualizar status para tarefa ${task.id}:`, error);
                // Continua o processamento mesmo se houver erro na atualização
            }
            
            return {
                id: task.id,
                name: task.name,
                agenda_clientes: agendaItems,
                status_reunioes: statusReunioes
            };
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
        console.error('💥 Erro ao processar requisição:', error instanceof Error ? {
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