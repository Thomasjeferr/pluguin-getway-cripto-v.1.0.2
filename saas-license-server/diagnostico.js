console.log('=== DIAGNÓSTICO DO SERVIDOR ===\n');

// 1. Verificar Node.js
console.log('1. Versão do Node.js:');
try {
    console.log('   ✅ Node.js:', process.version);
} catch (e) {
    console.log('   ❌ Erro:', e.message);
}

// 2. Verificar módulos
console.log('\n2. Verificando módulos:');
const modules = ['express', 'body-parser', 'ejs', 'express-session', 'adm-zip', 'path'];
modules.forEach(mod => {
    try {
        require(mod);
        console.log(`   ✅ ${mod} - OK`);
    } catch (e) {
        console.log(`   ❌ ${mod} - FALTANDO: ${e.message}`);
    }
});

// 3. Verificar arquivos
console.log('\n3. Verificando arquivos:');
const fs = require('fs');
const path = require('path');

const viewsPath = path.join(__dirname, 'views');
const loginPath = path.join(__dirname, 'views', 'login.ejs');

console.log('   Views dir:', viewsPath);
console.log('   Views existe:', fs.existsSync(viewsPath) ? '✅ SIM' : '❌ NÃO');
console.log('   Login.ejs existe:', fs.existsSync(loginPath) ? '✅ SIM' : '❌ NÃO');

// 4. Testar Express
console.log('\n4. Testando Express:');
try {
    const express = require('express');
    const app = express();
    console.log('   ✅ Express carregado');
    
    app.get('/test', (req, res) => res.send('OK'));
    console.log('   ✅ Rota de teste criada');
} catch (e) {
    console.log('   ❌ Erro no Express:', e.message);
}

// 5. Testar EJS
console.log('\n5. Testando EJS:');
try {
    const ejs = require('ejs');
    console.log('   ✅ EJS carregado');
} catch (e) {
    console.log('   ❌ Erro no EJS:', e.message);
}

console.log('\n=== FIM DO DIAGNÓSTICO ===\n');

