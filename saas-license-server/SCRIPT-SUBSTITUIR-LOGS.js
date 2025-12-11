#!/usr/bin/env node
/**
 * Script auxiliar para encontrar e substituir console.log
 * 
 * Uso: node SCRIPT-SUBSTITUIR-LOGS.js
 * 
 * Este script ajuda a identificar todos os console.log/error/warn
 * e sugere substituições.
 */

const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, 'server.js');

if (!fs.existsSync(serverFile)) {
    console.error('Arquivo server.js não encontrado!');
    process.exit(1);
}

const content = fs.readFileSync(serverFile, 'utf8');
const lines = content.split('\n');

// Padrões para encontrar
const patterns = [
    { regex: /console\.log\(/g, replacement: 'logger.info(' },
    { regex: /console\.error\(/g, replacement: 'logger.error(' },
    { regex: /console\.warn\(/g, replacement: 'logger.warn(' },
    { regex: /console\.info\(/g, replacement: 'logger.info(' },
];

console.log('🔍 Analisando server.js...\n');

const results = {
    log: [],
    error: [],
    warn: [],
    info: []
};

// Encontrar todas as ocorrências
lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    if (line.includes('console.log(')) {
        results.log.push({ line: lineNum, content: line.trim() });
    }
    if (line.includes('console.error(')) {
        results.error.push({ line: lineNum, content: line.trim() });
    }
    if (line.includes('console.warn(')) {
        results.warn.push({ line: lineNum, content: line.trim() });
    }
    if (line.includes('console.info(')) {
        results.info.push({ line: lineNum, content: line.trim() });
    }
});

// Estatísticas
const total = results.log.length + results.error.length + results.warn.length + results.info.length;

console.log('📊 ESTATÍSTICAS:');
console.log(`   Total de console.*: ${total}`);
console.log(`   - console.log: ${results.log.length}`);
console.log(`   - console.error: ${results.error.length}`);
console.log(`   - console.warn: ${results.warn.length}`);
console.log(`   - console.info: ${results.info.length}`);
console.log('');

// Mostrar primeiras 10 ocorrências de cada tipo
console.log('📝 PRIMEIRAS 10 OCORRÊNCIAS DE console.log:');
results.log.slice(0, 10).forEach(item => {
    console.log(`   Linha ${item.line}: ${item.content.substring(0, 80)}...`);
});
if (results.log.length > 10) {
    console.log(`   ... e mais ${results.log.length - 10} ocorrências`);
}
console.log('');

console.log('📝 PRIMEIRAS 10 OCORRÊNCIAS DE console.error:');
results.error.slice(0, 10).forEach(item => {
    console.log(`   Linha ${item.line}: ${item.content.substring(0, 80)}...`);
});
if (results.error.length > 10) {
    console.log(`   ... e mais ${results.error.length - 10} ocorrências`);
}
console.log('');

console.log('📝 PRIMEIRAS 10 OCORRÊNCIAS DE console.warn:');
results.warn.slice(0, 10).forEach(item => {
    console.log(`   Linha ${item.line}: ${item.content.substring(0, 80)}...`);
});
if (results.warn.length > 10) {
    console.log(`   ... e mais ${results.warn.length - 10} ocorrências`);
}
console.log('');

// Sugestões
console.log('💡 SUGESTÕES DE SUBSTITUIÇÃO:');
console.log('   1. console.log → logger.info (informações gerais)');
console.log('   2. console.log → logger.debug (detalhes de debug)');
console.log('   3. console.error → logger.error (erros)');
console.log('   4. console.warn → logger.warn (avisos)');
console.log('');

console.log('✅ Análise concluída!');
console.log('📖 Consulte GUIA-MIGRACAO-LOGGING.md para instruções detalhadas.');

