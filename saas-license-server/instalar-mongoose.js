const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando se mongoose está instalado...');

const mongoosePath = path.join(__dirname, 'node_modules', 'mongoose', 'package.json');

if (fs.existsSync(mongoosePath)) {
    console.log('✅ Mongoose já está instalado!');
    process.exit(0);
}

console.log('📦 Mongoose não encontrado. Instalando...');

try {
    console.log('Executando: npm install mongoose');
    execSync('npm install mongoose', { 
        stdio: 'inherit',
        cwd: __dirname,
        shell: true
    });
    console.log('✅ Mongoose instalado com sucesso!');
} catch (error) {
    console.error('❌ Erro ao instalar mongoose:', error.message);
    process.exit(1);
}
