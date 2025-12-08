console.log('=== TESTE DE INICIALIZACAO DO SERVIDOR ===\n');

// 1. Testar mongoose
console.log('1. Testando mongoose...');
try {
    const mongoose = require('mongoose');
    console.log('   ✅ Mongoose carregado!');
} catch (err) {
    console.log('   ❌ ERRO ao carregar mongoose:', err.message);
    console.log('   Código:', err.code);
    process.exit(1);
}

// 2. Testar outras dependências
console.log('\n2. Testando outras dependências...');
try {
    require('express');
    require('body-parser');
    require('adm-zip');
    require('express-session');
    console.log('   ✅ Todas as dependências OK!');
} catch (err) {
    console.log('   ❌ ERRO:', err.message);
    process.exit(1);
}

// 3. Testar .env
console.log('\n3. Testando .env...');
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    console.log('   ✅ Arquivo .env encontrado!');
} else {
    console.log('   ⚠️ Arquivo .env não encontrado (usando padrões)');
}

// 4. Tentar iniciar servidor básico
console.log('\n4. Tentando iniciar servidor básico...');
try {
    const express = require('express');
    const app = express();
    const PORT = process.env.PORT || 5000;
    
    app.get('/', (req, res) => {
        res.send('Servidor funcionando!');
    });
    
    const server = app.listen(PORT, () => {
        console.log(`   ✅ Servidor iniciado na porta ${PORT}!`);
        console.log(`   🌐 Acesse: http://localhost:${PORT}`);
        console.log('\n=== SERVIDOR RODANDO ===\n');
    });
    
    server.on('error', (err) => {
        console.log('   ❌ ERRO ao iniciar servidor:', err.message);
        if (err.code === 'EADDRINUSE') {
            console.log('   ⚠️ Porta ocupada!');
        }
        process.exit(1);
    });
    
} catch (err) {
    console.log('   ❌ ERRO:', err.message);
    process.exit(1);
}
