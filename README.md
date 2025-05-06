# Webhook API com Next.js

Este projeto é uma API de Webhook e formatação de arrays, agora migrada para Next.js (ideal para deploy na Vercel).

## Passo a passo para migrar e rodar o projeto

### 1. Remova arquivos antigos do Express
- Apague a pasta `src/` e arquivos como `index.js` que eram do Express.

### 2. Estrutura recomendada
```
/app
  /api
    /webhook/route.ts
    /format-array/route.ts
    route.ts
  layout.tsx
  page.tsx
  globals.css
middleware.ts
.gitignore
next.config.mjs
package.json
tsconfig.json
postcss.config.js
tailwind.config.js
```

### 3. Instale as dependências
```bash
npm install
```

### 4. (Opcional) Instale Tailwind CSS
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 5. Rode o projeto localmente
```bash
npm run dev
```

### 6. Faça o deploy na Vercel
- Suba o projeto para o GitHub
- Importe o repositório na Vercel
- Pronto! Suas rotas estarão públicas

## Rotas disponíveis
- `POST /api/webhook` — Recebe dados de webhook
- `POST /api/format-array` — Formata uma string de UUIDs em array
- `GET /api` — Mensagem de status da API

## Exemplo de uso
Veja exemplos de uso na página inicial (`/`).

---

Se precisar de mais detalhes, consulte os arquivos na pasta `app/api/` ou peça ajuda aqui! 