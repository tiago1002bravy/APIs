# Green API

API para processamento de webhooks, desenvolvida com FastAPI.

## Estrutura do Projeto

```
green/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── routes/
│   │   ├── __init__.py
│   │   └── webhook.py
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py
│   └── utils/
│       ├── __init__.py
│       └── extractors.py
├── requirements.txt
└── README.md
```

## Instalação

1. Crie um ambiente virtual (recomendado):
```bash
python -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate
```

2. Instale as dependências:
```bash
pip install -r requirements.txt
```

## Executando a Aplicação

Para executar a aplicação em modo de desenvolvimento:

```bash
uvicorn app.main:app --reload
```

A API estará disponível em `http://localhost:8000`

## Documentação

A documentação interativa da API estará disponível em:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Rotas

- `POST /` ou `POST /api/webhook`: Processa webhooks de eventos
  - Aceita eventos de venda e checkout abandonado
  - Retorna dados processados em formato padronizado 