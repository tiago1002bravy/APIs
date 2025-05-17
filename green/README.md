# Green API

API para processamento de webhooks e integração com ClickUp, desenvolvida com FastAPI.

## Estrutura do Projeto

```
green/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── webhook.py
│   │   └── clickup.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   └── clickup_config.py
│   ├── services/
│   │   ├── __init__.py
│   │   └── clickup_service.py
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

3. Configure as variáveis de ambiente:
   - Crie um arquivo `.env` na raiz do projeto
   - Adicione a chave de API do ClickUp:
     ```
     CLICKUP_API_KEY=sua_chave_api_aqui
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

### Webhook
- `POST /api/dados-green`: Processa webhooks de eventos
  - Aceita eventos de venda e checkout abandonado
  - Retorna dados processados em formato padronizado

### ClickUp
- `POST /api/clickup/task`: Cria uma nova tarefa no ClickUp
  - Aceita os mesmos dados do webhook
  - Verifica se já existe uma tarefa com o mesmo email
  - Cria a tarefa na lista configurada (ID: 901305222206)
  - Campos personalizados:
    - Email (ID: c34aaeb2-0233-42d3-8242-cd9a603b5b0b)
    - Telefone (ID: 9c5b9ad9-b085-4fdd-a0a9-0110d341de7c)
    - Valor (ID: ae3dc146-154c-4287-b2aa-17e4f643cbf8) 