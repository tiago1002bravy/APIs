"""
Rotas para interação com o ClickUp.
"""
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from typing import Any, Dict, Optional

from ..services.clickup_service import ClickUpService
from ..utils.extractors import extract_field

router = APIRouter(prefix="/api")

@router.post("/clickup/task", tags=["clickup"])
async def create_clickup_task(request: Request):
    """
    Cria uma nova tarefa no ClickUp com os dados do webhook.
    Verifica se já existe uma tarefa com o mesmo email antes de criar.
    """
    try:
        # Processa o payload do webhook
        payload: Dict[str, Any] = await request.json()
        if not isinstance(payload, dict):
            raise HTTPException(status_code=400, detail="Invalid JSON payload: root must be an object.")

        # Extrai os campos necessários usando os mesmos caminhos do webhook original
        nome_paths = [["client", "name"], ["lead", "name"]]
        email_paths = [["client", "email"], ["lead", "email"]]
        whatsapp_paths = [["client", "cellphone"], ["lead", "cellphone"]]
        valor_paths = [["sale", "amount"]]
        produto_paths = [["product", "name"]]
        status_paths = [["sale", "status"], ["currentStatus"], ["oldStatus"]]

        # Extrai os dados
        nome = extract_field(payload, nome_paths)
        email = extract_field(payload, email_paths)
        whatsapp = extract_field(payload, whatsapp_paths)
        raw_valor = extract_field(payload, valor_paths)
        produto = extract_field(payload, produto_paths)
        status = extract_field(payload, status_paths)

        # Valida os dados obrigatórios
        if not all([nome, email, whatsapp, raw_valor]):
            raise HTTPException(
                status_code=400,
                detail="Dados incompletos. São necessários: nome, email, whatsapp e valor"
            )

        # Converte o valor para inteiro
        try:
            if isinstance(raw_valor, str):
                valor = int(float(raw_valor.replace(",", ".")))
            else:
                valor = int(raw_valor)
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=400,
                detail="Valor inválido. Deve ser um número"
            )

        # Mapeia o status para a ação
        STATUS_TO_ACAO = {
            "waiting_payment": "aguardando-pagamento",
            "paid": "comprador",
            "refused": "recusada",
            "refunded": "reembolsada",
            "chargedback": "chargeback",
            "abandoned": "abandonada",
        }

        # Mapeia o produto
        PRODUCT_NAME_TO_PRODUTO = {
            "Mentoria Black": "mentoria-black",
            "Implementação Bravy": "implementacao-bravy",
            "Bravy Club": "bravy-club",
            "Floow PRO": "floow-pro",
            "Bravy Black": "bravy-black",
            "ClickUp Pro": "clickup-pro",
            "Club+Floow": "club+floow",
            "ClickUp Start": "clickup-start",
            "CRM Automatizado": "crm-automatizado",
        }

        # Determina a ação
        acao = STATUS_TO_ACAO.get(status.lower() if status else "abandoned", "abandonada")
        
        # Determina o produto
        produto_final = PRODUCT_NAME_TO_PRODUTO.get(produto) if produto else None
        
        # Cria a tag
        tag = f"{acao}-{produto_final}" if produto_final else acao

        # Inicializa o serviço do ClickUp
        clickup_service = ClickUpService()

        # Verifica se já existe uma tarefa com este email
        existing_task = await clickup_service.check_existing_task(email)
        if existing_task:
            return JSONResponse(
                content={
                    "message": "Já existe uma tarefa para este email",
                    "task": existing_task
                },
                status_code=200
            )

        # Cria a nova tarefa
        task = await clickup_service.create_task(
            nome=nome,
            email=email,
            whatsapp=whatsapp,
            valor=valor,
            tag=tag
        )

        return JSONResponse(
            content={
                "message": "Tarefa criada com sucesso",
                "task": task
            },
            status_code=201
        )

    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar requisição: {str(e)}") 