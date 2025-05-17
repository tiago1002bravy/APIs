"""
Serviço para interação com o ClickUp.
"""
import os
import requests
from typing import Optional, Dict, Any
from dotenv import load_dotenv

from ..core.clickup_config import (
    CLICKUP_LIST_ID,
    get_custom_fields
)

# Carrega variáveis de ambiente
load_dotenv()

class ClickUpService:
    def __init__(self):
        """
        Inicializa o serviço do ClickUp com a chave de API.
        """
        self.api_key = os.getenv("CLICKUP_API_KEY")
        if not self.api_key:
            raise ValueError("CLICKUP_API_KEY não encontrada nas variáveis de ambiente")
        
        self.base_url = "https://api.clickup.com/api/v2"
        self.list_id = CLICKUP_LIST_ID
        self.headers = {
            "Authorization": self.api_key,
            "Content-Type": "application/json"
        }

    async def create_task(
        self,
        nome: str,
        email: str,
        whatsapp: str,
        valor: int,
        tag: str
    ) -> Dict[str, Any]:
        """
        Cria uma nova tarefa no ClickUp usando a API v2.
        
        Args:
            nome: Nome do lead
            email: Email do cliente
            whatsapp: WhatsApp do cliente
            valor: Valor da oportunidade
            tag: Tag formatada (acao-produto)
            
        Returns:
            Dados da tarefa criada
            
        Raises:
            Exception: Se houver erro ao criar a tarefa
        """
        try:
            # Prepara os dados da tarefa
            custom_fields = get_custom_fields(email, whatsapp, valor)
            
            # Cria a tarefa usando a API v2
            url = f"{self.base_url}/list/{self.list_id}/task"
            payload = {
                "name": nome,  # Nome do lead diretamente
                "custom_fields": custom_fields,
                "status": "to do",  # Status inicial da tarefa
                "tags": [tag]  # Adiciona a tag formatada
            }
            
            response = requests.post(url, json=payload, headers=self.headers)
            response.raise_for_status()  # Levanta exceção para erros HTTP
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
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
            # Busca tarefas na lista usando a API v2
            url = f"{self.base_url}/list/{self.list_id}/task"
            params = {
                "custom_fields": f'[{{"field_id":"{CLICKUP_CUSTOM_FIELDS["email"]}","operator":"=","value":"{email}"}}]'
            }
            
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            
            tasks = response.json().get("tasks", [])
            return tasks[0] if tasks else None
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"Erro ao verificar tarefa existente: {str(e)}") 