"""
Serviço para interação com o ClickUp.
"""
import os
from typing import Optional, Dict, Any
from clickup import ClickUp
from dotenv import load_dotenv

from ..core.clickup_config import (
    CLICKUP_LIST_ID,
    get_task_name,
    get_custom_fields
)

# Carrega variáveis de ambiente
load_dotenv()

class ClickUpService:
    def __init__(self):
        """
        Inicializa o serviço do ClickUp com a chave de API.
        """
        api_key = os.getenv("CLICKUP_API_KEY")
        if not api_key:
            raise ValueError("CLICKUP_API_KEY não encontrada nas variáveis de ambiente")
        
        self.client = ClickUp(api_key)
        self.list_id = CLICKUP_LIST_ID

    async def create_task(
        self,
        nome: str,
        email: str,
        telefone: str,
        valor: int
    ) -> Dict[str, Any]:
        """
        Cria uma nova tarefa no ClickUp.
        
        Args:
            nome: Nome do cliente
            email: Email do cliente
            telefone: Telefone do cliente
            valor: Valor da oportunidade
            
        Returns:
            Dados da tarefa criada
            
        Raises:
            Exception: Se houver erro ao criar a tarefa
        """
        try:
            # Prepara os dados da tarefa
            task_name = get_task_name(nome)
            custom_fields = get_custom_fields(email, telefone, valor)
            
            # Cria a tarefa
            task_data = {
                "name": task_name,
                "custom_fields": custom_fields
            }
            
            response = self.client.create_task(self.list_id, task_data)
            return response
            
        except Exception as e:
            raise Exception(f"Erro ao criar tarefa no ClickUp: {str(e)}")

    async def check_existing_task(self, email: str) -> Optional[Dict[str, Any]]:
        """
        Verifica se já existe uma tarefa com o email fornecido.
        
        Args:
            email: Email do cliente
            
        Returns:
            Dados da tarefa encontrada ou None
        """
        try:
            # Busca tarefas na lista
            tasks = self.client.get_tasks(self.list_id)
            
            # Procura por uma tarefa com o email fornecido
            for task in tasks:
                custom_fields = task.get("custom_fields", {})
                task_email = custom_fields.get(CLICKUP_CUSTOM_FIELDS["email"], {}).get("value")
                if task_email == email:
                    return task
                    
            return None
            
        except Exception as e:
            raise Exception(f"Erro ao verificar tarefa existente: {str(e)}") 