import uvicorn
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from typing import Any, Dict, List, Optional

app = FastAPI()

STATUS_TO_ACAO = {
    "waiting_payment": "aguardando-pagamento",
    "paid": "comprador",
    "refused": "recusada",
    "refunded": "reembolsada",
    "chargedback": "chargeback",
    "abandoned": "abandonada",
}

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

def safe_get(data: Dict[str, Any], keys: List[str], default: Optional[Any] = None) -> Optional[Any]:
    temp = data
    for key in keys:
        if isinstance(temp, dict):
            temp = temp.get(key)
        else:
            return default
        if temp is None:
            return default
    return temp

def extract_field(data: Dict[str, Any], possible_paths: List[List[str]]) -> Optional[Any]:
    for path in possible_paths:
        value = safe_get(data, path)
        if value is not None: # Found a value
            # Ensure we're not returning an empty string if that's not desired (depends on field)
            # For now, any non-None value is accepted.
            return value
    return None

@app.post("/")
async def process_webhook(request: Request):
    try:
        payload: Dict[str, Any] = await request.json()
        if not isinstance(payload, dict):
            raise HTTPException(status_code=400, detail="Invalid JSON payload: root must be an object.")
    except Exception: # Covers JSONDecodeError and others
        raise HTTPException(status_code=400, detail="Invalid or malformed JSON payload")

    payload_type = payload.get("type")
    payload_event = payload.get("event")
    is_checkout_abandoned_event = (payload_type == "lead" and payload_event == "checkoutAbandoned")

    # Definir caminhos de extração com base no tipo de evento
    if is_checkout_abandoned_event:
        nome_paths = [["lead", "name"]]
        email_paths = [["lead", "email"]]
        telefone_paths = [["lead", "cellphone"]]
    else: # Lógica para eventos de venda (ou default)
        nome_paths = [["nome"], ["name"], ["buyer", "name"], ["client", "name"], ["customer", "name"]]
        email_paths = [["email"], ["buyer", "email"], ["client", "email"], ["customer", "email"]]
        telefone_paths = [
            ["client", "cellphone"], 
            ["telefone"], ["phone"], ["buyer", "phone"], ["client", "phone"], ["customer", "phone"]
        ]
    
    # produto_original_paths e valor_paths são genéricos o suficiente para ambos os casos
    produto_original_paths = [
        ["produto"], ["product"], ["product_name"], ["product", "name"], ["item", "name"], 
        ["produto", "nome"], ["produto_nome"]
    ]
    
    # Caminhos para status, com prioridade ajustada (usado apenas se não for checkout_abandoned)
    status_sale_paths = [["sale", "status"]] 
    status_current_paths = [["currentStatus"], ["current_status"], ["status"]]
    status_old_paths = [["oldStatus"], ["old_status"]]
    
    valor_paths = [
        ["sale", "amount"], 
        ["valor"], ["value"], ["amount"], ["price"], ["purchase", "value"], ["purchase", "amount"],
        ["product", "amount"] 
    ]
    seller_balance_paths = [["sale", "seller_balance"]] # Novo caminho para seller_balance

    # 1. Extrair nome
    raw_nome = extract_field(payload, nome_paths)
    nome_final: Optional[str] = None
    if isinstance(raw_nome, str) and raw_nome.strip(): # Ensure not just whitespace
        nome_final = raw_nome.strip()
    elif raw_nome is not None: # If it's a number or something else, treat as null for 'nome'
        nome_final = None


    # 2. Extrair email
    raw_email = extract_field(payload, email_paths)
    email_final: Optional[str] = None
    if isinstance(raw_email, str) and raw_email.strip():
         email_final = raw_email.strip()


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
        produto_final = PRODUCT_NAME_TO_PRODUTO.get(produto_original_nome)


    # 5. Extrair e converter acao
    acao_final: Optional[str] = None
    if is_checkout_abandoned_event:
        acao_final = "abandonada" # O valor 'abandonada' já está em STATUS_TO_ACAO
    else:
        status_original = extract_field(payload, status_sale_paths) # Tenta sale.status primeiro
        if status_original is None:
            status_original = extract_field(payload, status_current_paths) # Depois currentStatus (raiz)
        if status_original is None: 
            status_original = extract_field(payload, status_old_paths) # Por último oldStatus (raiz)
        
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
            cleaned_valor_str = raw_valor.replace(",", ".") # Handle "997,00" as "997.00"
            valor_final = int(float(cleaned_valor_str))
        except ValueError:
            valor_final = None # Cannot convert
    
    # 9. Extrair valor liquidado (apenas se acao_final for "comprador")
    liquidado_final: Optional[float] = None
    if acao_final == "comprador": # Verifica se a ação é "comprador" (status "paid")
        raw_liquidado = extract_field(payload, seller_balance_paths)
        if isinstance(raw_liquidado, (int, float)):
            liquidado_final = float(raw_liquidado)
        elif isinstance(raw_liquidado, str):
            try:
                # Trata strings que representam float com vírgula como decimal
                cleaned_liquidado_str = raw_liquidado.replace(",", ".")
                liquidado_final = float(cleaned_liquidado_str)
            except ValueError:
                liquidado_final = None # Não foi possível converter a string para float
    

    output_data = {
        "nome": nome_final,
        "email": email_final,
        "telefone": telefone_final,
        "produto": produto_final,
        "acao": acao_final,
        "tag": tag_final,
        "idproduto": idproduto_final,
        "valor": valor_final,
        "liquidado": liquidado_final, # Adiciona o novo campo liquidado
    }

    return JSONResponse(content=[output_data])

# Para executar localmente:
# 1. Salve este código como main.py
# 2. Instale as dependências: pip install fastapi uvicorn
# 3. Execute o servidor: uvicorn main:app --reload
# A API estará disponível em http://localhost:8000
# if __name__ == "__main__":
#     uvicorn.run(app, host="0.0.0.0", port=8000) 