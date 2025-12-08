const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Verificando dependências...\n');

const mongoosePath = path.join(__dirname, 'node_modules', 'mongoose', 'package.json');

if (!fs.existsSync(mongoosePath)) {
    console.log('❌ Mongoose não encontrado!');
    console.log('📦 Instalando mongoose...\n');
    
    try {
        execSync('npm install mongoose', {
            stdio: 'inherit',
            cwd: __dirname,
            shell: true
        });
        
        if (fs.existsSync(mongoosePath)) {
            console.log('\n✅ Mongoose instalado com sucesso!\n');
        } else {
            console.log('\n❌ ERRO: Mongoose ainda não foi instalado após o comando!');
            console.log('Por favor, execute manualmente: npm install mongoose');
            process.exit(1);
        }
    } catch (error) {
        console.log('\n❌ ERRO ao instalar mongoose:', error.message);
        console.log('Por favor, execute manualmente: npm install mongoose');
        process.exit(1);
    }
} else {
    console.log('✅ Mongoose já está instalado!\n');
}

console.log('🚀 Iniciando servidor...\n');
