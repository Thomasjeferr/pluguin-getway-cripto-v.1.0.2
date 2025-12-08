const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const logFile = path.join(__dirname, 'instalacao-log.txt');
const writeLog = (msg) => {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${msg}\n`);
    console.log(msg);
};

writeLog('=== INICIANDO TESTE DE INSTALACAO ===');

// Verificar mongoose
const mongoosePath = path.join(__dirname, 'node_modules', 'mongoose');
writeLog(`Verificando: ${mongoosePath}`);

if (fs.existsSync(mongoosePath)) {
    writeLog('✅ Mongoose EXISTE!');
} else {
    writeLog('❌ Mongoose NAO EXISTE!');
    writeLog('Tentando instalar...');
    
    try {
        execSync('npm install mongoose', {
            stdio: 'pipe',
            cwd: __dirname,
            shell: true,
            encoding: 'utf8'
        });
        writeLog('✅ Comando npm install executado!');
        
        // Verificar novamente
        if (fs.existsSync(mongoosePath)) {
            writeLog('✅ Mongoose INSTALADO COM SUCESSO!');
        } else {
            writeLog('❌ Mongoose ainda NAO existe após instalação!');
        }
    } catch (error) {
        writeLog(`❌ ERRO: ${error.message}`);
        writeLog(`STDOUT: ${error.stdout || 'N/A'}`);
        writeLog(`STDERR: ${error.stderr || 'N/A'}`);
    }
}

writeLog('=== FIM DO TESTE ===');
