"""
Rotas para processamento de webhooks.
"""
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from typing import Any, Dict, Optional, List

from ..core.config import STATUS_TO_ACAO, PRODUCT_NAME_TO_PRODUTO
from ..utils.extractors import extract_field

router = APIRouter(prefix="/api")

@router.post("/dados-green", tags=["webhook"])
async def process_webhook(request: Request):
    try:
        payload = await request.json()
        # Se for um array com campo body, extrai o body
        if (Array.isArray(payload) && payload.length > 0 && payload[0].body):
            payload = payload[0].body
        elif payload.body and isinstance(payload.body, dict):
            payload = payload.body
        else:
            raise HTTPException(status_code=400, detail="Invalid JSON payload: must be a non-empty array or an object with a 'body' field.")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or malformed JSON payload")

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
    seller_balance_paths = [["sale", "seller_balance"]]

    # 1. Extrair nome
    raw_nome = extract_field(payload, nome_paths)
    nome_final: Optional[str] = None
    if isinstance(raw_nome, str) and raw_nome.strip():
        nome_final = raw_nome.strip()
    elif raw_nome is not None:
        nome_final = None

    # 2. Extrair email
    raw_email = extract_field(payload, email_paths)
    email_final: Optional[str] = None
    if isinstance(raw_email, str) and raw_email.strip():
        email_final = raw_email.strip()

    console.log('Email extraído:', email_final);

    # 3. Extrair telefone
    raw_telefone = extract_field(payload, telefone_paths)
    telefone_final: Optional[str] = None
    if isinstance(raw_telefone, str) and raw_telefone.strip():
        telefone_final = raw_telefone.strip()
    elif isinstance(raw_telefone, (int, float)):
        telefone_final = str(raw_telefone)

    # 4. Extrair e converter produto
    produto_original_nome = extract_field(payload, produto_original_paths)
    produto_final: Optional[str] = None
    if isinstance(produto_original_nome, str):
        produto_final = PRODUCT_NAME_TO_PRODUTO.get(produto_original_nome.strip())
        if produto_final is None:
            # Se não encontrar no mapeamento, usar o nome original formatado
            produto_final = produto_original_nome.strip().lower()
            # Substituir espaços por hífens e remover acentos
            produto_final = produto_final.replace(" ", "-")
            # Remover acentos
            import unicodedata
            produto_final = produto_final.replace(" ", "-")
            # Remover acentos
            import unicodedata
            produto_final = ''.join(c for c in unicodedata.normalize('NFD', produto_final)
                                  if unicodedata.category(c) != 'Mn')

    # 5. Extrair e converter acao
    acao_final: Optional[str] = None
    if is_checkout_abandoned_event:
        acao_final = "abandonada"
    else:
        status_original = extract_field(payload, status_sale_paths)
        if status_original is None:
            status_original = extract_field(payload, status_current_paths)
        if status_original is None:
            status_original = extract_field(payload, status_old_paths)
        
        if isinstance(status_original, str):
            acao_final = STATUS_TO_ACAO.get(status_original.lower())

    # 6. Criar tag
    tag_final: Optional[str] = None
    if acao_final and produto_final:
        tag_final = f"{acao_final}-{produto_final}"

    # 7. Criar idproduto (igual a tag)
    idproduto_final: Optional[str] = tag_final

    # 8. Extrair valor
    raw_valor = extract_field(payload, valor_paths)
    valor_final: Optional[int] = None
    if isinstance(raw_valor, (int, float)):
        valor_final = int(raw_valor)
    elif isinstance(raw_valor, str):
        try:
            cleaned_valor_str = raw_valor.replace(",", ".")
            valor_final = int(float(cleaned_valor_str))
        except ValueError:
            valor_final = None

    # 9. Extrair valor liquidado
    liquidado_final: Optional[float] = None
    if acao_final == "comprador":
        raw_liquidado = extract_field(payload, seller_balance_paths)
        if isinstance(raw_liquidado, (int, float)):
            liquidado_final = float(raw_liquidado)
        elif isinstance(raw_liquidado, str):
            try:
                cleaned_liquidado_str = raw_liquidado.replace(",", ".")
                liquidado_final = float(cleaned_liquidado_str)
            except ValueError:
                liquidado_final = None

    output_data = {
        "nome": nome_final,
        "email": email_final,
        "telefone": telefone_final,
        "produto": produto_final,
        "acao": acao_final,
        "tag": tag_final,
        "idproduto": idproduto_final,
        "valor": valor_final,
        "liquidado": liquidado_final,
    }

    return JSONResponse(content=[output_data]) 