/**
 * Script de Teste de Segurança
 * Testa as implementações de segurança do sistema
 */

const crypto = require('crypto');

// Simular bcrypt
let bcrypt = null;
try {
    bcrypt = require('bcrypt');
    console.log('✅ bcrypt instalado');
} catch (e) {
    console.log('❌ bcrypt não instalado');
}

// Simular express-validator
let expressValidator = null;
try {
    expressValidator = require('express-validator');
    console.log('✅ express-validator instalado');
} catch (e) {
    console.log('❌ express-validator não instalado');
}

// Simular csurf
let csurf = null;
try {
    csurf = require('csurf');
    console.log('✅ csurf instalado');
} catch (e) {
    console.log('❌ csurf não instalado');
}

console.log('\n=== TESTES DE SEGURANÇA ===\n');

// Teste 1: Hash de Senhas
console.log('1. Teste de Hash de Senhas:');
if (bcrypt) {
    (async () => {
        try {
            const testPassword = 'senha123';
            const hashed = await bcrypt.hash(testPassword, 10);
            const isValid = await bcrypt.compare(testPassword, hashed);
            const isInvalid = await bcrypt.compare('senhaErrada', hashed);
            
            console.log('   ✅ Hash gerado:', hashed.substring(0, 20) + '...');
            console.log('   ✅ Comparação correta:', isValid ? 'PASSOU' : 'FALHOU');
            console.log('   ✅ Comparação incorreta:', !isInvalid ? 'PASSOU' : 'FALHOU');
        } catch (e) {
            console.log('   ❌ Erro:', e.message);
        }
    })();
} else {
    console.log('   ⚠️ bcrypt não disponível - teste pulado');
}

// Teste 2: Escape de Regex
console.log('\n2. Teste de Sanitização de Regex:');
function escapeRegex(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }
    const maxLength = 100;
    const limitedStr = str.substring(0, maxLength);
    return limitedStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const testStrings = [
    'test@email.com',
    'test.*+?^${}()|[\\]',
    'a'.repeat(150), // String muito longa
    'normal-search'
];

testStrings.forEach(str => {
    const escaped = escapeRegex(str);
    const isSafe = !escaped.match(/[.*+?^${}()|[\]\\]/);
    const isLimited = escaped.length <= 100;
    console.log(`   ${isSafe && isLimited ? '✅' : '❌'} "${str.substring(0, 20)}..." -> "${escaped.substring(0, 20)}..."`);
});

// Teste 3: Hash Equals (Timing Safe)
console.log('\n3. Teste de hash_equals (Timing Safe):');
function hash_equals(str1, str2) {
    if (str1.length !== str2.length) {
        return false;
    }
    return crypto.timingSafeEqual(Buffer.from(str1), Buffer.from(str2));
}

const test1 = hash_equals('test', 'test');
const test2 = hash_equals('test', 'test2');
const test3 = hash_equals('abc', 'def');

console.log('   ✅ Comparação igual:', test1 ? 'PASSOU' : 'FALHOU');
console.log('   ✅ Comparação diferente (tamanho):', !test2 ? 'PASSOU' : 'FALHOU');
console.log('   ✅ Comparação diferente:', !test3 ? 'PASSOU' : 'FALHOU');

// Teste 4: Validação de Email
console.log('\n4. Teste de Validação de Email:');
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

const emails = [
    'test@example.com',
    'invalid-email',
    'test@domain',
    'user@domain.co.uk'
];

emails.forEach(email => {
    const isValid = isValidEmail(email);
    console.log(`   ${isValid ? '✅' : '❌'} "${email}": ${isValid ? 'VÁLIDO' : 'INVÁLIDO'}`);
});

// Teste 5: Mascaramento de Dados Sensíveis
console.log('\n5. Teste de Mascaramento de Dados:');
function maskLicenseKey(key) {
    return key.length > 8 
        ? key.substring(0, 4) + '***' + key.substring(key.length - 4)
        : '***';
}

function maskEmail(email, isProduction = false) {
    if (!isProduction) return email;
    const parts = email.split('@');
    if (parts.length !== 2) return '***';
    return parts[0].substring(0, 3) + '***@' + parts[1].substring(0, 3) + '***';
}

const testKey = 'LIVEX-ABCDEF1234567890';
const maskedKey = maskLicenseKey(testKey);
console.log(`   ✅ Chave: "${testKey}" -> "${maskedKey}"`);

const testEmail = 'usuario@exemplo.com';
const maskedEmail = maskEmail(testEmail, true);
console.log(`   ✅ Email (prod): "${testEmail}" -> "${maskedEmail}"`);

// Teste 6: Validação de Complexidade de Senha
console.log('\n6. Teste de Validação de Complexidade de Senha:');
function validatePasswordComplexity(password) {
    if (password.length < 12) return { valid: false, reason: 'Mínimo 12 caracteres' };
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!hasUpperCase) return { valid: false, reason: 'Falta letra maiúscula' };
    if (!hasLowerCase) return { valid: false, reason: 'Falta letra minúscula' };
    if (!hasNumbers) return { valid: false, reason: 'Falta número' };
    if (!hasSpecial) return { valid: false, reason: 'Falta caractere especial' };
    
    return { valid: true };
}

const passwords = [
    'SenhaForte123!@#',
    'senhafraca',
    'SENHAFORTE123!',
    'SenhaForte123',
    'SenhaForte!@#'
];

passwords.forEach(pwd => {
    const result = validatePasswordComplexity(pwd);
    console.log(`   ${result.valid ? '✅' : '❌'} "${pwd.substring(0, 15)}...": ${result.valid ? 'VÁLIDA' : result.reason}`);
});

// Teste 7: Detecção de Ambiente
console.log('\n7. Teste de Detecção de Ambiente:');
function detectEnvironment() {
    const isProduction = process.env.NODE_ENV === 'production' || 
                        (process.env.PORT && parseInt(process.env.PORT) !== 5000) ||
                        (process.env.MONGO_URI && !process.env.MONGO_URI.includes('localhost'));
    return isProduction;
}

const originalEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'production';
console.log('   ✅ Ambiente produção detectado:', detectEnvironment() ? 'SIM' : 'NÃO');

process.env.NODE_ENV = 'development';
console.log('   ✅ Ambiente desenvolvimento detectado:', !detectEnvironment() ? 'SIM' : 'NÃO');

process.env.NODE_ENV = originalEnv;

console.log('\n=== RESUMO DOS TESTES ===\n');
console.log('✅ Testes básicos de segurança executados');
console.log('✅ Verifique os resultados acima');
console.log('\n⚠️  Para testes completos, execute o servidor e teste as rotas manualmente');
console.log('⚠️  Ou configure Jest para testes automatizados');
