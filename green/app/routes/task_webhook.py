"""
Rotas para processamento de webhooks e gerenciamento de tasks.
"""
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from typing import Any, Dict, Optional
import httpx
from urllib.parse import quote

from ..core.config import STATUS_TO_ACAO, PRODUCT_NAME_TO_PRODUTO
from ..utils.extractors import extract_field

router = APIRouter(prefix="/api")

# Constantes para a API de tasks
TASK_API_BASE_URL = "https://api.clickup.com/api/v2"
LIST_ID = "901305222206"
EMAIL_FIELD_ID = "c34aaeb2-0233-42d3-8242-cd9a603b5b0b"
PHONE_FIELD_ID = "9c5b9ad9-b085-4fdd-a0a9-0110d341de7c"
VALUE_FIELD_ID = "ae3dc146-154c-4287-b2aa-17e4f643cbf8"

async def get_task_by_email(email: str, api_token: str) -> Optional[Dict[str, Any]]:
    """Consulta uma task pelo email usando o campo personalizado."""
    async with httpx.AsyncClient() as client:
        query = {
            "custom_fields": [
                {
                    "field_id": EMAIL_FIELD_ID,
                    "operator": "=",
                    "value": email
                }
            ]
        }
        headers = {"Authorization": api_token}
        url = f"{TASK_API_BASE_URL}/list/{LIST_ID}/task"
        
        try:
            response = await client.get(url, params=query, headers=headers)
            response.raise_for_status()
            data = response.json()
            return data.get("tasks", [])[0] if data.get("tasks") else None
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erro ao consultar task: {str(e)}")

async def create_task(
    name: str,
    email: str,
    phone: Optional[str],
    value: Optional[int],
    tag: str,
    api_token: str
) -> Dict[str, Any]:
    """Cria uma nova task com os dados fornecidos."""
    async with httpx.AsyncClient() as client:
        payload = {
            "name": f"[Lead] {name}",
            "custom_fields": [
                {"id": EMAIL_FIELD_ID, "value": email}
            ],
            "tags": [tag]
        }
        
        if phone:
            payload["custom_fields"].append({"id": PHONE_FIELD_ID, "value": phone})
        if value:
            payload["custom_fields"].append({"id": VALUE_FIELD_ID, "value": float(value)})
            
        headers = {"Authorization": api_token}
        url = f"{TASK_API_BASE_URL}/list/{LIST_ID}/task"
        
        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erro ao criar task: {str(e)}")

async def add_tag_to_task(task_id: str, tag: str, api_token: str) -> Dict[str, Any]:
    """Adiciona uma tag a uma task existente."""
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": api_token}
        url = f"{TASK_API_BASE_URL}/task/{task_id}/tag/{quote(tag)}"
        
        try:
            response = await client.post(url, headers=headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erro ao adicionar tag: {str(e)}")

@router.post("/task-webhook", tags=["webhook"])
async def process_task_webhook(request: Request):
    try:
        raw_payload = await request.json()
        
        # Se for uma lista, pega o primeiro item
        if isinstance(raw_payload, list):
            if not raw_payload:
                raise HTTPException(status_code=400, detail="Lista de payload vazia")
            # Se o primeiro item tiver um campo 'body', usa ele
            if isinstance(raw_payload[0], dict) and 'body' in raw_payload[0]:
                payload = raw_payload[0]['body']
            else:
                payload = raw_payload[0]
        else:
            payload = raw_payload

        if not isinstance(payload, dict):
            raise HTTPException(status_code=400, detail="Invalid JSON payload: root must be an object or array of objects.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid or malformed JSON payload: {str(e)}")

    # Extrair token da API dos headers
    api_token = request.headers.get("Authorization")
    if not api_token:
        # Tenta pegar o token do header x-webhook-token se Authorization não estiver presente
        api_token = request.headers.get("x-webhook-token")
        if not api_token:
            raise HTTPException(status_code=401, detail="API token não fornecido")

    payload_type = payload.get("type")
    payload_event = payload.get("event")
    is_checkout_abandoned_event = (payload_type == "lead" and payload_event == "checkoutAbandoned")

    # Definir caminhos de extração com base no tipo de evento
    if is_checkout_abandoned_event:
        nome_paths = [["lead", "name"]]
        email_paths = [["lead", "email"]]
        telefone_paths = [["lead", "cellphone"]]
    else:  # Lógica para eventos de venda (ou default)
        nome_paths = [["client", "name"]]
        email_paths = [["client", "email"]]
        telefone_paths = [["client", "cellphone"]]
    
    produto_original_paths = [["product", "name"]]
    status_sale_paths = [["sale", "status"]]
    status_current_paths = [["currentStatus"]]
    status_old_paths = [["oldStatus"]]
    valor_paths = [["sale", "amount"]]

    # Extrair dados do payload
    nome = extract_field(payload, nome_paths)
    email = extract_field(payload, email_paths)
    telefone = extract_field(payload, telefone_paths)
    produto_original = extract_field(payload, produto_original_paths)
    valor = extract_field(payload, valor_paths)

    # Validar dados obrigatórios
    if not email or not isinstance(email, str):
        raise HTTPException(status_code=400, detail="Email é obrigatório e deve ser uma string")
    if not nome or not isinstance(nome, str):
        raise HTTPException(status_code=400, detail="Nome é obrigatório e deve ser uma string")

    # Processar telefone
    telefone_final = None
    if isinstance(telefone, str) and telefone.strip():
        telefone_final = telefone.strip()
    elif isinstance(telefone, (int, float)):
        telefone_final = str(telefone)

    # Processar valor
    valor_final = None
    if isinstance(valor, (int, float)):
        valor_final = int(valor)
    elif isinstance(valor, str):
        try:
            cleaned_valor_str = valor.replace(",", ".")
            valor_final = int(float(cleaned_valor_str))
        except ValueError:
            pass

    # Determinar tag
    produto_final = PRODUCT_NAME_TO_PRODUTO.get(produto_original) if isinstance(produto_original, str) else None
    acao_final = "abandonada" if is_checkout_abandoned_event else None
    
    if not acao_final and not is_checkout_abandoned_event:
        status_original = extract_field(payload, status_sale_paths)
        if status_original is None:
            status_original = extract_field(payload, status_current_paths)
        if status_original is None:
            status_original = extract_field(payload, status_old_paths)
        
        if isinstance(status_original, str):
            acao_final = STATUS_TO_ACAO.get(status_original.lower())

    tag_final = f"{acao_final}-{produto_final}" if acao_final and produto_final else None

    if not tag_final:
        raise HTTPException(status_code=400, detail="Não foi possível determinar a tag da task")

    # Consultar task existente
    existing_task = await get_task_by_email(email, api_token)

    if existing_task:
        # Adicionar tag à task existente
        task_id = existing_task["id"]
        await add_tag_to_task(task_id, tag_final, api_token)
        return JSONResponse(content={"message": "Tag adicionada à task existente", "task_id": task_id})
    else:
        # Criar nova task
        new_task = await create_task(
            name=nome,
            email=email,
            phone=telefone_final,
            value=valor_final,
            tag=tag_final,
            api_token=api_token
        )
        return JSONResponse(content={"message": "Nova task criada", "task": new_task}) 