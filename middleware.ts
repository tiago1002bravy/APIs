import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Logging de todas as requisições
  console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`)

  // Continua com a requisição normalmente
  return NextResponse.next()
}

// Configuração para que o middleware seja executado apenas nas rotas da API
export const config = {
  matcher: "/api/:path*",
} 