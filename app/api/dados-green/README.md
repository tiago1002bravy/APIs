# API - /api/dados-green (Next.js)

Endpoint para processamento de webhooks da Green, compatível com Vercel/Next.js.

## Formatos de Payload Aceitos

O endpoint aceita os seguintes formatos de payload:

### 1. Objeto direto (webhook puro)
```json
{
  "type": "sale",
  "event": "saleUpdated",
  "client": { "email": "exemplo@exemplo.com", ... },
  ...
}
```

### 2. Objeto com campo `body`
```json
{
  "body": {
    "type": "sale",
    "event": "saleUpdated",
    ...
  }
}
```

### 3. Array com campo `body`
```json
[
  {
    "body": {
      "type": "sale",
      "event": "saleUpdated",
      ...
    }
  }
]
```

## Tipos de Webhook Suportados

- **Vendas** (`type: "sale"`)
- **Contratos** (`type: "contract"`)
- **Abandono de Carrinho** (`type: "lead", event: "checkoutAbandoned"`)

## Exemplo de Requisição

```bash
curl -X POST https://SEU_DOMINIO/api/dados-green \
  -H "Content-Type: application/json" \
  -d '{
    "type": "sale",
    "event": "saleUpdated",
    "client": { "name": "Nome", "email": "email@exemplo.com" },
    "product": { "name": "Produto" },
    "sale": { "amount": 100, "status": "paid" }
  }'
```

## Resposta

A resposta será sempre um array com um objeto padronizado:
```json
[
  {
    "nome": "Nome do Cliente",
    "email": "email@exemplo.com",
    "telefone": "11999999999",
    "produto": "nome-do-produto",
    "acao": "comprador",
    "tag": "comprador-nome-do-produto",
    "idproduto": "comprador-nome-do-produto",
    "valor": 100,
    "liquidado": 100
  }
]
```

## Observações
- O endpoint está em `/api/dados-green` (Next.js, Vercel).
- Não há autenticação por padrão.
- Logs de debug podem ser visualizados no painel da Vercel.
- Para dúvidas ou ajustes, consulte o arquivo `app/api/dados-green/route.js`. 