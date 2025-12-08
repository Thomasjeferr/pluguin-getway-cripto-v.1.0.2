const fs = require('fs');
const path = require('path');

console.log('=== DIAGNÓSTICO COMPLETO ===\n');

// 1. Verificar Node.js
console.log('1. Versão do Node.js:');
try {
    console.log('   ✅', process.version);
} catch (e) {
    console.log('   ❌ Erro:', e.message);
}

// 2. Verificar npm
console.log('\n2. Verificando npm...');
const { execSync } = require('child_process');
try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8', cwd: __dirname });
    console.log('   ✅ npm versão:', npmVersion.trim());
} catch (e) {
    console.log('   ❌ npm não encontrado:', e.message);
}

// 3. Verificar mongoose
console.log('\n3. Verificando mongoose...');
const mongoosePath = path.join(__dirname, 'node_modules', 'mongoose', 'package.json');
if (fs.existsSync(mongoosePath)) {
    const pkg = JSON.parse(fs.readFileSync(mongoosePath, 'utf8'));
    console.log('   ✅ Mongoose instalado - versão:', pkg.version);
} else {
    console.log('   ❌ Mongoose NÃO está instalado');
    console.log('   📍 Caminho esperado:', mongoosePath);
}

// 4. Verificar package.json
console.log('\n4. Verificando package.json...');
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    console.log('   ✅ package.json encontrado');
    if (pkg.dependencies && pkg.dependencies.mongoose) {
        console.log('   ✅ mongoose listado nas dependências:', pkg.dependencies.mongoose);
    } else {
        console.log('   ❌ mongoose NÃO está listado nas dependências');
    }
} else {
    console.log('   ❌ package.json não encontrado');
}

// 5. Tentar instalar mongoose
console.log('\n5. Tentando instalar mongoose...');
try {
    console.log('   Executando: npm install mongoose');
    execSync('npm install mongoose', { 
        stdio: 'inherit',
        cwd: __dirname,
        shell: true
    });
    console.log('   ✅ Comando executado');
    
    // Verificar novamente
    if (fs.existsSync(mongoosePath)) {
        console.log('   ✅ Mongoose instalado com SUCESSO!');
    } else {
        console.log('   ❌ Mongoose ainda não existe após instalação');
    }
} catch (e) {
    console.log('   ❌ Erro ao instalar:', e.message);
}

// 6. Tentar carregar mongoose
console.log('\n6. Tentando carregar mongoose...');
try {
    const mongoose = require('mongoose');
    console.log('   ✅ Mongoose carregado com sucesso!');
} catch (e) {
    console.log('   ❌ Erro ao carregar mongoose:', e.message);
    console.log('   Código do erro:', e.code);
}

console.log('\n=== FIM DO DIAGNÓSTICO ===');
