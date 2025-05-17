"""
Aplicação principal FastAPI.
"""
from fastapi import FastAPI
from .routes import webhook

app = FastAPI(
    title="Green API",
    description="API para processamento de webhooks",
    version="1.0.0"
)

# Incluir as rotas
app.include_router(webhook.router)

# Para executar localmente:
# 1. Instale as dependências: pip install fastapi uvicorn
# 2. Execute o servidor: uvicorn app.main:app --reload
# A API estará disponível em http://localhost:8000 