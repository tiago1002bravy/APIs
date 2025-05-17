"""
Aplicação principal FastAPI.
"""
from fastapi import FastAPI
from .routes import webhook, clickup

app = FastAPI(
    title="Green API",
    description="API para processamento de webhooks e integração com ClickUp",
    version="1.0.0"
)

# Incluir as rotas
app.include_router(webhook.router)
app.include_router(clickup.router)

# Para executar localmente:
# 1. Instale as dependências: pip install -r requirements.txt
# 2. Configure a variável de ambiente CLICKUP_API_KEY
# 3. Execute o servidor: uvicorn app.main:app --reload
# A API estará disponível em http://localhost:8000 