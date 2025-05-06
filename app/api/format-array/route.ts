import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { uuids } = body

    if (!uuids || typeof uuids !== "string") {
      return new NextResponse("", { status: 400 })
    }

    const array = uuids
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean)
    const resultado = `[${array.map((u) => `"${u}"`).join(", ")}]`

    return new NextResponse(resultado, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    })
  } catch (error) {
    return new NextResponse("", { status: 400 })
  }
}
