import { NextResponse } from 'next/server'

// Interface para definir a estrutura da resposta
interface ApiResponse {
  campo1: string
  campo2: string
  campo3: string
  campo4: string
  campo5: string
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Exemplo de resposta com alguns campos vazios
    const response: ApiResponse = {
      campo1: body.campo1 || "null",
      campo2: body.campo2 || "null",
      campo3: body.campo3 || "null",
      campo4: body.campo4 || "null",
      campo5: body.campo5 || "null"
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    // Em caso de erro, também retornamos todos os campos como "null"
    const errorResponse: ApiResponse = {
      campo1: "null",
      campo2: "null",
      campo3: "null",
      campo4: "null",
      campo5: "null"
    }
    
    return NextResponse.json(errorResponse, { status: 400 })
  }
} 