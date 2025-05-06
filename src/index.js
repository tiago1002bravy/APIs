const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

// Middleware para processar JSON
app.use(bodyParser.json());

// Middleware para logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Rota do webhook
app.post('/webhook', (req, res) => {
    try {
        const data = req.body;
        
        console.log(data);
        // Validação básica dos dados
        if (!data || Object.keys(data).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'O corpo da requisição não pode estar vazio'
            });
        }

        // Aqui você pode processar os dados recebidos
        console.log('Dados recebidos:', JSON.stringify(data, null, 2));
        
        // Responder com sucesso
        res.status(200).json({
            success: true,
            message: 'Dados recebidos com sucesso',
            receivedData: data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erro ao processar webhook:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao processar os dados',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Nova rota para formatar array de UUIDs
app.post('/format-array', (req, res) => {
    const { uuids } = req.body;
    if (!uuids || typeof uuids !== 'string') {
        return res.status(400).send('');
    }
    const array = uuids.split(',').map(u => u.trim()).filter(Boolean);
    const resultado = `[${array.map(u => `"${u}"`).join(', ')}]`;
    res.set('Content-Type', 'text/plain');
    res.send(resultado);
});

// Rota de teste
app.get('/', (req, res) => {
    res.json({
        message: 'API está funcionando! Use POST /webhook para enviar dados.',
        exemplo: {
            url: '/webhook',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: {
                "nome": "exemplo",
                "valor": 123
            }
        }
    });
});

// Middleware para tratar rotas não encontradas
app.use((req, res) => {
    res.status(404).send('');
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
    console.log(`Teste a API com: curl -X POST http://localhost:${port}/webhook -H "Content-Type: application/json" -d '{"nome":"teste","valor":123}'`);
}); 