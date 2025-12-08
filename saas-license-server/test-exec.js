const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'test-log.txt');

function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(logFile, logMessage);
    console.log(message);
}

log('=== INICIANDO TESTE ===');

try {
    log('1. Testando require express...');
    const express = require('express');
    log('✅ Express carregado');
    
    log('2. Criando app...');
    const app = express();
    log('✅ App criado');
    
    log('3. Configurando rota /test...');
    app.get('/test', (req, res) => {
        log('Rota /test chamada!');
        res.send('OK');
    });
    log('✅ Rota configurada');
    
    log('4. Iniciando servidor na porta 3000...');
    const server = app.listen(3000, () => {
        log('✅ SERVIDOR RODANDO NA PORTA 3000!');
        log('Acesse: http://localhost:3000/test');
    });
    
    server.on('error', (err) => {
        log(`❌ ERRO: ${err.message}`);
        if (err.code === 'EADDRINUSE') {
            log('Porta 3000 ocupada, tentando 3001...');
            const server2 = app.listen(3001, () => {
                log('✅ SERVIDOR RODANDO NA PORTA 3001!');
            });
        }
    });
    
    log('5. Servidor iniciado, aguardando requisições...');
    
} catch (error) {
    log(`❌ ERRO FATAL: ${error.message}`);
    log(`Stack: ${error.stack}`);
    process.exit(1);
}

log('=== TESTE CONCLUÍDO ===');

