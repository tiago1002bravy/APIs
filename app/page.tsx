export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Webhook API</h1>
      <p className="text-xl mb-4">API está funcionando! Use POST /api/webhook para enviar dados.</p>
      <div className="bg-gray-100 p-4 rounded-lg max-w-2xl w-full">
        <h2 className="text-xl font-semibold mb-2">Exemplo de uso:</h2>
        <pre className="bg-gray-800 text-white p-4 rounded overflow-x-auto">
          {`fetch('/api/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    "nome": "exemplo",
    "valor": 123
  })
})`}
        </pre>
      </div>
    </main>
  )
} 