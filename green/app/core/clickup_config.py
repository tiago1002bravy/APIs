"""
Configurações do ClickUp.
"""
from typing import Dict

# IDs dos campos personalizados no ClickUp
CLICKUP_CUSTOM_FIELDS = {
    "email": "c34aaeb2-0233-42d3-8242-cd9a603b5b0b",
    "telefone": "9c5b9ad9-b085-4fdd-a0a9-0110d341de7c",
    "valor": "ae3dc146-154c-4287-b2aa-17e4f643cbf8"
}

# ID da lista onde as tarefas serão criadas
CLICKUP_LIST_ID = "901305222206"

# Configuração do nome da tarefa
TASK_NAME_TEMPLATE = "Nova Oportunidade - {nome}"

def get_task_name(nome: str) -> str:
    """
    Gera o nome da tarefa usando o template configurado.
    
    Args:
        nome: Nome do cliente
        
    Returns:
        Nome formatado da tarefa
    """
    return TASK_NAME_TEMPLATE.format(nome=nome)

def get_custom_fields(email: str, telefone: str, valor: int) -> Dict[str, Dict[str, str]]:
    """
    Gera o dicionário de campos personalizados para a tarefa.
    
    Args:
        email: Email do cliente
        telefone: Telefone do cliente
        valor: Valor da oportunidade
        
    Returns:
        Dicionário com os campos personalizados formatados para o ClickUp
    """
    return {
        CLICKUP_CUSTOM_FIELDS["email"]: {"value": email},
        CLICKUP_CUSTOM_FIELDS["telefone"]: {"value": telefone},
        CLICKUP_CUSTOM_FIELDS["valor"]: {"value": str(valor)}
    } 