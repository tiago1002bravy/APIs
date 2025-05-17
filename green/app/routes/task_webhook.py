"""
Rotas para processamento de webhooks e gerenciamento de tasks.

Tipos de Webhooks Suportados:
1. Webhook de Vendas (type: "sale")
   - Evento: "saleUpdated"
   - Status possíveis:
     * oldStatus: created, paid, waiting_payment
     * currentStatus: paid, refused, refunded, chargedback, waiting_payment
   - Campos específicos:
     * product.affiliation_proposal: permite propostas de afiliados
     * product.allow_proposal: permite propostas
     * product.is_active: status do produto
     * product.method: métodos de pagamento permitidos
     * product.type: tipo do produto (TRANSACTION, SUBSCRIPTION)
     * sale.coupon: informações do cupom aplicado
     * saleMetas: metadados da venda

2. Webhook de Contratos (type: "contract")
   - Evento: "contractUpdated"
   - Status possíveis:
     * oldStatus: created, paid, trialing
     * currentStatus: paid, trialing, pending_payment, unpaid, canceled
   - Campos específicos:
     * contract.start_date: data de início do contrato
     * contract.current_period_end: data do vencimento da mensalidade
     * productMetas: metas do produto
     * proposalMetas: metas da proposta
     * currentSale.coupon: cupom aplicado
     * saleMetas: metadados da venda

3. Webhook de Abandono de Carrinho (type: "lead")
   - Evento: "checkoutAbandoned"
   - Campos específicos:
     * lead.step: passo onde o cliente parou (1: dados pessoais, 2: endereço, 3: pagamento)
"""
from fastapi import APIRouter, Request, HTTPException, Header
from fastapi.responses import JSONResponse
from typing import Any, Dict, Optional, List, Literal, Union
import httpx
from urllib.parse import quote
from datetime import datetime
from enum import Enum
import json

from ..core.config import STATUS_TO_ACAO, PRODUCT_NAME_TO_PRODUTO
from ..utils.extractors import extract_field

router = APIRouter(prefix="/api")

# Constantes para a API de tasks
TASK_API_BASE_URL = "https://api.clickup.com/api/v2"
LIST_ID = "901305222206"
EMAIL_FIELD_ID = "c34aaeb2-0233-42d3-8242-cd9a603b5b0b"
PHONE_FIELD_ID = "9c5b9ad9-b085-4fdd-a0a9-0110d341de7c"
VALUE_FIELD_ID = "ae3dc146-154c-4287-b2aa-17e4f643cbf8"
DOCUMENT_FIELD_ID = "document"  # Adicionar o ID correto do campo de documento
PAYMENT_METHOD_FIELD_ID = "payment_method"  # Adicionar o ID correto do campo de método de pagamento
PAYMENT_BRAND_FIELD_ID = "payment_brand"  # Adicionar o ID correto do campo de bandeira do cartão
COUPON_FIELD_ID = "coupon"  # Adicionar o ID correto do campo de cupom
CONTRACT_START_DATE_FIELD_ID = "contract_start_date"  # Adicionar o ID correto
CONTRACT_END_DATE_FIELD_ID = "contract_end_date"  # Adicionar o ID correto
CHECKOUT_STEP_FIELD_ID = "checkout_step"  # Adicionar o ID correto

class WebhookType(str, Enum):
    """Tipos de webhook suportados."""
    SALE = "sale"
    CONTRACT = "contract"
    LEAD = "lead"

class WebhookEvent(str, Enum):
    """Eventos suportados."""
    SALE_UPDATED = "saleUpdated"
    CONTRACT_UPDATED = "contractUpdated"
    CHECKOUT_ABANDONED = "checkoutAbandoned"

class SaleStatus(str, Enum):
    """Status possíveis para uma venda."""
    CREATED = "created"
    PAID = "paid"
    WAITING_PAYMENT = "waiting_payment"
    REFUSED = "refused"
    REFUNDED = "refunded"
    CHARGEDBACK = "chargedback"

class ContractStatus(str, Enum):
    """Status possíveis para um contrato."""
    CREATED = "created"
    PAID = "paid"
    TRIALING = "trialing"
    PENDING_PAYMENT = "pending_payment"
    UNPAID = "unpaid"
    CANCELED = "canceled"

class ProductType(str, Enum):
    """Tipos possíveis de produto."""
    TRANSACTION = "TRANSACTION"
    SUBSCRIPTION = "SUBSCRIPTION"

class PaymentMethod(str, Enum):
    """Métodos de pagamento possíveis."""
    CREDIT_CARD = "CREDIT_CARD"
    TWO_CREDIT_CARDS = "TWO_CREDIT_CARDS"
    BOLETO = "BOLETO"
    PIX = "PIX"
    PAYPAL = "PAYPAL"

class CheckoutStep(int, Enum):
    """Passos possíveis no checkout."""
    PERSONAL_DATA = 1
    ADDRESS = 2
    PAYMENT = 3

def validate_sale_status(status: str) -> bool:
    """Valida se o status da venda é válido."""
    try:
        SaleStatus(status)
        return True
    except ValueError:
        return False

def validate_contract_status(status: str) -> bool:
    """Valida se o status do contrato é válido."""
    try:
        ContractStatus(status)
        return True
    except ValueError:
        return False

def validate_product_type(product_type: str) -> bool:
    """Valida se o tipo do produto é válido."""
    try:
        ProductType(product_type)
        return True
    except ValueError:
        return False

def validate_payment_method(method: str) -> bool:
    """Valida se o método de pagamento é válido."""
    if not method:
        return False
    methods = method.split(",")
    return all(m.strip() in PaymentMethod.__members__ for m in methods)

def validate_checkout_step(step: Union[int, str]) -> bool:
    """Valida se o passo do checkout é válido."""
    try:
        step_int = int(step)
        return step_int in [s.value for s in CheckoutStep]
    except (ValueError, TypeError):
        return False

def extract_coupon_info(coupon: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Extrai informações relevantes do cupom."""
    if not coupon:
        return None
    
    return {
        "name": coupon.get("name"),
        "type": coupon.get("type"),
        "amount": coupon.get("amount"),
        "is_active": coupon.get("is_active", False)
    }

def extract_payment_metadata(sale_metas: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Extrai metadados relevantes da venda."""
    metadata = {
        "brand": None,
        "reuse_credit_card": False,
        "assoc_ticket": False
    }
    
    for meta in sale_metas:
        if meta["meta_key"] == "brand":
            metadata["brand"] = meta["meta_value"]
        elif meta["meta_key"] == "reuse_credit_card":
            metadata["reuse_credit_card"] = meta["meta_value"] == "1"
        elif meta["meta_key"] == "assoc_ticket":
            metadata["assoc_ticket"] = meta["meta_value"] == "1"
    
    return metadata

def extract_product_metas(product_metas: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Extrai metadados do produto."""
    return {meta["key"]: meta["value"] for meta in product_metas} if product_metas else {}

def extract_proposal_metas(proposal_metas: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Extrai metadados da proposta."""
    return {meta["key"]: meta["value"] for meta in proposal_metas} if proposal_metas else {}

async def get_task_by_email(email: str, api_token: str) -> Optional[Dict[str, Any]]:
    """Consulta uma task pelo email usando o campo personalizado.
    
    Exemplo de requisição:
    GET https://api.clickup.com/api/v2/list/901305222206/task
    ?include_closed=false
    &custom_fields=[{"field_id":"c34aaeb2-0233-42d3-8242-cd9a603b5b0b","operator":"=","value":"email_lead"}]
    
    Retorna:
    - A primeira task encontrada se existir
    - None se não encontrar nenhuma task (tasks = [])
    """
    async with httpx.AsyncClient() as client:
        params = {
            "include_closed": "false",
            "custom_fields": json.dumps([{
                "field_id": EMAIL_FIELD_ID,
                "operator": "=",
                "value": email
            }])
        }
        
        headers = {
            "Authorization": api_token,
            "accept": "application/json"
        }
        
        url = f"{TASK_API_BASE_URL}/list/{LIST_ID}/task"
        
        try:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            # Verifica se a lista de tasks está vazia
            if not data.get("tasks"):
                return None
                
            # Retorna a primeira task encontrada
            return data["tasks"][0]
            
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Erro ao consultar task: {str(e)}"
            )

async def create_task(
    name: str,
    email: str,
    phone: Optional[str],
    value: Optional[int],
    tag: str,
    api_token: str,
    document: Optional[str] = None,
    payment_method: Optional[str] = None,
    payment_brand: Optional[str] = None,
    seller_balance: Optional[float] = None,
    coupon: Optional[Dict[str, Any]] = None,
    product_type: Optional[str] = None,
    product_name: Optional[str] = None,
    product_metas: Optional[Dict[str, Any]] = None,
    proposal_metas: Optional[Dict[str, Any]] = None
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
        if document:
            payload["custom_fields"].append({"id": DOCUMENT_FIELD_ID, "value": document})
        if payment_method:
            payload["custom_fields"].append({"id": PAYMENT_METHOD_FIELD_ID, "value": payment_method})
        if payment_brand:
            payload["custom_fields"].append({"id": PAYMENT_BRAND_FIELD_ID, "value": payment_brand})
        if coupon:
            coupon_info = extract_coupon_info(coupon)
            if coupon_info:
                payload["custom_fields"].append({
                    "id": COUPON_FIELD_ID,
                    "value": f"{coupon_info['name']} ({coupon_info['type']}: {coupon_info['amount']})"
                })
            
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
            webhook_data = raw_payload[0]
            payload = webhook_data.get('body', {})
            
            # Extrair token do header do webhook se disponível
            webhook_token = webhook_data.get('headers', {}).get('x-webhook-token')
        else:
            payload = raw_payload
            webhook_token = None

        if not isinstance(payload, dict):
            raise HTTPException(status_code=400, detail="Invalid JSON payload: root must be an object or array of objects.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid or malformed JSON payload: {str(e)}")

    # Extrair token da API dos headers
    api_token = request.headers.get("Authorization")
    if not api_token and webhook_token:
        api_token = webhook_token
    if not api_token:
        raise HTTPException(status_code=401, detail="API token não fornecido")

    # Validar tipo de webhook
    payload_type = payload.get("type")
    if payload_type not in WebhookType.__members__:
        raise HTTPException(status_code=400, detail=f"Tipo de webhook não suportado: {payload_type}")

    # Validar evento
    payload_event = payload.get("event")
    if payload_event not in WebhookEvent.__members__:
        raise HTTPException(status_code=400, detail=f"Evento não suportado: {payload_event}")

    # Validar combinação tipo/evento
    if payload_type == WebhookType.SALE and payload_event != WebhookEvent.SALE_UPDATED:
        raise HTTPException(status_code=400, detail="Evento inválido para webhook de venda")
    elif payload_type == WebhookType.CONTRACT and payload_event != WebhookEvent.CONTRACT_UPDATED:
        raise HTTPException(status_code=400, detail="Evento inválido para webhook de contrato")
    elif payload_type == WebhookType.LEAD and payload_event != WebhookEvent.CHECKOUT_ABANDONED:
        raise HTTPException(status_code=400, detail="Evento inválido para webhook de lead")

    # Definir caminhos de extração comuns
    nome_paths = [["client", "name"]]
    email_paths = [["client", "email"]]
    telefone_paths = [["client", "cellphone"]]
    document_paths = [["client", "cpf_cnpj"]]
    produto_original_paths = [["product", "name"]]
    product_metas_paths = [["productMetas"]]
    proposal_metas_paths = [["proposalMetas"]]

    # Extrair dados comuns
    nome = extract_field(payload, nome_paths)
    email = extract_field(payload, email_paths)
    telefone = extract_field(payload, telefone_paths)
    document = extract_field(payload, document_paths)
    produto_original = extract_field(payload, produto_original_paths)
    product_metas = extract_field(payload, product_metas_paths)
    proposal_metas = extract_field(payload, proposal_metas_paths)

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

    # Processar metadados
    product_metas_final = extract_product_metas(product_metas) if product_metas else {}
    proposal_metas_final = extract_proposal_metas(proposal_metas) if proposal_metas else {}

    # Processar dados específicos por tipo de webhook
    if payload_type == WebhookType.SALE:
        # Validar status da venda
        current_status = payload.get("currentStatus")
        if not validate_sale_status(current_status):
            raise HTTPException(status_code=400, detail=f"Status de venda inválido: {current_status}")

        # Validar tipo do produto
        product_type = extract_field(payload, [["product", "type"]])
        if product_type and not validate_product_type(product_type):
            raise HTTPException(status_code=400, detail=f"Tipo de produto inválido: {product_type}")

        # Validar método de pagamento
        payment_method = extract_field(payload, [["product", "method"]])
        if payment_method and not validate_payment_method(payment_method):
            raise HTTPException(status_code=400, detail=f"Método de pagamento inválido: {payment_method}")

        # Extrair dados específicos de venda
        valor = extract_field(payload, [["sale", "amount"]])
        payment_method = extract_field(payload, [["sale", "method"]])
        seller_balance = extract_field(payload, [["sale", "seller_balance"]])
        sale_metas = extract_field(payload, [["saleMetas"]])
        coupon = extract_field(payload, [["sale", "coupon"]])

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

        # Processar metadados de pagamento
        payment_metadata = extract_payment_metadata(sale_metas) if sale_metas else {}

        # Determinar tag
        produto_final = PRODUCT_NAME_TO_PRODUTO.get(produto_original) if isinstance(produto_original, str) else None
        status_original = extract_field(payload, [["sale", "status"]])
        if status_original is None:
            status_original = extract_field(payload, [["currentStatus"]])
        if status_original is None:
            status_original = extract_field(payload, [["oldStatus"]])
        
        acao_final = STATUS_TO_ACAO.get(status_original.lower()) if isinstance(status_original, str) else None

    elif payload_type == WebhookType.CONTRACT:
        # Validar status do contrato
        current_status = payload.get("currentStatus")
        if not validate_contract_status(current_status):
            raise HTTPException(status_code=400, detail=f"Status de contrato inválido: {current_status}")

        # Extrair dados específicos de contrato
        contract_start_date = extract_field(payload, [["contract", "start_date"]])
        contract_end_date = extract_field(payload, [["contract", "current_period_end"]])
        coupon = extract_field(payload, [["currentSale", "coupon"]])
        sale_metas = extract_field(payload, [["saleMetas"]])

        # Determinar tag
        produto_final = PRODUCT_NAME_TO_PRODUTO.get(produto_original) if isinstance(produto_original, str) else None
        acao_final = STATUS_TO_ACAO.get(current_status.lower()) if isinstance(current_status, str) else None

    else:  # WebhookType.LEAD
        # Validar passo do checkout
        checkout_step = extract_field(payload, [["lead", "step"]])
        if not validate_checkout_step(checkout_step):
            raise HTTPException(status_code=400, detail=f"Passo do checkout inválido: {checkout_step}")

        # Determinar tag
        produto_final = PRODUCT_NAME_TO_PRODUTO.get(produto_original) if isinstance(produto_original, str) else None
        acao_final = "abandonada"

    # Validar tag final
    tag_final = f"{acao_final}-{produto_final}" if acao_final and produto_final else None
    if not tag_final:
        raise HTTPException(status_code=400, detail="Não foi possível determinar a tag da task")

    # Consultar task existente
    existing_task = await get_task_by_email(email, api_token)

    if existing_task:
        # Adicionar tag à task existente
        task_id = existing_task["id"]
        await add_tag_to_task(task_id, tag_final, api_token)
        return JSONResponse(content={
            "message": "Tag adicionada à task existente",
            "task_id": task_id,
            "tag": tag_final,
            "email": email,
            "type": payload_type,
            "event": payload_event,
            "status": current_status if payload_type != WebhookType.LEAD else None,
            "checkout_step": checkout_step if payload_type == WebhookType.LEAD else None
        })
    else:
        # Criar nova task
        task_data = {
            "name": nome,
            "email": email,
            "phone": telefone_final,
            "tag": tag_final,
            "api_token": api_token,
            "document": document,
            "product_type": product_type if payload_type == WebhookType.SALE else None,
            "product_name": produto_original,
            "product_metas": product_metas_final,
            "proposal_metas": proposal_metas_final
        }

        if payload_type == WebhookType.SALE:
            task_data.update({
                "value": valor_final,
                "payment_method": payment_method,
                "payment_brand": payment_metadata.get("brand"),
                "seller_balance": seller_balance,
                "coupon": coupon
            })
        elif payload_type == WebhookType.CONTRACT:
            task_data.update({
                "coupon": coupon
            })
        else:  # WebhookType.LEAD
            pass  # Não há campos adicionais para o ClickUp

        new_task = await create_task(**task_data)
        return JSONResponse(content={
            "message": "Nova task criada",
            "task": new_task,
            "tag": tag_final,
            "email": email,
            "type": payload_type,
            "event": payload_event,
            "status": current_status if payload_type != WebhookType.LEAD else None,
            "checkout_step": checkout_step if payload_type == WebhookType.LEAD else None,
            "contract_start_date": contract_start_date if payload_type == WebhookType.CONTRACT else None,
            "contract_end_date": contract_end_date if payload_type == WebhookType.CONTRACT else None
        }) 