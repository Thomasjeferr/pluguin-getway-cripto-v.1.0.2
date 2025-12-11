#!/usr/bin/env node

/**
 * Script de Validação de Templates EJS
 * 
 * Valida todos os templates EJS antes do deploy:
 * - Verifica sintaxe
 * - Testa renderização básica
 * - Detecta erros comuns
 * 
 * Uso: node validate-templates.js
 */

const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

// Cores para output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Diretório de views
const viewsDir = path.join(__dirname, 'views');
const partialsDir = path.join(viewsDir, 'partials');

// Dados mock para teste de renderização
const mockData = {
    config: {
        priceMonthly: 97,
        priceYearly: 997,
        trialDays: 7,
        promoText: 'Oferta de Lançamento'
    },
    licenses: [],
    products: [],
    allProducts: [],
    stats: {
        totalLicenses: 0,
        activeLicenses: 0,
        expiredTrialsCount: 0,
        expiringTrialsCount: 0,
        revenueByMonth: [],
        newClientsByMonth: [],
        planDistribution: { trial: 0, monthly: 0, yearly: 0 },
        totalRevenue: 0,
        totalPaidLicenses: 0,
        monthlyCount: 0,
        yearlyCount: 0,
        estimatedMonthlyRevenue: 0,
        revenueTrend: 0
    },
    search: '',
    filterStatus: 'all',
    filterPlan: 'all',
    filterProduct: 'all',
    filterAction: 'all',
    filterType: 'all',
    filterRead: 'all',
    currentPage: 1,
    totalPages: 1,
    pagination: {
        page: 1,
        totalPages: 1,
        limit: 50,
        totalActivities: 0,
        hasNext: false,
        hasPrev: false
    },
    activities: [],
    paidLicenses: [],
    payments: [],
    subscription: null,
    license_key: 'test-license-key-12345',
    email: 'test@example.com',
    license: {
        email: 'test@example.com',
        key: 'test-license-key-12345',
        active: true,
        plan: 'monthly',
        createdAt: new Date(),
        trialExpiresAt: null,
        planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        domain: 'example.com'
    },
    totalUnread: 0,
    notifications: [],
    notificationsMenu: {
        unread: [],
        totalUnread: 0
    },
    csrfToken: 'test-csrf-token-12345',
    user: {
        email: 'test@example.com',
        role: 'admin'
    }
};

// Função para encontrar todos os arquivos EJS
function findEjsFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            findEjsFiles(filePath, fileList);
        } else if (file.endsWith('.ejs')) {
            fileList.push(filePath);
        }
    });
    
    return fileList;
}

// Função para validar sintaxe EJS
function validateEjsSyntax(filePath) {
    const errors = [];
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(__dirname, filePath);
    
    // Verificar tags EJS não fechadas
    const openTags = (content.match(/<%/g) || []).length;
    const closeTags = (content.match(/%>/g) || []).length;
    
    if (openTags !== closeTags) {
        errors.push({
            type: 'syntax',
            message: `Tags EJS não balanceadas: ${openTags} abertas, ${closeTags} fechadas`,
            file: relativePath
        });
    }
    
    // Verificar tags de output não fechadas
    const outputOpen = (content.match(/<%=/g) || []).length;
    const outputClose = (content.match(/%>/g) || []).length;
    
    // Verificar tags de código não fechadas
    const codeOpen = (content.match(/<%[^=]/g) || []).length;
    
    // Verificar strings não terminadas em JavaScript dentro de EJS
    const jsBlocks = content.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
    jsBlocks.forEach((block, index) => {
        const scriptContent = block.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
        if (scriptContent && scriptContent[1]) {
            // Verificar strings não terminadas
            const singleQuotes = (scriptContent[1].match(/'/g) || []).length;
            const doubleQuotes = (scriptContent[1].match(/"/g) || []).length;
            
            // Verificar template literals não fechados
            const templateLiterals = scriptContent[1].match(/`/g) || [];
            if (templateLiterals.length % 2 !== 0) {
                errors.push({
                    type: 'syntax',
                    message: `Template literal não fechado no script ${index + 1}`,
                    file: relativePath
                });
            }
        }
    });
    
    // Verificar uso de innerHTML sem sanitização (vulnerabilidade XSS)
    const innerHTMLMatches = content.match(/\.innerHTML\s*=\s*[^;]+/g) || [];
    innerHTMLMatches.forEach((match, index) => {
        // Verificar se usa template literals (mais seguro) ou concatenação
        if (!match.includes('`') && !match.includes('textContent')) {
            errors.push({
                type: 'security',
                message: `Uso de innerHTML sem sanitização detectado (linha aproximada: ${index + 1})`,
                file: relativePath,
                code: match.substring(0, 100)
            });
        }
    });
    
    // Verificar erros comuns de CSS
    const cssErrors = content.match(/text-center\s*;/g) || [];
    if (cssErrors.length > 0) {
        errors.push({
            type: 'css',
            message: `CSS inválido encontrado: "text-center;" (deve ser "text-align: center;")`,
            file: relativePath
        });
    }
    
    return errors;
}

// Função para testar renderização
function testRender(filePath) {
    const errors = [];
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(__dirname, filePath);
    
    try {
        // Tentar renderizar com dados mock
        const rendered = ejs.render(content, mockData, {
            filename: filePath,
            views: [viewsDir, partialsDir],
            root: __dirname
        });
        
        // Verificar se renderizou algo
        if (!rendered || rendered.trim().length === 0) {
            errors.push({
                type: 'render',
                message: 'Template renderizou vazio',
                file: relativePath
            });
        }
        
    } catch (error) {
        errors.push({
            type: 'render',
            message: error.message,
            file: relativePath,
            stack: error.stack
        });
    }
    
    return errors;
}

// Função principal
function validateTemplates() {
    log('\n🔍 VALIDAÇÃO DE TEMPLATES EJS', 'cyan');
    log('='.repeat(50), 'cyan');
    
    // Encontrar todos os arquivos EJS
    const ejsFiles = findEjsFiles(viewsDir);
    
    if (ejsFiles.length === 0) {
        log('❌ Nenhum arquivo EJS encontrado!', 'red');
        process.exit(1);
    }
    
    log(`\n📁 Encontrados ${ejsFiles.length} arquivo(s) EJS:`, 'blue');
    ejsFiles.forEach(file => {
        log(`   - ${path.relative(__dirname, file)}`, 'reset');
    });
    
    // Validar cada arquivo
    let totalErrors = 0;
    let totalWarnings = 0;
    const allErrors = [];
    
    log('\n🔍 Validando templates...\n', 'blue');
    
    ejsFiles.forEach(filePath => {
        const relativePath = path.relative(__dirname, filePath);
        log(`Validando: ${relativePath}`, 'yellow');
        
        // Validar sintaxe
        const syntaxErrors = validateEjsSyntax(filePath);
        if (syntaxErrors.length > 0) {
            syntaxErrors.forEach(error => {
                log(`   ❌ [${error.type.toUpperCase()}] ${error.message}`, 'red');
                if (error.code) {
                    log(`      Código: ${error.code}`, 'red');
                }
                allErrors.push({ file: relativePath, ...error });
                totalErrors++;
            });
        }
        
        // Testar renderização
        const renderErrors = testRender(filePath);
        if (renderErrors.length > 0) {
            renderErrors.forEach(error => {
                log(`   ❌ [RENDER] ${error.message}`, 'red');
                allErrors.push({ file: relativePath, ...error });
                totalErrors++;
            });
        }
        
        if (syntaxErrors.length === 0 && renderErrors.length === 0) {
            log(`   ✅ OK`, 'green');
        }
    });
    
    // Resumo
    log('\n' + '='.repeat(50), 'cyan');
    log('\n📊 RESUMO DA VALIDAÇÃO', 'cyan');
    log('='.repeat(50), 'cyan');
    
    if (totalErrors === 0) {
        log(`\n✅ SUCESSO! Todos os ${ejsFiles.length} templates estão válidos!`, 'green');
        log('\n🎉 Pronto para deploy!', 'green');
        return 0;
    } else {
        log(`\n❌ ERRO! ${totalErrors} erro(s) encontrado(s) em ${ejsFiles.length} template(s)`, 'red');
        log('\n📋 Detalhes dos erros:', 'yellow');
        
        // Agrupar erros por arquivo
        const errorsByFile = {};
        allErrors.forEach(error => {
            if (!errorsByFile[error.file]) {
                errorsByFile[error.file] = [];
            }
            errorsByFile[error.file].push(error);
        });
        
        Object.keys(errorsByFile).forEach(file => {
            log(`\n📄 ${file}:`, 'yellow');
            errorsByFile[file].forEach(error => {
                log(`   - [${error.type.toUpperCase()}] ${error.message}`, 'red');
            });
        });
        
        log('\n⚠️  Corrija os erros antes de fazer deploy!', 'red');
        return 1;
    }
}

// Executar validação
if (require.main === module) {
    const exitCode = validateTemplates();
    process.exit(exitCode);
}

module.exports = { validateTemplates, validateEjsSyntax, testRender };

