const express = require('express');

// Mapeamentos de status e produtos
const STATUS_TO_ACAO = {
    "created": "lead",
    "paid": "comprador",
    "waiting_payment": "aguardando",
    "refused": "recusado",
    "refunded": "reembolsado",
    "chargedback": "chargeback"
};

const PRODUCT_NAME_TO_PRODUTO = {
    "Produto A": "produto-a",
    "Produto B": "produto-b",
    // Adicione outros mapeamentos conforme necessário
};

// Função auxiliar para extrair campos do payload
function extractField(payload, paths) {
    for (const path of paths) {
        let value = payload;
        for (const key of path) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                value = null;
                break;
            }
        }
        if (value !== null) {
            return value;
        }
    }
    return null;
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const payload = req.body;
        if (!payload || typeof payload !== 'object') {
            return res.status(400).json({ error: 'Payload JSON inválido: deve ser um objeto' });
        }

        const payloadType = payload.type;
        const payloadEvent = payload.event;
        const isCheckoutAbandonedEvent = (payloadType === "lead" && payloadEvent === "checkoutAbandoned");

        // Definir caminhos de extração com base no tipo de evento
        const nomePaths = isCheckoutAbandonedEvent ? 
            [["lead", "name"]] : 
            [["client", "name"]];
        
        const emailPaths = isCheckoutAbandonedEvent ? 
            [["lead", "email"]] : 
            [["client", "email"]];
        
        const telefonePaths = isCheckoutAbandonedEvent ? 
            [["lead", "cellphone"]] : 
            [["client", "cellphone"]];

        const produtoOriginalPaths = [["product", "name"]];
        const statusSalePaths = [["sale", "status"]];
        const statusCurrentPaths = [["currentStatus"]];
        const statusOldPaths = [["oldStatus"]];
        const valorPaths = [["sale", "amount"]];
        const sellerBalancePaths = [["sale", "seller_balance"]];

        // 1. Extrair nome
        let nomeFinal = null;
        const rawNome = extractField(payload, nomePaths);
        if (typeof rawNome === 'string' && rawNome.trim()) {
            nomeFinal = rawNome.trim();
        }

        // 2. Extrair email
        let emailFinal = null;
        const rawEmail = extractField(payload, emailPaths);
        if (typeof rawEmail === 'string' && rawEmail.trim()) {
            emailFinal = rawEmail.trim();
        }

        // 3. Extrair telefone
        let telefoneFinal = null;
        const rawTelefone = extractField(payload, telefonePaths);
        if (typeof rawTelefone === 'string' && rawTelefone.trim()) {
            telefoneFinal = rawTelefone.trim();
        } else if (typeof rawTelefone === 'number') {
            telefoneFinal = String(rawTelefone);
        }

        // 4. Extrair e converter produto
        let produtoFinal = null;
        const produtoOriginalNome = extractField(payload, produtoOriginalPaths);
        if (typeof produtoOriginalNome === 'string') {
            produtoFinal = PRODUCT_NAME_TO_PRODUTO[produtoOriginalNome];
        }

        // 5. Extrair e converter acao
        let acaoFinal = null;
        if (isCheckoutAbandonedEvent) {
            acaoFinal = "abandonada";
        } else {
            let statusOriginal = extractField(payload, statusSalePaths);
            if (statusOriginal === null) {
                statusOriginal = extractField(payload, statusCurrentPaths);
            }
            if (statusOriginal === null) {
                statusOriginal = extractField(payload, statusOldPaths);
            }
            
            if (typeof statusOriginal === 'string') {
                acaoFinal = STATUS_TO_ACAO[statusOriginal.toLowerCase()];
            }
        }

        // 6. Criar tag
        const tagFinal = (acaoFinal && produtoFinal) ? 
            `${acaoFinal}-${produtoFinal}` : 
            null;

        // 7. Criar idproduto (igual a tag)
        const idprodutoFinal = tagFinal;

        // 8. Extrair valor
        let valorFinal = null;
        const rawValor = extractField(payload, valorPaths);
        if (typeof rawValor === 'number') {
            valorFinal = Math.floor(rawValor);
        } else if (typeof rawValor === 'string') {
            try {
                const cleanedValorStr = rawValor.replace(',', '.');
                valorFinal = Math.floor(parseFloat(cleanedValorStr));
            } catch (e) {
                valorFinal = null;
            }
        }

        // 9. Extrair valor liquidado
        let liquidadoFinal = null;
        if (acaoFinal === "comprador") {
            const rawLiquidado = extractField(payload, sellerBalancePaths);
            if (typeof rawLiquidado === 'number') {
                liquidadoFinal = parseFloat(rawLiquidado);
            } else if (typeof rawLiquidado === 'string') {
                try {
                    const cleanedLiquidadoStr = rawLiquidado.replace(',', '.');
                    liquidadoFinal = parseFloat(cleanedLiquidadoStr);
                } catch (e) {
                    liquidadoFinal = null;
                }
            }
        }

        const outputData = {
            nome: nomeFinal,
            email: emailFinal,
            telefone: telefoneFinal,
            produto: produtoFinal,
            acao: acaoFinal,
            tag: tagFinal,
            idproduto: idprodutoFinal,
            valor: valorFinal,
            liquidado: liquidadoFinal
        };

        return res.status(200).json([outputData]);

    } catch (error) {
        console.error('Erro ao processar webhook:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
}; 