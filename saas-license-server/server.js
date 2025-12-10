const fs = require('fs');
const path = require('path');

// --- CARREGAMENTO MANUAL DO .ENV (SEM MÓDULO EXTERNO) ---
try {
    // Tenta ler .env primeiro, depois configuracao.env
    let envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        envPath = path.join(__dirname, 'configuracao.env');
    }
    
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const [key, ...valueParts] = trimmedLine.split('=');
                if (key && valueParts.length > 0) {
                    process.env[key.trim()] = valueParts.join('=').trim();
                }
            }
        });
        console.log('✅ Arquivo de configuração carregado com sucesso');
    } else {
        console.log('⚠️ Aviso: Arquivo .env ou configuracao.env não encontrado.');
    }
} catch (err) {
    console.log('⚠️ Erro ao ler configuração:', err.message);
}

// --- DEPENDÊNCIAS ---
const express = require('express');
const bodyParser = require('body-parser');
const AdmZip = require('adm-zip');
const session = require('express-session');
let cookieParser = null;
try {
    cookieParser = require('cookie-parser');
} catch (e) {
    console.log('⚠️ cookie-parser não instalado. Execute: npm install cookie-parser');
}
let stripe = null; // Será inicializado quando necessário

// Bcrypt para hash de senhas
let bcrypt = null;
try {
    bcrypt = require('bcrypt');
} catch (e) {
    console.log('⚠️ bcrypt não instalado. Execute: npm install bcrypt');
}

// CSRF Protection
let csrf = null;
try {
    csrf = require('csurf');
} catch (e) {
    console.log('⚠️ csurf não instalado. Execute: npm install csurf');
}

// Dependências de segurança e performance
let helmet = null;
let rateLimit = null;
let compression = null;
let body = null;
let validationResult = null;

// Rate limiters (serão inicializados se rateLimit estiver disponível)
let generalLimiter = null;
let loginLimiter = null;
let apiLimiter = null;

try {
    helmet = require('helmet');
} catch (e) {
    console.log('⚠️ Helmet não instalado. Execute: npm install helmet');
}

try {
    rateLimit = require('express-rate-limit');
} catch (e) {
    console.log('⚠️ express-rate-limit não instalado. Execute: npm install express-rate-limit');
}

try {
    compression = require('compression');
} catch (e) {
    console.log('⚠️ compression não instalado. Execute: npm install compression');
}

try {
    const expressValidator = require('express-validator');
    body = expressValidator.body;
    validationResult = expressValidator.validationResult;
    console.log('✅ express-validator carregado');
} catch (e) {
    console.log('⚠️ express-validator não instalado. Execute: npm install express-validator');
}

// Helper para validar e retornar erros
function validateRequest(req, res, next) {
    if (!validationResult) {
        console.log('⚠️ express-validator não disponível, pulando validação');
        return next(); // Se express-validator não estiver disponível, pular validação
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error('❌ Erros de validação:', errors.array());
        return res.status(400).json({ 
            success: false, 
            message: 'Dados inválidos: ' + errors.array().map(e => e.msg).join(', '),
            errors: errors.array() 
        });
    }
    next();
}

// --- VERIFICAR E INSTALAR MONGOOSE SE NECESSÁRIO ---
let mongoose;
try {
    mongoose = require('mongoose');
} catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
        console.log('❌ Mongoose não encontrado! Tentando instalar automaticamente...');
        const { execSync } = require('child_process');
        try {
            console.log('📦 Instalando mongoose...');
            execSync('npm install mongoose', { 
                stdio: 'inherit',
                cwd: __dirname,
                shell: true
            });
            console.log('✅ Mongoose instalado! Recarregando...');
            mongoose = require('mongoose');
        } catch (installErr) {
            console.error('❌ ERRO CRÍTICO: Não foi possível instalar mongoose automaticamente!');
            console.error('Por favor, execute manualmente: npm install mongoose');
            process.exit(1);
        }
    } else {
        throw err;
    }
}

// --- CONFIGURAÇÃO DO BANCO DE DADOS ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cryptosaas';

// Limpar URI se tiver appName vazio ou mal formatado
let cleanMongoUri = MONGO_URI;
// Remove appName vazio ou sem valor
cleanMongoUri = cleanMongoUri.replace(/[?&]appName=\s*/gi, '');
cleanMongoUri = cleanMongoUri.replace(/[?&]appName=$/gi, '');
// Limpa duplos ? ou &
cleanMongoUri = cleanMongoUri.replace(/\?\?/g, '?').replace(/&&/g, '&');
cleanMongoUri = cleanMongoUri.replace(/[?&]$/, '');

mongoose.connect(cleanMongoUri, {
    serverSelectionTimeoutMS: 10000, // Aumentado para 10 segundos
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 1,
})
    .then(() => {
        console.log('✅ MongoDB Conectado com Sucesso!');
        console.log('📊 Database:', mongoose.connection.db.databaseName);
        console.log('🔌 Estado da conexão:', mongoose.connection.readyState === 1 ? 'CONECTADO' : 'DESCONECTADO');
    })
    .catch(err => {
        console.error('❌ Erro ao conectar no MongoDB:', err.message);
        console.error('❌ Detalhes do erro:', err);
        console.log('⚠️ Servidor continuará rodando, mas sem banco de dados.');
        console.log('💡 Verifique:');
        console.log('   1. Se o MongoDB está rodando (local) ou acessível (Atlas)');
        console.log('   2. Se as credenciais estão corretas');
        console.log('   3. Se o IP está autorizado no MongoDB Atlas (se aplicável)');
    });

// --- MODELOS DE DADOS ---
const UserSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: function(v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: 'Email inválido'
        }
    },
    password: { type: String, required: true, minlength: 3 },
    role: { type: String, default: 'client', enum: ['client', 'admin'] },
    resetToken: { type: String, default: null },
    resetTokenExpires: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
});

// Índice para performance
UserSchema.index({ email: 1 });

const User = mongoose.model('User', UserSchema);

const LicenseSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: function(v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: 'Email inválido'
        }
    },
    key: { 
        type: String, 
        required: true,
        trim: true,
        validate: {
            validator: function(v) {
                return /^LIVEX-[A-Z0-9]+-[A-Z0-9]+$/.test(v);
            },
            message: 'Formato de chave de licença inválido'
        }
    },
    productId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product',
        default: null // null = produto padrão (compatibilidade com dados existentes)
    },
    productSlug: {
        type: String,
        default: 'binance-pix', // Slug padrão para compatibilidade
        lowercase: true,
        trim: true
    },
    domain: { 
        type: String, 
        default: null,
        lowercase: true,
        trim: true
    },
    active: { type: Boolean, default: true },
    plan: { 
        type: String, 
        default: 'trial',
        enum: ['trial', 'monthly', 'yearly']
    },
    stripeCustomerId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null },
    trialExpiresAt: { type: Date, default: null },
    planExpiresAt: { type: Date, default: null },
    notes: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Índices para performance (incluindo productId e productSlug)
LicenseSchema.index({ email: 1 });
LicenseSchema.index({ key: 1, productSlug: 1 }); // Chave única por produto
LicenseSchema.index({ domain: 1 });
LicenseSchema.index({ active: 1 });
LicenseSchema.index({ plan: 1 });
LicenseSchema.index({ productId: 1 });
LicenseSchema.index({ productSlug: 1 });
LicenseSchema.index({ createdAt: -1 });

// Índice composto para busca eficiente
LicenseSchema.index({ email: 1, productSlug: 1 });

const License = mongoose.model('License', LicenseSchema);

// Schema para histórico de atividades
const ActivityLogSchema = new mongoose.Schema({
    email: { type: String, required: true },
    action: { type: String, required: true }, // 'created', 'updated', 'plan_changed', 'activated', 'deactivated', etc.
    description: { type: String, required: true },
    adminUser: { type: String, default: 'system' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now }
});
const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);

// Schema para log de atividades do admin
const AdminActivityLogSchema = new mongoose.Schema({
    adminUser: { type: String, required: true },
    action: { type: String, required: true }, // 'login', 'logout', 'license_toggled', 'plan_changed', 'config_updated', etc.
    description: { type: String, required: true },
    targetEmail: { type: String, default: null }, // Email do cliente afetado (se aplicável)
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now }
});
const AdminActivityLog = mongoose.model('AdminActivityLog', AdminActivityLogSchema);

// Schema para notificações
const NotificationSchema = new mongoose.Schema({
    type: { type: String, required: true }, // 'payment_failed', 'trial_expiring', 'subscription_cancelled', etc.
    title: { type: String, required: true },
    message: { type: String, required: true },
    email: { type: String, default: null }, // Email do cliente afetado
    licenseId: { type: mongoose.Schema.Types.ObjectId, default: null },
    read: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now }
});
const Notification = mongoose.model('Notification', NotificationSchema);

// Schema para Produtos (suporte a múltiplos plugins)
const ProductSchema = new mongoose.Schema({
    slug: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true,
        trim: true
    },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    active: { type: Boolean, default: true },
    trialDays: { type: Number, default: 7 },
    priceMonthly: { type: Number, default: 97.00 },
    priceYearly: { type: Number, default: 997.00 },
    promoText: { type: String, default: "Oferta de Lançamento" },
    icon: { type: String, default: '' }, // URL ou nome do ícone
    order: { type: Number, default: 0 }, // Ordem de exibição
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Índices para performance
ProductSchema.index({ slug: 1 });
ProductSchema.index({ active: 1 });
ProductSchema.index({ order: 1 });

const Product = mongoose.model('Product', ProductSchema);

const ConfigSchema = new mongoose.Schema({
    trialDays: { type: Number, default: 7 },
    priceMonthly: { type: Number, default: 97.00 },
    priceYearly: { type: Number, default: 997.00 },
    promoText: { type: String, default: "Oferta de Lançamento" },
    emailConfig: {
        smtpHost: { type: String, default: '' },
        smtpPort: { type: Number, default: 587 },
        smtpSecure: { type: Boolean, default: false },
        smtpUser: { type: String, default: '' },
        smtpPassword: { type: String, default: '' },
        fromEmail: { type: String, default: '' }
    }
});
const Config = mongoose.model('Config', ConfigSchema);

async function initConfig() {
    try {
        const configCount = await Config.countDocuments();
        if (configCount === 0) await Config.create({});
        
        // Criar produto padrão se não existir (compatibilidade com sistema existente)
        const productCount = await Product.countDocuments();
        if (productCount === 0) {
            const defaultProduct = await Product.create({
                slug: 'binance-pix',
                name: 'Plugin Binance Pix / USDT',
                description: 'Plugin WooCommerce para pagamentos via Pix com conversão para USDT',
                active: true,
                trialDays: 7,
                priceMonthly: 97.00,
                priceYearly: 997.00,
                promoText: 'Oferta de Lançamento',
                order: 0
            });
            console.log('✅ Produto padrão criado:', defaultProduct.slug);
        }
    } catch (e) { 
        console.error('Erro ao inicializar configuração:', e.message);
    }
}
mongoose.connection.once('open', initConfig);

// --- SERVIDOR ---
const app = express();

// Função hash_equals (comparação segura contra timing attacks)
const crypto = require('crypto');
function hash_equals(str1, str2) {
    // Garantir que ambos são strings
    if (typeof str1 !== 'string' || typeof str2 !== 'string') {
        return false;
    }
    
    // Se os tamanhos forem diferentes, retornar false imediatamente
    if (str1.length !== str2.length) {
        return false;
    }
    
    // Se ambos forem vazios, considerar iguais
    if (str1.length === 0 && str2.length === 0) {
        return false; // Não permitir strings vazias
    }
    
    try {
        return crypto.timingSafeEqual(Buffer.from(str1, 'utf8'), Buffer.from(str2, 'utf8'));
    } catch (e) {
        // Fallback para comparação normal se houver erro
        console.error('Erro em hash_equals:', e.message);
        return str1 === str2;
    }
}

// Função para hash de senha (compatibilidade com senhas antigas em texto plano)
async function hashPassword(password) {
    if (!bcrypt) {
        console.warn('⚠️ bcrypt não disponível, senha será armazenada em texto plano (NÃO RECOMENDADO)');
        return password; // Fallback inseguro - apenas para desenvolvimento
    }
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

// Função para comparar senha (suporta senhas antigas em texto plano e novas hasheadas)
async function comparePassword(plainPassword, hashedPassword) {
    if (!bcrypt) {
        // Fallback inseguro - apenas para desenvolvimento
        return plainPassword === hashedPassword;
    }
    
    // Se a senha armazenada não começa com $2a$, $2b$ ou $2y$ (formato bcrypt), 
    // é uma senha antiga em texto plano - comparar diretamente (migração gradual)
    if (!hashedPassword.startsWith('$2')) {
        const matches = plainPassword === hashedPassword;
        // Se a senha antiga estiver correta, atualizar para hash (migração automática)
        if (matches && hashedPassword.length < 60) { // Senhas bcrypt têm ~60 caracteres
            // Não atualizamos aqui para evitar dependência circular - será feito no login
        }
        return matches;
    }
    
    // Senha já está hasheada - usar bcrypt.compare
    return await bcrypt.compare(plainPassword, hashedPassword);
}

// Função para escapar caracteres especiais em regex (proteção contra ReDoS)
function escapeRegex(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }
    // Limitar comprimento para evitar strings muito longas
    const maxLength = 100;
    const limitedStr = str.substring(0, maxLength);
    // Escapar caracteres especiais do regex
    return limitedStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Credenciais Admin - Carregar de variáveis de ambiente (SEGURANÇA)
// Detectar ambiente (produção se NODE_ENV=production ou se não estiver em localhost)
// Detecção mais restritiva de ambiente de produção
// Só considera produção se NODE_ENV estiver explicitamente definido como 'production'
const isProductionEnv = process.env.NODE_ENV === 'production';

// Ler valores do ambiente (podem ser undefined)
let ADMIN_USER = process.env.ADMIN_USER;
let ADMIN_PASS = process.env.ADMIN_PASS;

// Valores padrão para desenvolvimento
const devAdminUser = 'master_root_v1';
const devAdminPass = 'X7#k9$mP2@secure_v9';

// Em produção, forçar erro se credenciais não estiverem definidas
if (isProductionEnv) {
    if (!ADMIN_USER || !ADMIN_PASS || ADMIN_USER.trim() === '' || ADMIN_PASS.trim() === '') {
        console.error('❌ ERRO CRÍTICO: ADMIN_USER e ADMIN_PASS devem estar definidos em produção!');
        console.error('❌ Configure as variáveis de ambiente antes de iniciar o servidor.');
        console.error('❌ Crie um arquivo .env com:');
        console.error('   ADMIN_USER=seu_usuario_admin_seguro');
        console.error('   ADMIN_PASS=sua_senha_muito_segura_aqui');
        process.exit(1);
    }
    
    // Validar complexidade da senha admin em produção
    if (ADMIN_PASS.length < 12) {
        console.error('❌ ERRO: Senha admin deve ter pelo menos 12 caracteres em produção!');
        process.exit(1);
    }
    
    // Verificar se senha contém caracteres especiais, números e letras
    const hasUpperCase = /[A-Z]/.test(ADMIN_PASS);
    const hasLowerCase = /[a-z]/.test(ADMIN_PASS);
    const hasNumbers = /\d/.test(ADMIN_PASS);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(ADMIN_PASS);
    
    if (!(hasUpperCase && hasLowerCase && hasNumbers && hasSpecial)) {
        console.error('❌ ERRO: Senha admin deve conter letras maiúsculas, minúsculas, números e caracteres especiais!');
        process.exit(1);
    }
    
    console.log('✅ Credenciais admin validadas para produção');
} else {
    // Em desenvolvimento, usar valores padrão se não estiverem definidos
    if (!ADMIN_USER || ADMIN_USER.trim() === '') {
        ADMIN_USER = devAdminUser;
        process.env.ADMIN_USER = devAdminUser;
        console.warn('⚠️  AVISO: ADMIN_USER não definido, usando valor padrão: ' + devAdminUser);
    }
    
    if (!ADMIN_PASS || ADMIN_PASS.trim() === '') {
        ADMIN_PASS = devAdminPass;
        process.env.ADMIN_PASS = devAdminPass;
        console.warn('⚠️  AVISO: ADMIN_PASS não definido, usando valor padrão');
    }
    
    console.warn('⚠️  Modo desenvolvimento - Configure ADMIN_USER e ADMIN_PASS para produção!');
    console.warn('⚠️  Usuário padrão: ' + ADMIN_USER);
}

// Variáveis finais (garantir que sempre tenham valores)
const FINAL_ADMIN_USER = ADMIN_USER || devAdminUser;
const FINAL_ADMIN_PASS = ADMIN_PASS || devAdminPass;

// Log de inicialização (mascarado para segurança)
if (FINAL_ADMIN_USER) {
    const maskedUser = FINAL_ADMIN_USER.length > 2 
        ? FINAL_ADMIN_USER.substring(0, 2) + '***' + FINAL_ADMIN_USER.substring(FINAL_ADMIN_USER.length - 1)
        : '***';
    console.log('✅ Credenciais admin carregadas - Usuário:', maskedUser);
    if (!isProductionEnv) {
        console.log('   📝 Usuário completo (apenas em dev):', FINAL_ADMIN_USER);
    }
} else {
    console.error('❌ ERRO CRÍTICO: ADMIN_USER não está definido!');
}

if (FINAL_ADMIN_PASS) {
    console.log('✅ Senha admin carregada (tamanho:', FINAL_ADMIN_PASS.length, 'caracteres)');
    if (!isProductionEnv) {
        console.log('   📝 Senha completa (apenas em dev):', FINAL_ADMIN_PASS);
    }
} else {
    console.error('❌ ERRO CRÍTICO: ADMIN_PASS não está definido!');
}

const viewsPath = path.join(__dirname, 'views');
app.set('view engine', 'ejs');
app.set('views', viewsPath);

// Sistema de métricas básico
const metricsCollector = require('./utils/metrics');

// Middleware para coletar métricas
app.use((req, res, next) => {
    const startTime = Date.now();
    
    // Interceptar res.end para medir tempo de resposta
    const originalEnd = res.end;
    res.end = function(...args) {
        const responseTime = Date.now() - startTime;
        metricsCollector.recordRequest(req.path, res.statusCode, responseTime);
        originalEnd.apply(res, args);
    };
    
    next();
});

// --- PERFORMANCE: Compression (Compressão de Respostas HTTP) ---
if (compression) {
    app.use(compression({
        filter: (req, res) => {
            // Comprimir apenas se cliente suporta
            if (req.headers['x-no-compression']) {
                return false;
            }
            return compression.filter(req, res);
        },
        level: 6 // Nível de compressão (0-9, 6 é um bom equilíbrio)
    }));
    console.log('✅ Compression ativado - Respostas HTTP serão comprimidas');
} else {
    console.warn('⚠️ Compression não está instalado. Recomenda-se instalar para melhor performance.');
}

// --- SEGURANÇA: Helmet.js (Headers de Segurança) ---
if (helmet) {
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
                scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
                scriptSrcAttr: ["'unsafe-inline'"], // Permitir event handlers inline (onclick, etc)
                fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "https://cdn.jsdelivr.net"] // Permitir conexões para CDN (Chart.js source maps)
            }
        },
        crossOriginEmbedderPolicy: false // Necessário para Chart.js
    }));
    console.log('✅ Helmet.js ativado - Headers de segurança configurados');
} else {
    console.warn('⚠️ Helmet.js não está instalado. Recomenda-se instalar para melhor segurança.');
}

// --- SEGURANÇA: Rate Limiting ---
if (rateLimit) {
    // Rate limiter geral (aplicado a todas as rotas)
    generalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutos
        max: 100, // Limite de 100 requisições por IP a cada 15 minutos
        message: 'Muitas requisições deste IP. Por favor, tente novamente mais tarde.',
        standardHeaders: true,
        legacyHeaders: false,
    });
    
    // Rate limiter mais restritivo para login
    loginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutos
        max: 5, // Apenas 5 tentativas de login por IP a cada 15 minutos
        message: 'Muitas tentativas de login. Por favor, tente novamente em 15 minutos.',
        skipSuccessfulRequests: true, // Não contar tentativas bem-sucedidas
        standardHeaders: true,
        legacyHeaders: false,
    });
    
    // Rate limiter para API de validação
    apiLimiter = rateLimit({
        windowMs: 60 * 1000, // 1 minuto
        max: 30, // 30 requisições por minuto por IP
        message: 'Muitas requisições de validação. Por favor, aguarde um momento.',
        standardHeaders: true,
        legacyHeaders: false,
    });
    
    // Aplicar rate limiting geral a todas as rotas
    app.use(generalLimiter);
    
    console.log('✅ Rate limiting ativado');
} else {
    console.warn('⚠️ express-rate-limit não está instalado. Recomenda-se instalar para proteção contra abuso.');
}

// Webhook do Stripe precisa vir ANTES do bodyParser (usa raw body)
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let config;
    try {
        config = await Config.findOne();
    } catch (e) {
        return res.status(500).send('Erro ao buscar configuração');
    }
    
    if (!config || !config.stripeWebhookSecret) {
        return res.status(400).send('Webhook secret não configurado');
    }

    if (!stripe && config.stripeSecretKey) {
        stripe = require('stripe')(config.stripeSecretKey);
    }

    if (!stripe) {
        return res.status(400).send('Stripe não configurado');
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, config.stripeWebhookSecret);
    } catch (err) {
        console.error('Erro no webhook:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Processar eventos
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const email = session.customer_email || session.metadata?.email;
        const plan = session.metadata?.plan || 'monthly';

        try {
            const config = await Config.findOne();
            const trialDays = config ? (config.trialDays || 7) : 7;
            
            // Determinar produto do metadata
            const productSlug = event.data.object.metadata?.product || event.data.object.metadata?.plugin_slug || 'binance-pix';
            const product = await Product.findOne({ slug: productSlug, active: true }) || 
                           await Product.findOne({ slug: 'binance-pix' });
            
            let license = await License.findOne({ email, productSlug: productSlug });
            if (!license) {
                // Calcular data de expiração
                const trialDays = product ? (product.trialDays || 7) : 7;
                let trialExpiresAt = null;
                let planExpiresAt = null;
                
                if (plan === 'trial') {
                    trialExpiresAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
                } else if (plan === 'monthly') {
                    planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                } else if (plan === 'yearly') {
                    planExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
                }
                
                license = await License.create({
                    email,
                    key: generateLicenseKey(),
                    productId: product ? product._id : null,
                    productSlug: productSlug,
                    plan,
                    active: true,
                    trialExpiresAt,
                    planExpiresAt,
                    stripeCustomerId: session.customer || null,
                    stripeSubscriptionId: session.subscription || null
                });
                
                // Registrar atividade
                await ActivityLog.create({
                    email,
                    action: 'created',
                    description: `Licença criada via Stripe - Plano: ${plan}`,
                    adminUser: 'system',
                    metadata: { plan, source: 'stripe_webhook' }
                });
                
                // Enviar email com chave de licença
                await sendLicenseEmail(email, license.key, plan);
            } else {
                // Atualizar produto se mudou (upgrade de produto)
                if (productSlug && license.productSlug !== productSlug) {
                    license.productId = product ? product._id : null;
                    license.productSlug = productSlug;
                }
                
                const oldPlan = license.plan;
                license.plan = plan;
                license.active = true;
                license.updatedAt = new Date();
                
                // Atualizar datas de expiração
                if (plan === 'trial') {
                    license.trialExpiresAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
                    license.planExpiresAt = null;
                } else if (plan === 'monthly') {
                    license.planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    license.trialExpiresAt = null;
                } else if (plan === 'yearly') {
                    license.planExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
                    license.trialExpiresAt = null;
                }
                
                license.stripeCustomerId = session.customer || license.stripeCustomerId;
                license.stripeSubscriptionId = session.subscription || license.stripeSubscriptionId;
                
                await license.save();
                
        // Registrar atividade se plano mudou ou produto mudou
        if (oldPlan !== plan || (productSlug && license.productSlug !== productSlug)) {
                    await ActivityLog.create({
                        email,
                        action: 'plan_changed',
                        description: `Plano alterado de ${oldPlan} para ${plan} via Stripe`,
                        adminUser: 'system',
                        metadata: { oldPlan, newPlan: plan, source: 'stripe_webhook' }
                    });
                    
                    // Enviar email quando plano é atualizado
                    await sendLicenseEmail(email, license.key, plan, license.planExpiresAt);
                }
            }
            console.log(`✅ Licença criada/atualizada via webhook para: ${email}`);
        } catch (e) {
            console.error('Erro ao processar webhook:', e);
        }
    }

    if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object;
        // Aqui você pode desativar a licença se necessário
        console.log(`⚠️ Assinatura cancelada: ${subscription.id}`);
        
        // Buscar licença pelo subscription ID
        const license = await License.findOne({ stripeSubscriptionId: subscription.id });
        if (license) {
            // Criar notificação
            await Notification.create({
                type: 'subscription_cancelled',
                title: 'Assinatura Cancelada',
                message: `A assinatura do cliente ${license.email} foi cancelada no Stripe.`,
                email: license.email,
                licenseId: license._id,
                metadata: { subscriptionId: subscription.id }
            });
        }
    }

    // Detectar pagamento falhado
    if (event.type === 'invoice.payment_failed') {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        
        console.log(`⚠️ Pagamento falhado para cliente: ${customerId}`);
        
        // Buscar licença pelo customer ID
        const license = await License.findOne({ stripeCustomerId: customerId });
        if (license) {
            // Criar notificação
            await Notification.create({
                type: 'payment_failed',
                title: 'Pagamento Falhado',
                message: `Falha no pagamento do cliente ${license.email}. Valor: R$ ${(invoice.amount_due / 100).toFixed(2)}.`,
                email: license.email,
                licenseId: license._id,
                metadata: { 
                    invoiceId: invoice.id,
                    amount: invoice.amount_due,
                    attemptCount: invoice.attempt_count
                }
            });
            
            // Opcional: desativar licença após múltiplas tentativas
            if (invoice.attempt_count >= 3) {
                license.active = false;
                license.updatedAt = new Date();
                await license.save();
                
                await Notification.create({
                    type: 'license_deactivated',
                    title: 'Licença Desativada',
                    message: `Licença do cliente ${license.email} foi desativada após 3 tentativas de pagamento falhadas.`,
                    email: license.email,
                    licenseId: license._id,
                    metadata: { reason: 'payment_failed_multiple_attempts' }
                });
            }
        }
    }

    // Detectar tentativa de cobrança (retry)
    if (event.type === 'invoice.payment_action_required') {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        
        const license = await License.findOne({ stripeCustomerId: customerId });
        if (license) {
            await Notification.create({
                type: 'payment_action_required',
                title: 'Ação Requerida no Pagamento',
                message: `O cliente ${license.email} precisa realizar uma ação para completar o pagamento.`,
                email: license.email,
                licenseId: license._id,
                metadata: { invoiceId: invoice.id }
            });
        }
    }

    res.json({ received: true });
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir arquivos estáticos (CSS, JS, imagens)
app.use(express.static('public'));
console.log('✅ Pasta "public" configurada para servir arquivos estáticos');

// Cookie Parser (OBRIGATÓRIO antes de sessão e CSRF)
if (cookieParser) {
    app.use(cookieParser());
} else {
    console.warn('⚠️ cookie-parser não está disponível. CSRF pode não funcionar corretamente.');
}

// Configuração de sessão
app.use(session({
    secret: process.env.SESSION_SECRET || 'DEV_SECRET',
    resave: false,
    saveUninitialized: false, // Não criar sessão para requisições sem autenticação
    cookie: { 
        secure: isProductionEnv, // true em produção (requer HTTPS)
        httpOnly: true, // Prevenir acesso via JavaScript
        sameSite: 'strict', // Proteção adicional contra CSRF
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// CSRF Protection (após cookie parser e session middleware)
if (csrf) {
    // Criar instância do CSRF para gerar tokens (sem validação)
    const csrfTokenGenerator = csrf({ 
        cookie: false // Usar sessão ao invés de cookie
    });
    
    // Criar instância do CSRF para validação
    const csrfProtection = csrf({ 
        cookie: false, // Usar sessão ao invés de cookie - mais simples e compatível
        // Aceitar token vindo do header ou do body (para chamadas AJAX com JSON)
        value: (req) => {
            return req.body._csrf
                || req.headers['x-csrf-token']
                || req.headers['csrf-token']
                || req.headers['x-xsrf-token'];
        }
    });
    
    // Middleware para disponibilizar token CSRF em todas as views
    // Aplica o gerador de token em todas as requisições (exceto webhooks)
    app.use((req, res, next) => {
        if (req.path === '/webhook/stripe') {
            return next();
        }
        // Aplicar gerador de token (não valida, apenas gera)
        csrfTokenGenerator(req, res, () => {
            // Token agora está disponível em req.csrfToken()
            if (req.csrfToken) {
                res.locals.csrfToken = req.csrfToken();
            }
            next();
        });
    });
    
    // Aplicar validação CSRF apenas em métodos que modificam dados
    app.use((req, res, next) => {
        // Excluir webhooks do Stripe (já validados com HMAC)
        if (req.path === '/webhook/stripe') {
            return next();
        }
        
        // Aplicar CSRF apenas em métodos que modificam dados
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
            return csrfProtection(req, res, next);
        }
        
        next();
    });
    
    console.log('✅ CSRF Protection ativado');
} else {
    console.warn('⚠️ CSRF Protection não está disponível. Execute: npm install csurf');
}

// --- MIDDLEWARES ---
// Função auxiliar para registrar atividade do admin
async function logAdminActivity(req, action, description, targetEmail = null, metadata = {}) {
    try {
        await AdminActivityLog.create({
            adminUser: req.session?.user || 'unknown',
            action,
            description,
            targetEmail,
            ipAddress: req.ip || req.connection?.remoteAddress || null,
            userAgent: req.get('user-agent') || null,
            metadata
        });
    } catch (e) {
        console.error('Erro ao registrar atividade do admin:', e);
    }
}

function requireAuth(req, res, next) {
    if (req.session && req.session.user) return next();
    res.redirect('/acesso-admin');
}

function requireAdmin(req, res, next) {
    const isAdmin = req.session && req.session.user === FINAL_ADMIN_USER;
    
    if (isAdmin) return next();

    // Se for requisição AJAX/JSON, retornar 401 em vez de redirect
    const wantsJson = req.xhr || req.headers.accept?.includes('application/json');
    if (wantsJson) {
        return res.status(401).json({ success: false, message: 'Não autenticado. Faça login novamente.' });
    }

    res.redirect('/acesso-admin');
}

function generateLicenseKey() {
    return 'LIVEX-' + Math.random().toString(36).substr(2, 9).toUpperCase() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Função para enviar email com chave de licença
async function sendLicenseEmail(email, licenseKey, plan, expiresAt = null) {
    try {
        // Verificar se nodemailer está disponível
        let nodemailer;
        try {
            nodemailer = require('nodemailer');
        } catch (e) {
            console.log('⚠️ Nodemailer não instalado. Emails não serão enviados.');
            console.log('📧 Para habilitar emails, instale: npm install nodemailer');
            return;
        }
        
        // Buscar configuração de email (se existir)
        const config = await Config.findOne();
        if (!config || !config.emailConfig || !config.emailConfig.smtpHost || !config.emailConfig.smtpUser) {
            // Se não houver configuração de email, apenas logar
            // Log sem expor a chave completa (apenas primeiros e últimos caracteres)
        const maskedKey = licenseKey.length > 8 
            ? licenseKey.substring(0, 4) + '***' + licenseKey.substring(licenseKey.length - 4)
            : '***';
        console.log(`📧 [Email não configurado] Chave de licença para ${email}: ${maskedKey}`);
            return;
        }
        
        const emailConfig = config.emailConfig;
        
        // Verificar se senha está configurada
        if (!emailConfig.smtpPassword || emailConfig.smtpPassword.trim() === '') {
            // Log sem expor a chave completa
            const maskedKey = licenseKey.length > 8 
                ? licenseKey.substring(0, 4) + '***' + licenseKey.substring(licenseKey.length - 4)
                : '***';
            console.log(`📧 [Email não configurado - senha faltando] Chave de licença para ${email}: ${maskedKey}`);
            return;
        }
        
        // Criar transporter
        const transporter = nodemailer.createTransport({
            host: emailConfig.smtpHost || 'smtp.gmail.com',
            port: emailConfig.smtpPort || 587,
            secure: emailConfig.smtpSecure || false,
            auth: {
                user: emailConfig.smtpUser,
                pass: emailConfig.smtpPassword
            }
        });
        
        // Determinar tipo de email
        let subject, htmlContent;
        const planNames = {
            'trial': 'Trial Grátis',
            'monthly': 'Plano Mensal',
            'yearly': 'Plano Anual'
        };
        
        if (plan === 'trial' && expiresAt) {
            const expiresDate = new Date(expiresAt).toLocaleDateString('pt-BR');
            subject = 'Sua Chave de Licença Trial - Plugin Cripto Woocommerce';
            htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #F0B90B 0%, #d4a50a 100%); color: #000; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                        .license-key { background: #fff; border: 2px solid #F0B90B; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 18px; font-weight: bold; text-align: center; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🎉 Bem-vindo ao Plugin Cripto Woocommerce!</h1>
                        </div>
                        <div class="content">
                            <p>Olá!</p>
                            <p>Sua chave de licença <strong>Trial</strong> foi gerada com sucesso!</p>
                            <p><strong>Chave de Licença:</strong></p>
                            <div class="license-key">${licenseKey}</div>
                            <p><strong>Plano:</strong> ${planNames[plan] || plan}</p>
                            <p><strong>Expira em:</strong> ${expiresDate}</p>
                            <p>Por favor, copie esta chave e cole nas configurações do plugin no seu WordPress.</p>
                            <p>Se você tiver alguma dúvida, entre em contato conosco.</p>
                        </div>
                        <div class="footer">
                            <p>Plugin Cripto Woocommerce - Sistema de Licenças</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
        } else {
            // Email para planos pagos (monthly/yearly)
            const expiresDate = expiresAt ? new Date(expiresAt).toLocaleDateString('pt-BR') : null;
            subject = '✅ Pagamento Aprovado - Sua Licença Está Ativa!';
            htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #F0B90B 0%, #d4a50a 100%); color: #000; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
                        .header h1 { margin: 0; font-size: 24px; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                        .license-key { background: #fff; border: 2px solid #F0B90B; padding: 20px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; text-align: center; margin: 20px 0; color: #000; word-break: break-all; }
                        .info-box { background: #e8f4f8; border-left: 4px solid #58a6ff; padding: 15px; margin: 20px 0; border-radius: 4px; }
                        .btn-cta { display: inline-block; background: #F0B90B; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; padding-top: 20px; border-top: 1px solid #ddd; }
                        .plan-badge { display: inline-block; background: #238636; color: #fff; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-left: 10px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🎉 Pagamento Aprovado!</h1>
                            <p style="margin: 10px 0 0 0; font-size: 16px;">Sua licença está ativa e pronta para uso</p>
                        </div>
                        <div class="content">
                            <p>Olá!</p>
                            <p>É com grande prazer que informamos que <strong>seu pagamento foi aprovado com sucesso!</strong></p>
                            
                            <div class="info-box">
                                <p style="margin: 0;"><strong>📦 Plano Ativo:</strong> ${planNames[plan] || plan}${expiresDate ? ` <span class="plan-badge">Válido até ${expiresDate}</span>` : ''}</p>
                            </div>
                            
                            <p><strong>🔑 Sua Chave de Licença:</strong></p>
                            <div class="license-key">${licenseKey}</div>
                            
                            <p><strong>📝 Próximos Passos:</strong></p>
                            <ol style="padding-left: 20px;">
                                <li>Copie a chave de licença acima</li>
                                <li>Acesse o painel do WordPress</li>
                                <li>Vá em <strong>WooCommerce → Configurações → Pagamentos → Binance Pay</strong></li>
                                <li>Cole a chave no campo "Chave de Licença"</li>
                                <li>Salve as configurações</li>
                            </ol>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="#" class="btn-cta" style="color: #000; text-decoration: none;">Acessar Minha Conta</a>
                            </div>
                            
                            <p style="margin-top: 30px;">Se você tiver alguma dúvida ou precisar de suporte, estamos à disposição!</p>
                            
                            <p>Atenciosamente,<br><strong>Equipe Plugin Cripto Woocommerce</strong></p>
                        </div>
                        <div class="footer">
                            <p>Plugin Cripto Woocommerce - Sistema de Licenças</p>
                            <p style="font-size: 11px; color: #999;">Este é um email automático, por favor não responda.</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
        }
        
        // Enviar email
        await transporter.sendMail({
            from: emailConfig.fromEmail || emailConfig.smtpUser,
            to: email,
            subject: subject,
            html: htmlContent
        });
        
        // Log sem expor email completo em produção
        const maskedEmail = isProductionEnv && email 
            ? email.substring(0, 3) + '***@' + email.split('@')[1]?.substring(0, 3) + '***'
            : email;
        console.log(`✅ Email enviado com sucesso para: ${maskedEmail}`);
    } catch (error) {
        console.error('❌ Erro ao enviar email:', error.message);
        // Não falhar o processo se email falhar
    }
}

// Função para enviar email de aviso de trial expirando
async function sendTrialExpiringEmail(email, licenseKey, daysUntilExpiry, expiresAt) {
    try {
        // Verificar se nodemailer está disponível
        let nodemailer;
        try {
            nodemailer = require('nodemailer');
        } catch (e) {
            console.log('⚠️ Nodemailer não instalado. Emails não serão enviados.');
            return;
        }
        
        // Buscar configuração de email
        const config = await Config.findOne();
        if (!config || !config.emailConfig || !config.emailConfig.smtpHost || !config.emailConfig.smtpUser || !config.emailConfig.smtpPassword) {
            const maskedEmail = isProductionEnv 
                ? email.substring(0, 3) + '***@' + email.split('@')[1]?.substring(0, 3) + '***'
                : email;
            console.log(`📧 [Email não configurado] Aviso de trial expirando para ${maskedEmail} em ${daysUntilExpiry} dia(s)`);
            return;
        }
        
        const emailConfig = config.emailConfig;
        
        // Criar transporter
        const transporter = nodemailer.createTransport({
            host: emailConfig.smtpHost || 'smtp.gmail.com',
            port: emailConfig.smtpPort || 587,
            secure: emailConfig.smtpSecure || false,
            auth: {
                user: emailConfig.smtpUser,
                pass: emailConfig.smtpPassword
            }
        });
        
        const expiresDate = new Date(expiresAt).toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        let urgencyText = '';
        let urgencyColor = '#d29922';
        if (daysUntilExpiry === 0) {
            urgencyText = 'HOJE';
            urgencyColor = '#f85149';
        } else if (daysUntilExpiry === 1) {
            urgencyText = 'AMANHÃ';
            urgencyColor = '#f85149';
        } else if (daysUntilExpiry <= 3) {
            urgencyText = 'EM BREVE';
            urgencyColor = '#d29922';
        }
        
        const subject = daysUntilExpiry === 0 
            ? '⚠️ Seu Trial Expira Hoje! - Ação Necessária'
            : daysUntilExpiry === 1
            ? '⚠️ Seu Trial Expira Amanhã! - Renove Agora'
            : `⏰ Seu Trial Expira em ${daysUntilExpiry} Dias - Renove Agora`;
        
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, ${urgencyColor} 0%, ${daysUntilExpiry <= 1 ? '#c93c37' : '#b8860b'} 100%); color: #fff; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .header h1 { margin: 0; font-size: 24px; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .warning-box { background: #fff3cd; border: 2px solid ${urgencyColor}; padding: 20px; border-radius: 6px; margin: 20px 0; }
                    .warning-box h2 { margin: 0 0 10px 0; color: ${urgencyColor}; font-size: 20px; }
                    .expiry-date { background: #fff; border: 2px solid ${urgencyColor}; padding: 15px; border-radius: 6px; text-align: center; margin: 20px 0; }
                    .expiry-date .date { font-size: 24px; font-weight: bold; color: ${urgencyColor}; }
                    .license-key { background: #fff; border: 2px solid #F0B90B; padding: 15px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 16px; font-weight: bold; text-align: center; margin: 20px 0; color: #000; word-break: break-all; }
                    .btn-cta { display: inline-block; background: #F0B90B; color: #000; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; font-size: 16px; }
                    .benefits { background: #e8f4f8; border-left: 4px solid #58a6ff; padding: 15px; margin: 20px 0; border-radius: 4px; }
                    .benefits ul { margin: 10px 0; padding-left: 20px; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; padding-top: 20px; border-top: 1px solid #ddd; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>⏰ Seu Trial Está Expirando!</h1>
                        ${urgencyText ? `<p style="margin: 10px 0 0 0; font-size: 18px; font-weight: bold;">EXPIRA ${urgencyText}!</p>` : ''}
                    </div>
                    <div class="content">
                        <p>Olá!</p>
                        <p>Queremos avisar que <strong>seu período de trial está próximo do fim</strong>.</p>
                        
                        <div class="warning-box">
                            <h2>⚠️ Atenção</h2>
                            <p style="margin: 0;">
                                ${daysUntilExpiry === 0 
                                    ? 'Seu trial <strong>expira hoje</strong>! Para continuar usando o plugin sem interrupções, renove agora.'
                                    : daysUntilExpiry === 1
                                    ? 'Seu trial <strong>expira amanhã</strong>! Renove hoje para garantir continuidade.'
                                    : `Seu trial <strong>expira em ${daysUntilExpiry} dias</strong>. Renove agora e garanta continuidade do serviço.`
                                }
                            </p>
                        </div>
                        
                        <div class="expiry-date">
                            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Data de Expiração</div>
                            <div class="date">${expiresDate}</div>
                        </div>
                        
                        <p><strong>🔑 Sua Chave de Licença Atual:</strong></p>
                        <div class="license-key">${licenseKey}</div>
                        
                        <div class="benefits">
                            <p style="margin: 0 0 10px 0;"><strong>✨ Ao renovar, você mantém:</strong></p>
                            <ul>
                                <li>Acesso completo ao plugin</li>
                                <li>Suporte prioritário</li>
                                <li>Atualizações automáticas</li>
                                <li>Mesma chave de licença</li>
                                <li>Sem interrupção do serviço</li>
                            </ul>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/comprar" class="btn-cta" style="color: #000; text-decoration: none;">
                                🔄 Renovar Agora
                            </a>
                        </div>
                        
                        <p style="margin-top: 30px; font-size: 14px; color: #666;">
                            <strong>💡 Dica:</strong> Renove antes da expiração para evitar qualquer interrupção no funcionamento do plugin em sua loja.
                        </p>
                        
                        <p>Se você tiver alguma dúvida ou precisar de ajuda, estamos à disposição!</p>
                        
                        <p>Atenciosamente,<br><strong>Equipe Plugin Cripto Woocommerce</strong></p>
                    </div>
                    <div class="footer">
                        <p>Plugin Cripto Woocommerce - Sistema de Licenças</p>
                        <p style="font-size: 11px; color: #999;">Este é um email automático, por favor não responda.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        // Enviar email
        await transporter.sendMail({
            from: emailConfig.fromEmail || emailConfig.smtpUser,
            to: email,
            subject: subject,
            html: htmlContent
        });
        
        // Log sem expor email completo em produção
        const maskedEmail = isProductionEnv 
            ? email.substring(0, 3) + '***@' + email.split('@')[1]?.substring(0, 3) + '***'
            : email;
        console.log(`✅ Email de aviso de trial expirando enviado para: ${maskedEmail} (expira em ${daysUntilExpiry} dia(s))`);
    } catch (error) {
        console.error('Erro ao enviar email de trial expirando:', error);
    }
}

// Função para verificar trials expirando e criar notificações
async function checkExpiringTrials() {
    try {
        const now = new Date();
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
        
        // Buscar trials que expiram em até 3 dias
        const expiringTrials = await License.find({
            plan: 'trial',
            active: true,
            trialExpiresAt: {
                $gte: now,
                $lte: threeDaysFromNow
            }
        });
        
        for (const license of expiringTrials) {
            if (!license.trialExpiresAt) continue;
            
            const daysUntilExpiry = Math.ceil((new Date(license.trialExpiresAt) - now) / (1000 * 60 * 60 * 24));
            const isExpiringSoon = daysUntilExpiry <= 1;
            const isExpiringIn3Days = daysUntilExpiry <= 3 && daysUntilExpiry > 1;
            
            // Verificar se já existe notificação recente para este trial (últimas 24h)
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const existingNotification = await Notification.findOne({
                email: license.email,
                type: 'trial_expiring',
                createdAt: { $gte: oneDayAgo }
            });
            
            if (!existingNotification) {
                let title, message;
                
                if (isExpiringSoon) {
                    title = 'Trial Expirando Hoje';
                    message = `O trial do cliente ${license.email} expira hoje! Ação necessária.`;
                } else if (isExpiringIn3Days) {
                    title = 'Trial Expirando em Breve';
                    message = `O trial do cliente ${license.email} expira em ${daysUntilExpiry} dia${daysUntilExpiry > 1 ? 's' : ''}.`;
                }
                
                if (title && message) {
                    await Notification.create({
                        type: 'trial_expiring',
                        title,
                        message,
                        email: license.email,
                        licenseId: license._id,
                        metadata: {
                            daysUntilExpiry,
                            expiresAt: license.trialExpiresAt
                        }
                    });
                    
                    // Enviar email para o cliente avisando sobre a expiração
                    // Enviar apenas para trials que expiram em 0, 1, 2 ou 3 dias
                    if (daysUntilExpiry <= 3) {
                        try {
                            await sendTrialExpiringEmail(
                                license.email, 
                                license.key, 
                                daysUntilExpiry, 
                                license.trialExpiresAt
                            );
                        } catch (emailError) {
                            console.error(`Erro ao enviar email de trial expirando para ${license.email}:`, emailError);
                            // Continuar mesmo se email falhar
                        }
                    }
                }
            }
        }
        
        // Verificar trials já expirados que ainda estão ativos
        const expiredTrials = await License.find({
            plan: 'trial',
            active: true,
            trialExpiresAt: {
                $lt: now
            }
        });
        
        for (const license of expiredTrials) {
            // Verificar se já existe notificação recente
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const existingNotification = await Notification.findOne({
                email: license.email,
                type: 'trial_expired',
                createdAt: { $gte: oneDayAgo }
            });
            
            if (!existingNotification) {
                await Notification.create({
                    type: 'trial_expired',
                    title: 'Trial Expirado',
                    message: `O trial do cliente ${license.email} expirou e a licença ainda está ativa. Considere desativar ou atualizar o plano.`,
                    email: license.email,
                    licenseId: license._id,
                    metadata: {
                        expiredAt: license.trialExpiresAt
                    }
                });
            }
        }
    } catch (e) {
        console.error('Erro ao verificar trials expirando:', e);
    }
}

// --- ROTAS ---
app.get('/', async (req, res) => {
    try {
        const config = await Config.findOne() || { priceMonthly: 97, priceYearly: 997 };
        res.render('landing', { config });
    } catch (e) {
        res.render('landing', { config: { priceMonthly: 97, priceYearly: 997 } });
    }
});

app.get('/acesso-admin', (req, res) => {
    if (req.session.user === FINAL_ADMIN_USER) return res.redirect('/admin');
    if (req.session.user) return res.redirect('/minha-conta');
    res.render('login', { error: null, actionUrl: '/acesso-admin' });
});

// Página de esqueci minha senha
app.get('/esqueci-senha', (req, res) => {
    res.render('forgot-password', { 
        error: null, 
        success: null,
        csrfToken: res.locals.csrfToken 
    });
});

// Processar solicitação de reset de senha
app.post('/esqueci-senha',
    body ? [
        body('email').isEmail().normalizeEmail().withMessage('Email inválido')
    ] : [],
    validateRequest,
    async (req, res) => {
    try {
        const { email } = req.body;
        const sanitizedEmail = email.trim().toLowerCase();
        
        // Buscar usuário (cliente ou admin)
        let user = await User.findOne({ email: sanitizedEmail });
        
        // Se não encontrar como cliente, verificar se é admin
        if (!user && sanitizedEmail === FINAL_ADMIN_USER.toLowerCase()) {
            // Para admin, não permitimos reset via email (segurança)
            // Admin deve usar método alternativo ou contatar suporte
            return res.render('forgot-password', { 
                error: 'Para recuperação de senha admin, entre em contato com o suporte.',
                success: null,
                csrfToken: res.locals.csrfToken
            });
        }
        
        if (!user) {
            // Por segurança, não revelar se o email existe ou não
            // Sempre mostrar mensagem de sucesso
            return res.render('forgot-password', { 
                success: 'Se o email estiver cadastrado, você receberá um link para redefinir sua senha.',
                error: null,
                csrfToken: res.locals.csrfToken
            });
        }
        
        // Gerar token de reset seguro
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
        
        // Salvar token no banco
        user.resetToken = resetToken;
        user.resetTokenExpires = resetTokenExpires;
        await user.save();
        
        // Enviar email com link de reset
        const resetUrl = `${req.protocol}://${req.get('host')}/resetar-senha/${resetToken}`;
        
        try {
            const config = await Config.findOne();
            if (!config || !config.emailConfig || !config.emailConfig.smtpHost || !config.emailConfig.smtpPassword) {
                console.log(`📧 [Email não configurado] Link de reset de senha para ${sanitizedEmail}: ${resetUrl}`);
                return res.render('forgot-password', { 
                    success: 'Link de recuperação gerado. Verifique os logs do servidor para obter o link (email não configurado).',
                    error: null,
                    csrfToken: res.locals.csrfToken
                });
            }
            
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransport({
                host: config.emailConfig.smtpHost,
                port: config.emailConfig.smtpPort || 587,
                secure: config.emailConfig.smtpSecure || false,
                auth: {
                    user: config.emailConfig.smtpUser,
                    pass: config.emailConfig.smtpPassword
                }
            });
            
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #F0B90B 0%, #d4a50a 100%); color: #000; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                        .btn-reset { display: inline-block; background: #F0B90B; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                        .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 6px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🔐 Redefinição de Senha</h1>
                        </div>
                        <div class="content">
                            <p>Olá!</p>
                            <p>Você solicitou a redefinição de senha da sua conta.</p>
                            <p>Clique no botão abaixo para criar uma nova senha:</p>
                            <div style="text-align: center;">
                                <a href="${resetUrl}" class="btn-reset">Redefinir Senha</a>
                            </div>
                            <p>Ou copie e cole este link no seu navegador:</p>
                            <p style="word-break: break-all; background: #fff; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">${resetUrl}</p>
                            <div class="warning">
                                <strong>⚠️ Importante:</strong>
                                <ul style="margin: 10px 0; padding-left: 20px;">
                                    <li>Este link expira em 1 hora</li>
                                    <li>Se você não solicitou esta redefinição, ignore este email</li>
                                    <li>Não compartilhe este link com ninguém</li>
                                </ul>
                            </div>
                        </div>
                        <div class="footer">
                            <p>Plugin Cripto Woocommerce - Sistema de Licenças</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
            
            await transporter.sendMail({
                from: config.emailConfig.fromEmail || config.emailConfig.smtpUser,
                to: sanitizedEmail,
                subject: 'Redefinição de Senha - Plugin Cripto',
                html: htmlContent
            });
            
            const maskedEmail = isProductionEnv 
                ? sanitizedEmail.substring(0, 3) + '***@' + sanitizedEmail.split('@')[1]?.substring(0, 3) + '***'
                : sanitizedEmail;
            console.log(`✅ Email de reset de senha enviado para: ${maskedEmail}`);
            
        } catch (emailError) {
            console.error('Erro ao enviar email de reset:', emailError);
            // Continuar mesmo se email falhar - mostrar link nos logs
            console.log(`📧 Link de reset (email falhou): ${resetUrl}`);
        }
        
        res.render('forgot-password', { 
            success: 'Se o email estiver cadastrado, você receberá um link para redefinir sua senha em alguns minutos.',
            error: null,
            csrfToken: res.locals.csrfToken
        });
        
    } catch (e) {
        console.error('Erro ao processar solicitação de reset:', e);
        res.render('forgot-password', { 
            error: 'Erro ao processar solicitação. Tente novamente mais tarde.',
            success: null,
            csrfToken: res.locals.csrfToken
        });
    }
});

// Página de reset de senha (com token)
app.get('/resetar-senha/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        if (!token || token.length < 20) {
            return res.render('reset-password', { 
                error: 'Token inválido ou expirado.',
                token: null,
                csrfToken: res.locals.csrfToken
            });
        }
        
        // Buscar usuário com token válido e não expirado
        const user = await User.findOne({
            resetToken: token,
            resetTokenExpires: { $gt: new Date() }
        });
        
        if (!user) {
            return res.render('reset-password', { 
                error: 'Token inválido ou expirado. Solicite um novo link de recuperação.',
                token: null,
                csrfToken: res.locals.csrfToken
            });
        }
        
        res.render('reset-password', { 
            error: null,
            token: token,
            csrfToken: res.locals.csrfToken
        });
        
    } catch (e) {
        console.error('Erro ao verificar token de reset:', e);
        res.render('reset-password', { 
            error: 'Erro ao processar solicitação.',
            token: null,
            csrfToken: res.locals.csrfToken
        });
    }
});

// Processar reset de senha
app.post('/resetar-senha',
    body ? [
        body('token').trim().isLength({ min: 20, max: 200 }).withMessage('Token inválido'),
        body('password').trim().isLength({ min: 6, max: 255 }).withMessage('Senha deve ter entre 6 e 255 caracteres'),
        body('confirmPassword').custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('As senhas não coincidem');
            }
            return true;
        })
    ] : [],
    validateRequest,
    async (req, res) => {
    try {
        const { token, password } = req.body;
        
        if (!token) {
            return res.render('reset-password', { 
                error: 'Token é obrigatório.',
                token: null,
                csrfToken: res.locals.csrfToken
            });
        }
        
        // Buscar usuário com token válido
        const user = await User.findOne({
            resetToken: token,
            resetTokenExpires: { $gt: new Date() }
        });
        
        if (!user) {
            return res.render('reset-password', { 
                error: 'Token inválido ou expirado. Solicite um novo link de recuperação.',
                token: null,
                csrfToken: res.locals.csrfToken
            });
        }
        
        // Hash da nova senha
        const hashedPassword = await hashPassword(password);
        
        // Atualizar senha e limpar token
        user.password = hashedPassword;
        user.resetToken = null;
        user.resetTokenExpires = null;
        await user.save();
        
        console.log(`✅ Senha redefinida com sucesso para: ${user.email.substring(0, 3)}***`);
        
        res.render('reset-password-success', {
            csrfToken: res.locals.csrfToken
        });
        
    } catch (e) {
        console.error('Erro ao processar reset de senha:', e);
        res.render('reset-password', { 
            error: 'Erro ao processar redefinição. Tente novamente.',
            token: req.body.token || null,
            csrfToken: res.locals.csrfToken
        });
    }
});

app.post('/acesso-admin', 
    rateLimit ? loginLimiter : (req, res, next) => next(),
    body ? [
        body('email').optional().trim().isLength({ min: 1, max: 255 }),
        body('username').optional().trim().isLength({ min: 1, max: 255 }),
        body('password').trim().isLength({ min: 1, max: 255 }).withMessage('Senha é obrigatória')
    ] : [],
    (req, res, next) => {
        if (validationResult && !validationResult(req).isEmpty()) {
            return res.render('login', { error: 'Dados inválidos. Verifique os campos.', actionUrl: '/acesso-admin' });
        }
        next();
    },
    async (req, res) => {
    // Aceitar tanto 'email' quanto 'username' para compatibilidade
    const { email, username, password } = req.body;
    const userInput = email || username;
    
    // Sanitizar inputs (remover espaços extras)
    const sanitizedUser = (userInput || '').trim().replace(/\s+/g, ' ');
    const sanitizedPassword = (password || '').trim();
    
    // Validação básica
    if (!sanitizedUser || !sanitizedPassword) {
        return res.render('login', { error: 'Usuário/Email e senha são obrigatórios.', actionUrl: '/acesso-admin' });
    }
    
    // Log seguro (sem expor credenciais)
    console.log('🔍 Tentativa de login - IP:', req.ip || 'unknown');
    
    // Debug: Verificar se credenciais estão definidas (apenas em desenvolvimento)
    if (!isProductionEnv) {
        console.log('🔍 Debug - Credenciais configuradas:');
        console.log('   - FINAL_ADMIN_USER definido:', !!FINAL_ADMIN_USER);
        console.log('   - FINAL_ADMIN_PASS definido:', !!FINAL_ADMIN_PASS);
        if (FINAL_ADMIN_USER) {
            console.log('   - FINAL_ADMIN_USER value:', FINAL_ADMIN_USER);
            console.log('   - FINAL_ADMIN_USER length:', FINAL_ADMIN_USER.length);
        } else {
            console.log('   - ❌ ERRO: FINAL_ADMIN_USER está undefined!');
        }
        if (FINAL_ADMIN_PASS) {
            console.log('   - FINAL_ADMIN_PASS length:', FINAL_ADMIN_PASS.length);
        } else {
            console.log('   - ❌ ERRO: FINAL_ADMIN_PASS está undefined!');
        }
        console.log('🔍 Debug - Input recebido:');
        console.log('   - User input:', `"${sanitizedUser}"`);
        console.log('   - User input length:', sanitizedUser.length);
        console.log('   - Password input length:', sanitizedPassword.length);
    }
    
    // Verificar se credenciais admin estão definidas
    if (!FINAL_ADMIN_USER || !FINAL_ADMIN_PASS) {
        console.error('❌ ERRO: Credenciais admin não estão definidas!');
        return res.render('login', { 
            error: 'Erro de configuração do servidor. Contate o administrador.', 
            actionUrl: '/acesso-admin' 
        });
    }
    
    // Verificar se é admin (comparação segura)
    // Aceita tanto username quanto email para login admin
    // Comparação case-insensitive para o usuário (mas case-sensitive para senha)
    
    // Debug detalhado em desenvolvimento
    if (!isProductionEnv) {
        console.log('🔍 Debug - Input recebido:');
        console.log('   - sanitizedUser:', sanitizedUser);
        console.log('   - sanitizedPassword length:', sanitizedPassword.length);
        console.log('   - FINAL_ADMIN_USER:', FINAL_ADMIN_USER);
        console.log('   - FINAL_ADMIN_PASS length:', FINAL_ADMIN_PASS ? FINAL_ADMIN_PASS.length : 'undefined');
        console.log('   - Comparando usuários (case-insensitive):');
        console.log('     Input:', sanitizedUser.toLowerCase());
        console.log('     Config:', FINAL_ADMIN_USER.toLowerCase());
    }
    
    const userMatch = hash_equals(sanitizedUser.toLowerCase(), FINAL_ADMIN_USER.toLowerCase());
    const passwordMatch = hash_equals(sanitizedPassword, FINAL_ADMIN_PASS);
    
    // Debug em desenvolvimento
    if (!isProductionEnv) {
        console.log('🔍 Debug - Resultados:');
        console.log('   - userMatch:', userMatch);
        console.log('   - passwordMatch:', passwordMatch);
        if (!userMatch) {
            console.log('   - ❌ Usuário não corresponde');
        }
        if (!passwordMatch) {
            console.log('   - ❌ Senha não corresponde');
        }
    }
    
    if (userMatch && passwordMatch) {
        req.session.user = FINAL_ADMIN_USER;
        req.session.role = 'admin';
        
        await logAdminActivity(req, 'login', 'Login realizado no painel administrativo');
        
        return res.redirect('/admin');
    }
    
    // Verificar se é cliente (apenas se for um email válido)
    try {
        if (isValidEmail(sanitizedUser)) {
            const client = await User.findOne({ email: sanitizedUser.toLowerCase() });
            
            // Debug em desenvolvimento
            if (!isProductionEnv) {
                console.log('🔍 Debug - Cliente encontrado:', !!client);
                if (client) {
                    console.log('🔍 Debug - Cliente email:', client.email);
                    console.log('🔍 Debug - Cliente tem senha:', !!client.password);
                }
            }
            
            if (client) {
                // Comparar senha usando bcrypt (suporta senhas antigas em texto plano)
                const passwordMatch = await comparePassword(sanitizedPassword, client.password);
                
                // Debug em desenvolvimento
                if (!isProductionEnv) {
                    console.log('🔍 Debug - Password match (cliente):', passwordMatch);
                }
                
                if (passwordMatch) {
                    // Migração automática: se senha estava em texto plano, atualizar para hash
                    if (!client.password.startsWith('$2') && client.password.length < 60) {
                        try {
                            client.password = await hashPassword(sanitizedPassword);
                            await client.save();
                            // Log sem expor email completo em produção
                            const maskedEmail = isProductionEnv 
                                ? client.email.substring(0, 3) + '***@' + client.email.split('@')[1]?.substring(0, 3) + '***'
                                : client.email;
                            console.log(`✅ Senha migrada para hash para usuário: ${maskedEmail}`);
                        } catch (migrateErr) {
                            console.error('Erro ao migrar senha para hash:', migrateErr.message);
                            // Continuar mesmo se migração falhar
                        }
                    }
                    
                    req.session.user = client.email;
                    req.session.role = 'client';
                    return res.redirect('/minha-conta');
                }
            }
        }
    } catch (e) {
        console.error('Erro ao buscar usuário:', e);
    }
    
    // Log de tentativa de login falhada (sem expor informações sensíveis)
    const maskedUser = sanitizedUser.length > 3 
        ? sanitizedUser.substring(0, 2) + '***'
        : '***';
    console.warn(`⚠️ Tentativa de login falhada - IP: ${req.ip || 'unknown'} - Usuário: ${maskedUser}`);
    res.render('login', { error: 'Credenciais inválidas.', actionUrl: '/acesso-admin' });
});

app.get('/logout', async (req, res) => {
    if (req.session?.user === FINAL_ADMIN_USER) {
        await logAdminActivity(req, 'logout', 'Logout realizado do painel administrativo');
    }
    req.session.destroy();
    res.redirect('/acesso-admin');
});

app.get('/admin', requireAdmin, async (req, res) => {
    try {
        // Parâmetros de busca e filtro
        const search = req.query.search || '';
        const filterStatus = req.query.status || 'all'; // all, active, blocked
        const filterPlan = req.query.plan || 'all'; // all, trial, monthly, yearly
        const filterProduct = req.query.product || 'all'; // all ou slug do produto
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        
        // Construir query de busca
        let query = {};
        
        // Busca por email ou domínio (com sanitização de regex)
        if (search) {
            const safeSearch = escapeRegex(search);
            if (safeSearch) {
                query.$or = [
                    { email: { $regex: safeSearch, $options: 'i' } },
                    { domain: { $regex: safeSearch, $options: 'i' } }
                ];
            }
        }
        
        // Filtro por status
        if (filterStatus !== 'all') {
            query.active = filterStatus === 'active';
        }
        
        // Filtro por plano
        if (filterPlan !== 'all') {
            query.plan = filterPlan;
        }
        
        // Filtro por produto
        if (filterProduct !== 'all') {
            query.productSlug = filterProduct;
        }
        
        // Buscar licenças com filtros (populate productId para obter dados do produto)
        const licenses = await License.find(query)
            .populate('productId', 'name slug')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        
        // Contar total para paginação
        const totalLicenses = await License.countDocuments(query);
        const totalPages = Math.ceil(totalLicenses / limit);
        
        let config = await Config.findOne();
        if (!config) {
            config = await Config.create({});
        }
        
        // Buscar produtos ativos para filtro
        const products = await Product.find({ active: true }).sort({ order: 1, name: 1 });
        
        // Calcular estatísticas para gráficos (otimizado - usar queries agregadas)
        // Buscar apenas campos necessários para melhor performance
        const allLicenses = await License.find().select('active plan createdAt productSlug').lean();
        const activeLicenses = allLicenses.filter(l => l.active);
        
        // Receita estimada mensal
        const monthlyRevenue = allLicenses.filter(l => l.plan === 'monthly').length * (config.priceMonthly || 97);
        const yearlyRevenue = allLicenses.filter(l => l.plan === 'yearly').length * (config.priceYearly || 997) / 12;
        const estimatedMonthlyRevenue = monthlyRevenue + yearlyRevenue;
        
        // Novos clientes por mês (últimos 6 meses)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const newClientsByMonth = [];
        for (let i = 5; i >= 0; i--) {
            const monthStart = new Date();
            monthStart.setMonth(monthStart.getMonth() - i);
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);
            
            const monthEnd = new Date(monthStart);
            monthEnd.setMonth(monthEnd.getMonth() + 1);
            
            const count = await License.countDocuments({
                createdAt: { $gte: monthStart, $lt: monthEnd }
            });
            
            newClientsByMonth.push({
                month: monthStart.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
                count
            });
        }
        
        // Distribuição de planos
        const planDistribution = {
            trial: allLicenses.filter(l => l.plan === 'trial').length,
            monthly: allLicenses.filter(l => l.plan === 'monthly').length,
            yearly: allLicenses.filter(l => l.plan === 'yearly').length
        };
        
        // Receita ao longo do tempo (últimos 6 meses) - baseado em planos ativos
        const revenueByMonth = [];
        for (let i = 5; i >= 0; i--) {
            const monthStart = new Date();
            monthStart.setMonth(monthStart.getMonth() - i);
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);
            
            const monthEnd = new Date(monthStart);
            monthEnd.setMonth(monthEnd.getMonth() + 1);
            
            // Contar planos ativos criados até este mês
            const monthlyPlans = await License.countDocuments({
                plan: 'monthly',
                active: true,
                createdAt: { $lt: monthEnd }
            });
            const yearlyPlans = await License.countDocuments({
                plan: 'yearly',
                active: true,
                createdAt: { $lt: monthEnd }
            });
            
            const revenue = (monthlyPlans * (config.priceMonthly || 97)) + ((yearlyPlans * (config.priceYearly || 997)) / 12);
            
            revenueByMonth.push({
                month: monthStart.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
                revenue: Math.round(revenue * 100) / 100
            });
        }
        
        // Taxa de conversão (trial -> pago)
        const totalTrials = allLicenses.filter(l => l.plan === 'trial').length;
        const totalPaid = allLicenses.filter(l => l.plan === 'monthly' || l.plan === 'yearly').length;
        const conversionRate = totalTrials > 0 ? ((totalPaid / (totalTrials + totalPaid)) * 100).toFixed(1) : 0;
        
        // Verificar trials expirando e criar notificações
        await checkExpiringTrials();
        
        // Estatísticas de trials expirando
        const now = new Date();
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const expiringTrialsCount = await License.countDocuments({
            plan: 'trial',
            active: true,
            trialExpiresAt: {
                $gte: now,
                $lte: threeDaysFromNow
            }
        });
        const expiredTrialsCount = await License.countDocuments({
            plan: 'trial',
            active: true,
            trialExpiresAt: {
                $lt: now
            }
        });
        
        // Buscar notificações não lidas
        const unreadNotifications = await Notification.find({ read: false })
            .sort({ createdAt: -1 })
            .limit(10);
        
        const totalUnreadNotifications = await Notification.countDocuments({ read: false });
        
        // Não enviar chaves secretas para o frontend (segurança)
        const safeConfig = {
            trialDays: config.trialDays || 7,
            priceMonthly: config.priceMonthly || 97.00,
            priceYearly: config.priceYearly || 997.00,
            promoText: config.promoText || "Oferta de Lançamento",
            stripeSecretKey: config.stripeSecretKey || '',
            stripePublishableKey: config.stripePublishableKey || '',
            stripeWebhookSecret: config.stripeWebhookSecret || '',
            emailConfig: config.emailConfig ? {
                smtpHost: config.emailConfig.smtpHost || '',
                smtpPort: config.emailConfig.smtpPort || 587,
                smtpSecure: config.emailConfig.smtpSecure || false,
                smtpUser: config.emailConfig.smtpUser || '',
                smtpPassword: '', // Não enviar senha
                fromEmail: config.emailConfig.fromEmail || ''
            } : {
                smtpHost: '',
                smtpPort: 587,
                smtpSecure: false,
                smtpUser: '',
                smtpPassword: '',
                fromEmail: ''
            }
        };
        
        res.render('dashboard', { 
            licenses, 
            products, // Lista de produtos para filtro
            config: safeConfig,
            search,
            filterStatus,
            filterPlan,
            filterProduct, // Filtro de produto
            currentPage: 'dashboard', // Para destacar item no menu
            pagination: {
                page,
                limit,
                totalPages,
                totalLicenses,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            filters: {
                status: filterStatus,
                plan: filterPlan,
                product: filterProduct
            },
            stats: {
                activeLicenses: activeLicenses.length,
                totalLicenses: allLicenses.length,
                estimatedMonthlyRevenue,
                newClientsByMonth,
                planDistribution,
                revenueByMonth,
                conversionRate,
                expiringTrialsCount,
                expiredTrialsCount
            },
            notifications: {
                unread: unreadNotifications,
                totalUnread: totalUnreadNotifications
            }
        });
    } catch (e) { res.send("Erro banco de dados: " + e.message); }
});

// Página de Vendas (Admin)
app.get('/admin/vendas', requireAdmin, async (req, res) => {
    try {
        // Buscar todas as licenças com planos pagos
        const paidLicenses = await License.find({ 
            plan: { $in: ['monthly', 'yearly'] },
            active: true
        }).populate('productId', 'name slug').sort({ createdAt: -1 });
        
        // Calcular estatísticas de vendas
        const totalRevenue = paidLicenses.reduce((sum, license) => {
            const config = { priceMonthly: 97, priceYearly: 997 };
            if (license.plan === 'monthly') return sum + (config.priceMonthly || 97);
            if (license.plan === 'yearly') return sum + (config.priceYearly || 997);
            return sum;
        }, 0);
        
        const monthlyRevenue = paidLicenses.filter(l => l.plan === 'monthly').length * 97;
        const yearlyRevenue = paidLicenses.filter(l => l.plan === 'yearly').length * 997;
        
        // Vendas por mês (últimos 6 meses)
        const salesByMonth = [];
        for (let i = 5; i >= 0; i--) {
            const monthStart = new Date();
            monthStart.setMonth(monthStart.getMonth() - i);
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);
            
            const monthEnd = new Date(monthStart);
            monthEnd.setMonth(monthEnd.getMonth() + 1);
            
            const monthSales = await License.countDocuments({
                plan: { $in: ['monthly', 'yearly'] },
                createdAt: { $gte: monthStart, $lt: monthEnd }
            });
            
            salesByMonth.push({
                month: monthStart.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
                count: monthSales
            });
        }
        
        res.render('admin-vendas', {
            paidLicenses,
            currentPage: 'vendas', // Para destacar item no menu
            stats: {
                totalRevenue,
                monthlyRevenue,
                yearlyRevenue,
                totalPaidLicenses: paidLicenses.length,
                monthlyCount: paidLicenses.filter(l => l.plan === 'monthly').length,
                yearlyCount: paidLicenses.filter(l => l.plan === 'yearly').length
            },
            salesByMonth
        });
    } catch (e) {
        res.send("Erro: " + e.message);
    }
});

app.post('/admin/update-config', 
    requireAdmin,
    body ? [
        body('trialDays').optional().isInt({ min: 1, max: 365 }).withMessage('Dias de trial deve ser entre 1 e 365'),
        body('priceMonthly').optional().isFloat({ min: 0 }).withMessage('Preço mensal inválido'),
        body('priceYearly').optional().isFloat({ min: 0 }).withMessage('Preço anual inválido'),
        body('promoText').optional().trim().isLength({ max: 500 }).withMessage('Texto promocional muito longo'),
        body('stripeSecretKey').optional().trim().isLength({ max: 200 }),
        body('stripePublishableKey').optional().trim().isLength({ max: 200 }),
        body('stripeWebhookSecret').optional().trim().isLength({ max: 200 }),
        body('smtpHost').optional().trim().isLength({ max: 255 }),
        body('smtpPort').optional().isInt({ min: 1, max: 65535 }),
        body('smtpUser').optional().trim().isLength({ max: 255 }),
        body('smtpPassword').optional().trim().isLength({ max: 255 }),
        body('fromEmail').optional().isEmail().normalizeEmail()
    ] : [],
    validateRequest,
    async (req, res) => {
    try {
        let config = await Config.findOne();
        if (!config) config = await Config.create({});
        
        // Atualizar configurações básicas
        config.trialDays = parseInt(req.body.trialDays) || 7;
        config.priceMonthly = parseFloat(req.body.priceMonthly) || 97.00;
        config.priceYearly = parseFloat(req.body.priceYearly) || 997.00;
        config.promoText = req.body.promoText || "Oferta de Lançamento";
        
        // Atualizar chaves Stripe
        if (req.body.stripeSecretKey !== undefined) {
            config.stripeSecretKey = req.body.stripeSecretKey.trim();
        }
        if (req.body.stripePublishableKey !== undefined) {
            config.stripePublishableKey = req.body.stripePublishableKey.trim();
        }
        if (req.body.stripeWebhookSecret !== undefined) {
            config.stripeWebhookSecret = req.body.stripeWebhookSecret.trim();
        }
        
        // Atualizar configurações de email
        if (!config.emailConfig) {
            config.emailConfig = {};
        }
        if (req.body.smtpHost !== undefined) {
            config.emailConfig.smtpHost = req.body.smtpHost.trim();
        }
        if (req.body.smtpPort !== undefined) {
            config.emailConfig.smtpPort = parseInt(req.body.smtpPort) || 587;
        }
        if (req.body.smtpSecure !== undefined) {
            config.emailConfig.smtpSecure = req.body.smtpSecure === 'true' || req.body.smtpSecure === true;
        }
        if (req.body.smtpUser !== undefined) {
            config.emailConfig.smtpUser = req.body.smtpUser.trim();
        }
        if (req.body.smtpPassword !== undefined && req.body.smtpPassword.trim() !== '') {
            config.emailConfig.smtpPassword = req.body.smtpPassword.trim();
        }
        if (req.body.fromEmail !== undefined) {
            config.emailConfig.fromEmail = req.body.fromEmail.trim();
        }
        
        await config.save();
        
        // Reinicializar Stripe se as chaves mudaram
        if (config.stripeSecretKey) {
            stripe = require('stripe')(config.stripeSecretKey);
            console.log('✅ Stripe reinicializado com nova chave');
        }
        
        await logAdminActivity(req, 'config_updated', 'Configurações atualizadas');
        
        res.redirect('/admin?success=1');
    } catch (e) {
        res.redirect('/admin?error=' + encodeURIComponent(e.message));
    }
});

app.post('/admin/change-plan', 
    requireAdmin,
    body ? [
        body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
        body('newPlan').trim().isIn(['trial', 'monthly', 'yearly']).withMessage('Plano inválido')
    ] : [],
    validateRequest,
    async (req, res) => {
    try {
        // Buscar licença (pode especificar productSlug se houver múltiplos produtos)
        const query = { email: req.body.email };
        if (req.body.productSlug) {
            query.productSlug = req.body.productSlug;
        }
        
        const license = await License.findOne(query);
        if (license) {
            const oldPlan = license.plan;
            license.plan = req.body.newPlan;
            license.updatedAt = new Date();
            
            // Calcular nova data de expiração baseada no plano
            if (req.body.newPlan === 'trial') {
                const config = await Config.findOne();
                const trialDays = config ? (config.trialDays || 7) : 7;
                license.trialExpiresAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
                license.planExpiresAt = null;
            } else if (req.body.newPlan === 'monthly') {
                license.planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                license.trialExpiresAt = null;
            } else if (req.body.newPlan === 'yearly') {
                license.planExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
                license.trialExpiresAt = null;
            }
            
            await license.save();
            
            // Registrar atividade
            await ActivityLog.create({
                email: req.body.email,
                action: 'plan_changed',
                description: `Plano alterado de ${oldPlan} para ${req.body.newPlan}`,
                adminUser: req.session.user || 'admin',
                metadata: { oldPlan, newPlan: req.body.newPlan }
            });
        }
        res.redirect('/admin?success=1');
    } catch (e) {
        res.redirect('/admin?error=' + encodeURIComponent(e.message));
    }
});

// Nova rota para gerenciar assinatura específica
// Rota para criar novo cliente manualmente
app.post('/admin/create-client', requireAdmin, body ? [
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('password').trim().isLength({ min: 6, max: 255 }).withMessage('Senha deve ter entre 6 e 255 caracteres'),
    body('domain').optional().trim().isLength({ max: 255 }).withMessage('Domínio inválido'),
    body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notas muito longas')
] : [], validateRequest, async (req, res) => {
    try {
        console.log('📝 === INICIANDO CRIAÇÃO DE CLIENTE (TRIAL) ===');
        console.log('📥 Dados recebidos:', {
            email: req.body.email,
            plan: 'trial (fixo)',
            hasPassword: !!req.body.password,
            domain: req.body.domain || '(vazio)',
            notes: req.body.notes ? req.body.notes.substring(0, 50) + '...' : '(vazio)'
        });
        
        // Verificar conexão com MongoDB
        if (mongoose.connection.readyState !== 1) {
            console.error('❌ MongoDB não está conectado! Estado:', mongoose.connection.readyState);
            return res.json({ 
                success: false, 
                message: 'Erro: Banco de dados não está conectado. Verifique a conexão MongoDB.' 
            });
        }
        console.log('✅ MongoDB conectado - Estado:', mongoose.connection.readyState);
        
        const { email, password, domain, notes } = req.body;
        // Sempre usar 'trial' para criação manual (igual ao sistema de teste)
        const plan = 'trial';
        
        // Validação básica
        if (!email || !isValidEmail(email)) {
            console.error('❌ Email inválido:', email);
            return res.json({ success: false, message: 'Email inválido' });
        }
        
        if (!password || password.trim().length < 6) {
            console.error('❌ Senha inválida (menos de 6 caracteres)');
            return res.json({ success: false, message: 'Senha deve ter no mínimo 6 caracteres' });
        }
        
        // Sanitizar inputs
        const sanitizedEmail = email.trim().toLowerCase();
        const sanitizedPassword = password.trim();
        const sanitizedDomain = domain ? domain.trim().toLowerCase() : null;
        const sanitizedNotes = notes ? notes.trim() : '';
        
        // Verificar se já existe licença para este email e produto
        const productSlug = 'binance-pix';
        const existingLicense = await License.findOne({ 
            email: sanitizedEmail, 
            productSlug: productSlug 
        });
        
        if (existingLicense) {
            return res.json({ 
                success: false, 
                message: 'Já existe um cliente com este email para este produto' 
            });
        }
        
        // Buscar ou criar produto
        console.log('📦 Verificando produto...');
        let product = await Product.findOne({ slug: productSlug, active: true }) || 
                      await Product.findOne({ slug: 'binance-pix' });
        
        if (!product) {
            console.log('📦 Produto não encontrado, criando produto padrão...');
            product = await Product.create({
                slug: productSlug,
                name: 'Plugin Binance Pix / USDT',
                description: 'Plugin WooCommerce para pagamentos via Pix com conversão para USDT',
                active: true,
                trialDays: 7,
                priceMonthly: 97.00,
                priceYearly: 997.00,
                promoText: 'Oferta de Lançamento',
                order: 0
            });
            console.log('✅ Produto criado! ID:', product._id);
        } else {
            console.log('✅ Produto encontrado! ID:', product._id);
        }
        
        // Calcular data de expiração do trial (sempre trial para criação manual)
        const trialDays = product ? (product.trialDays || 7) : 7;
        const trialExpiresAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
        const planExpiresAt = null; // Sempre null para trial
        
        // Criar ou atualizar usuário
        console.log('👤 Verificando usuário existente...');
        let user = await User.findOne({ email: sanitizedEmail });
        console.log('👤 Usuário encontrado:', !!user);
        
        console.log('🔐 Hashando senha...');
        const hashedPassword = await hashPassword(sanitizedPassword);
        
        if (!user) {
            // Criar novo usuário com a senha fornecida
            console.log('➕ Criando novo usuário...');
            user = await User.create({ 
                email: sanitizedEmail,
                password: hashedPassword
            });
            console.log('✅ Usuário criado com sucesso! ID:', user._id);
        } else {
            // Atualizar senha do usuário existente
            console.log('🔄 Atualizando senha do usuário existente...');
            user.password = hashedPassword;
            await user.save();
            console.log('✅ Senha do usuário atualizada!');
        }
        
        // Criar licença
        console.log('🔑 Gerando chave de licença...');
        const licenseKey = generateLicenseKey();
        console.log('🔑 Chave gerada:', licenseKey.substring(0, 15) + '...');
        
        console.log('📄 Criando licença no banco de dados...');
        const newLicense = await License.create({
            email: sanitizedEmail,
            key: licenseKey,
            productId: product ? product._id : null,
            productSlug: productSlug,
            plan: plan,
            active: true,
            domain: sanitizedDomain,
            notes: sanitizedNotes,
            trialExpiresAt: trialExpiresAt,
            planExpiresAt: planExpiresAt
        });
        console.log('✅ Licença criada com sucesso! ID:', newLicense._id);
        
        // Enviar email com chave de licença trial (igual ao sistema de teste)
        try {
            await sendLicenseEmail(sanitizedEmail, newLicense.key, 'trial', trialExpiresAt);
        } catch (emailError) {
            console.error('Erro ao enviar email:', emailError);
            // Não falhar a criação se o email falhar
        }
        
        // Registrar atividade admin (igual ao sistema de teste)
        await ActivityLog.create({
            email: sanitizedEmail,
            action: 'created',
            description: 'Licença criada manualmente - Plano: trial',
            adminUser: req.session.user || 'admin',
            metadata: { plan: 'trial', source: 'manual' }
        });
        
        console.log('✅ === CLIENTE CRIADO COM SUCESSO (TRIAL) ===');
        console.log('📧 Email:', sanitizedEmail);
        console.log('🔑 Chave:', newLicense.key);
        console.log('📋 Plano: trial (fixo para criação manual)');
        
        res.json({ 
            success: true, 
            message: 'Cliente criado com sucesso!',
            license: {
                key: newLicense.key,
                email: sanitizedEmail
            }
        });
        
    } catch (error) {
        console.error('❌ === ERRO AO CRIAR CLIENTE ===');
        console.error('❌ Tipo do erro:', error.constructor.name);
        console.error('❌ Mensagem:', error.message);
        console.error('❌ Stack:', error.stack);
        
        // Verificar se é erro de validação do Mongoose
        if (error.name === 'ValidationError') {
            console.error('❌ Erros de validação:', JSON.stringify(error.errors, null, 2));
            return res.json({ 
                success: false, 
                message: 'Erro de validação: ' + Object.values(error.errors).map(e => e.message).join(', ')
            });
        }
        
        // Verificar se é erro de duplicação
        if (error.code === 11000) {
            console.error('❌ Erro: Email ou chave já existe');
            return res.json({ 
                success: false, 
                message: 'Email ou chave de licença já existe no sistema'
            });
        }
        
        res.json({ 
            success: false, 
            message: 'Erro ao criar cliente: ' + error.message 
        });
    }
});

app.post('/admin/manage-subscription', requireAdmin, async (req, res) => {
    try {
        const { email, action, newPlan, productSlug } = req.body;
        const query = { email };
        if (productSlug) {
            query.productSlug = productSlug;
        }
        
        const license = await License.findOne(query);
        
        if (!license) {
            return res.json({ success: false, message: 'Licença não encontrada' });
        }

        switch (action) {
            case 'activate':
                license.active = true;
                license.updatedAt = new Date();
                await ActivityLog.create({
                    email,
                    action: 'activated',
                    description: 'Licença ativada via admin',
                    adminUser: req.session.user || 'admin'
                });
                await logAdminActivity(req, 'license_activated', 'Licença ativada via admin', email);
                break;
            case 'deactivate':
                license.active = false;
                license.updatedAt = new Date();
                await ActivityLog.create({
                    email,
                    action: 'deactivated',
                    description: 'Licença desativada via admin',
                    adminUser: req.session.user || 'admin'
                });
                await logAdminActivity(req, 'license_deactivated', 'Licença desativada via admin', email);
                break;
            case 'change-plan':
                if (newPlan) {
                    const oldPlan = license.plan;
                    license.plan = newPlan;
                    license.updatedAt = new Date();
                    await ActivityLog.create({
                        email,
                        action: 'plan_changed',
                        description: `Plano alterado de ${oldPlan} para ${newPlan}`,
                        adminUser: req.session.user || 'admin',
                        metadata: { oldPlan, newPlan }
                    });
                    await logAdminActivity(req, 'plan_changed', `Plano alterado de ${oldPlan} para ${newPlan}`, email, { oldPlan, newPlan });
                }
                break;
            case 'regenerate-key':
                const oldKey = license.key;
                license.key = generateLicenseKey();
                license.updatedAt = new Date();
                await license.save();
                await ActivityLog.create({
                    email,
                    action: 'key_regenerated',
                    description: 'Chave de licença regenerada',
                    adminUser: req.session.user || 'admin',
                    metadata: { oldKey: oldKey.substring(0, 8) + '...' }
                });
                
                // Hash parcial da chave antiga para logs
                const maskedOldKey = oldKey.length > 8 
                    ? oldKey.substring(0, 4) + '***' + oldKey.substring(oldKey.length - 4)
                    : '***';
                await logAdminActivity(req, 'key_regenerated', 'Chave de licença regenerada', email, { oldKey: maskedOldKey });
                
                return res.json({ success: true, license });
        }

        await license.save();
        res.json({ success: true, license });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// Página de detalhes do cliente
app.get('/admin/client/:email', requireAdmin, async (req, res) => {
    try {
        const email = decodeURIComponent(req.params.email);
        const productSlug = req.query.product || 'binance-pix'; // Produto padrão
        
        // Buscar todas as licenças do cliente (pode ter múltiplos produtos)
        const licenses = await License.find({ email }).populate('productId', 'name slug').sort({ createdAt: -1 });
        const license = licenses.find(l => l.productSlug === productSlug) || licenses[0]; // Usar especificado ou primeira
        
        const user = await User.findOne({ email });
        
        if (!license) {
            return res.redirect('/admin?error=Cliente não encontrado');
        }

        // Buscar histórico de atividades
        const activities = await ActivityLog.find({ email }).sort({ createdAt: -1 }).limit(50);

        // Buscar histórico de pagamentos do Stripe (se tiver customer ID)
        let payments = [];
        let subscription = null;
        
        if (license.stripeCustomerId && stripe) {
            try {
                // Buscar assinatura
                if (license.stripeSubscriptionId) {
                    subscription = await stripe.subscriptions.retrieve(license.stripeSubscriptionId);
                } else {
                    // Buscar todas as assinaturas do cliente
                    const subscriptions = await stripe.subscriptions.list({
                        customer: license.stripeCustomerId,
                        limit: 10
                    });
                    if (subscriptions.data.length > 0) {
                        subscription = subscriptions.data[0];
                    }
                }

                // Buscar pagamentos (charges)
                const charges = await stripe.charges.list({
                    customer: license.stripeCustomerId,
                    limit: 50
                });
                payments = charges.data.map(charge => ({
                    id: charge.id,
                    amount: charge.amount / 100, // Converter centavos para reais
                    currency: charge.currency,
                    status: charge.status,
                    paid: charge.paid,
                    refunded: charge.refunded,
                    created: new Date(charge.created * 1000),
                    receipt_url: charge.receipt_url,
                    invoice: charge.invoice
                }));

                // Buscar invoices
                const invoices = await stripe.invoices.list({
                    customer: license.stripeCustomerId,
                    limit: 50
                });
                
                // Combinar invoices com charges
                invoices.data.forEach(invoice => {
                    if (invoice.status === 'paid' && invoice.charge) {
                        const existingPayment = payments.find(p => p.id === invoice.charge);
                        if (!existingPayment) {
                            payments.push({
                                id: invoice.charge,
                                amount: invoice.amount_paid / 100,
                                currency: invoice.currency,
                                status: invoice.status,
                                paid: true,
                                refunded: false,
                                created: new Date(invoice.created * 1000),
                                receipt_url: invoice.hosted_invoice_url,
                                invoice: invoice.id,
                                invoiceNumber: invoice.number
                            });
                        }
                    }
                });

                // Ordenar por data (mais recente primeiro)
                payments.sort((a, b) => b.created - a.created);
            } catch (stripeError) {
                console.error('Erro ao buscar dados do Stripe:', stripeError.message);
            }
        }

        // Calcular data de expiração se não existir
        if (!license.trialExpiresAt && license.plan === 'trial') {
            const config = await Config.findOne();
            const trialDays = config ? (config.trialDays || 7) : 7;
            license.trialExpiresAt = new Date(license.createdAt.getTime() + trialDays * 24 * 60 * 60 * 1000);
        }
        if (!license.planExpiresAt && (license.plan === 'monthly' || license.plan === 'yearly')) {
            const days = license.plan === 'monthly' ? 30 : 365;
            license.planExpiresAt = new Date(license.createdAt.getTime() + days * 24 * 60 * 60 * 1000);
        }

        // Buscar notificações não lidas para o menu
        const unreadNotifications = await Notification.find({ read: false })
            .sort({ createdAt: -1 })
            .limit(10);
        const totalUnreadNotifications = await Notification.countDocuments({ read: false });
        
        res.render('client-details', {
            license,
            licenses, // Todas as licenças do cliente (múltiplos produtos)
            user,
            activities,
            payments,
            subscription,
            config: await Config.findOne() || {},
            query: req.query,
            currentProduct: productSlug,
            products: await Product.find({ active: true }).sort({ order: 1 }),
            currentPage: 'clientes',
            csrfToken: res.locals.csrfToken || (req.csrfToken ? req.csrfToken() : null), // Adicionar CSRF token
            notifications: {
                unread: unreadNotifications,
                totalUnread: totalUnreadNotifications
            }
        });
    } catch (e) {
        res.redirect('/admin?error=' + encodeURIComponent(e.message));
    }
});

// Atualizar informações do cliente
app.post('/admin/client/:email/update', 
    requireAdmin,
    body ? [
        body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notas muito longas'),
        body('domain').optional().trim().isLength({ max: 255 }).withMessage('Domínio inválido')
    ] : [],
    validateRequest,
    async (req, res) => {
    try {
        const email = decodeURIComponent(req.params.email);
        const license = await License.findOne({ email });
        
        if (!license) {
            return res.redirect('/admin?error=Cliente não encontrado');
        }

        // Atualizar domínio se fornecido
        if (req.body.domain !== undefined) {
            const oldDomain = license.domain;
            license.domain = req.body.domain || null;
            license.updatedAt = new Date();
            
            await ActivityLog.create({
                email,
                action: 'domain_updated',
                description: `Domínio alterado de ${oldDomain || 'nenhum'} para ${license.domain || 'nenhum'}`,
                adminUser: req.session.user || 'admin',
                metadata: { oldDomain, newDomain: license.domain }
            });
            
            await logAdminActivity(req, 'domain_updated', `Domínio alterado de ${oldDomain || 'nenhum'} para ${license.domain || 'nenhum'}`, email, { oldDomain, newDomain: license.domain });
        }

        // Atualizar notas se fornecido
        if (req.body.notes !== undefined) {
            license.notes = req.body.notes;
            license.updatedAt = new Date();
        }

        await license.save();
        res.redirect(`/admin/client/${encodeURIComponent(email)}?success=1`);
    } catch (e) {
        res.redirect(`/admin/client/${encodeURIComponent(req.params.email)}?error=` + encodeURIComponent(e.message));
    }
});

// Cancelar assinatura Stripe
app.post('/admin/cancel-subscription', requireAdmin, async (req, res) => {
    try {
        const { email, productSlug } = req.body;
        const query = { email };
        if (productSlug) {
            query.productSlug = productSlug;
        }
        
        const license = await License.findOne(query);
        
        if (!license) {
            return res.json({ success: false, message: 'Licença não encontrada' });
        }
        
        if (!license.stripeSubscriptionId || !stripe) {
            return res.json({ success: false, message: 'Assinatura Stripe não encontrada ou Stripe não configurado' });
        }
        
        // Cancelar assinatura no Stripe
        const subscription = await stripe.subscriptions.cancel(license.stripeSubscriptionId);
        
        // Atualizar licença
        license.active = false;
        license.updatedAt = new Date();
        await license.save();
        
        // Registrar atividade
        await ActivityLog.create({
            email,
            action: 'subscription_cancelled',
            description: 'Assinatura cancelada no Stripe',
            adminUser: req.session.user || 'admin',
            metadata: { subscriptionId: license.stripeSubscriptionId }
        });
        
        await logAdminActivity(req, 'subscription_cancelled', 'Assinatura Stripe cancelada', email, { subscriptionId: license.stripeSubscriptionId });
        
        res.json({ success: true, message: 'Assinatura cancelada com sucesso' });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// Reembolsar pagamento
app.post('/admin/refund-payment', 
    requireAdmin,
    body ? [
        body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
        body('chargeId').trim().isLength({ min: 1, max: 100 }).withMessage('Charge ID inválido'),
        body('amount').optional().isFloat({ min: 0 }).withMessage('Valor inválido')
    ] : [],
    validateRequest,
    async (req, res) => {
    try {
        const { email, chargeId, amount, productSlug } = req.body;
        const query = { email };
        if (productSlug) {
            query.productSlug = productSlug;
        }
        
        const license = await License.findOne(query);
        
        if (!license) {
            return res.json({ success: false, message: 'Licença não encontrada' });
        }
        
        if (!stripe) {
            return res.json({ success: false, message: 'Stripe não configurado' });
        }
        
        // Criar reembolso
        const refundOptions = { charge: chargeId };
        if (amount) {
            refundOptions.amount = Math.round(amount * 100); // Converter para centavos
        }
        
        const refund = await stripe.refunds.create(refundOptions);
        const refundAmount = (refund.amount / 100).toFixed(2);
        
        // Registrar atividade
        await ActivityLog.create({
            email,
            action: 'payment_refunded',
            description: `Reembolso de R$ ${refundAmount} processado`,
            adminUser: req.session.user || 'admin',
            metadata: { chargeId, refundId: refund.id, amount: refund.amount }
        });
        
        await logAdminActivity(req, 'payment_refunded', `Reembolso de R$ ${refundAmount} processado`, email, { chargeId, refundId: refund.id, amount: refund.amount });
        
        res.json({ success: true, message: 'Reembolso processado com sucesso', refund });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

app.post('/toggle-license', 
    requireAdmin,
    body ? [
        body('email').isEmail().normalizeEmail().withMessage('Email inválido')
    ] : [],
    validateRequest,
    async (req, res) => {
    try {
        // Buscar licença (pode especificar productSlug)
        const query = { email: req.body.email };
        if (req.body.productSlug) {
            query.productSlug = req.body.productSlug;
        }
        
        const license = await License.findOne(query);
        if (license) {
            const oldStatus = license.active;
            license.active = !license.active;
            license.updatedAt = new Date();
            await license.save();
            
            // Registrar atividade
            const action = license.active ? 'activated' : 'deactivated';
            const description = license.active ? 'Licença ativada' : 'Licença desativada';
            
            await ActivityLog.create({
                email: req.body.email,
                action,
                description,
                adminUser: req.session.user || 'admin',
                metadata: { previousStatus: oldStatus, newStatus: license.active }
            });
            
            await logAdminActivity(req, 'license_toggled', description, req.body.email, { previousStatus: oldStatus, newStatus: license.active });
        }
        res.redirect('/admin');
    } catch (e) {
        res.redirect('/admin?error=' + encodeURIComponent(e.message));
    }
});

app.get('/minha-conta', requireAuth, async (req, res) => {
    if (req.session.role === 'admin') return res.redirect('/admin');
    const userEmail = req.session.user;
    const productSlug = req.query.product || 'binance-pix'; // Produto padrão
    
    try {
        // Buscar todas as licenças do usuário (pode ter múltiplos produtos)
        const licenses = await License.find({ email: userEmail }).populate('productId', 'name slug').sort({ createdAt: -1 });
        const userLicense = licenses.find(l => l.productSlug === productSlug) || licenses[0]; // Usar especificado ou primeira
        
        res.render('client-area', { 
            user: {
                email: userEmail,
                license_key: userLicense ? userLicense.key : 'Gerando...',
                active: userLicense ? userLicense.active : false
            },
            licenses, // Todas as licenças (múltiplos produtos)
            currentProduct: productSlug,
            products: await Product.find({ active: true }).sort({ order: 1 })
        });
    } catch (e) { res.send("Erro: " + e.message); }
});

app.get('/comprar', async (req, res) => {
    const planType = req.query.plan || 'trial';
    let config = { priceMonthly: 97, priceYearly: 997 };
    try { config = await Config.findOne() || config; } catch (e) {}
    
    let plan = { id: 'trial', name: 'Teste Grátis', price: 0, period: '7 dias' };
    if (planType === 'monthly') plan = { id: 'monthly', name: 'Plano Mensal', price: config.priceMonthly, period: 'mês' };
    if (planType === 'yearly') plan = { id: 'yearly', name: 'Plano Anual', price: config.priceYearly, period: 'ano' };
    
    res.render('checkout', { plan });
});

// --- INICIALIZAR STRIPE ---
const PORT = process.env.PORT || 5000;

async function initStripe() {
    try {
        const config = await Config.findOne();
        if (config && config.stripeSecretKey) {
            stripe = require('stripe')(config.stripeSecretKey);
            console.log('✅ Stripe inicializado com sucesso!');
        } else {
            console.log('⚠️ Stripe não configurado. Configure as chaves no painel admin.');
        }
    } catch (e) {
        console.log('⚠️ Erro ao inicializar Stripe:', e.message);
    }
}

// Inicializar Stripe após conectar ao MongoDB
mongoose.connection.once('open', () => {
    initStripe();
});

// Endpoint de métricas (protegido - apenas admin)
app.get('/admin/metrics', requireAdmin, (req, res) => {
    try {
        const stats = metricsCollector.getStats();
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- ROTAS DE PAGAMENTO COM STRIPE ---
app.post('/create-checkout-session',
    body ? [
        body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
        body('password').optional().trim().isLength({ min: 3, max: 255 }),
        body('planId').trim().isIn(['monthly', 'yearly', 'trial']).withMessage('Plano inválido')
    ] : [],
    validateRequest,
    async (req, res) => {
    const { email, password, planId } = req.body;
    try {
        // Criar ou encontrar usuário
        let user = await User.findOne({ email });
        if (!user) {
            // Hash da senha antes de criar usuário
            const hashedPassword = await hashPassword(password);
            await User.create({ email, password: hashedPassword });
        }

        // Buscar configuração
        const config = await Config.findOne();
        if (!config || !config.stripeSecretKey) {
            return res.status(400).json({ error: 'Stripe não configurado. Configure as chaves no painel admin.' });
        }

        // Inicializar Stripe se necessário
        if (!stripe) {
            stripe = require('stripe')(config.stripeSecretKey);
        }

        // Determinar preço e período
        let price = 0;
        let period = 'month';
        if (planId === 'monthly') {
            price = Math.round(config.priceMonthly * 100); // Converter para centavos
            period = 'month';
        } else if (planId === 'yearly') {
            price = Math.round(config.priceYearly * 100);
            period = 'year';
        }

        // Determinar produto (suporte a múltiplos produtos)
        const productSlug = req.body.product || req.body.plugin_slug || 'binance-pix';
        const dbProduct = await Product.findOne({ slug: productSlug, active: true }) || 
                         await Product.findOne({ slug: 'binance-pix' });
        
        const productName = dbProduct ? dbProduct.name : 'Plugin Cripto Woocommerce';
        
        // Criar produto e preço no Stripe (ou usar existentes)
        const stripeProduct = await stripe.products.create({
            name: `${productName} - ${planId === 'monthly' ? 'Mensal' : 'Anual'}`,
            description: `Assinatura do ${productName}`,
            metadata: {
                product_slug: productSlug,
                plan: planId
            }
        });

        const priceObj = await stripe.prices.create({
            product: stripeProduct.id,
            unit_amount: price,
            currency: 'brl',
            recurring: {
                interval: period
            },
            metadata: {
                product_slug: productSlug,
                plan: planId
            }
        });

        // Criar sessão de checkout
        const session = await stripe.checkout.sessions.create({
            customer_email: email,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceObj.id,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `http://localhost:${PORT}/payment-success?session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(email)}&plan=${planId}`,
            cancel_url: `http://localhost:${PORT}/comprar?plan=${planId}&canceled=true`,
            metadata: {
                email: email,
                plan: planId,
                product: productSlug,
                plugin_slug: productSlug
            }
        });

        res.json({ sessionId: session.id, url: session.url });
    } catch (e) {
        console.error('Erro ao criar sessão Stripe:', e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/payment-success', async (req, res) => {
    const { session_id, email, plan } = req.query;
    try {
        const config = await Config.findOne();
        if (!config || !config.stripeSecretKey) {
            return res.send('Erro: Stripe não configurado.');
        }

        if (!stripe) {
            stripe = require('stripe')(config.stripeSecretKey);
        }

        // Verificar sessão do Stripe
        let session = null;
        if (session_id) {
            session = await stripe.checkout.sessions.retrieve(session_id);
            if (session.payment_status !== 'paid') {
                return res.send('Pagamento não confirmado. Aguarde a confirmação.');
            }
        }

        const userEmail = email || (session && session.customer_email) || (session && session.metadata && session.metadata.email);
        const userPlan = plan || (session && session.metadata && session.metadata.plan) || 'monthly';
        
        // Determinar produto
        const productSlug = (session && session.metadata && (session.metadata.product || session.metadata.plugin_slug)) || 'binance-pix';
        const product = await Product.findOne({ slug: productSlug, active: true }) || 
                       await Product.findOne({ slug: 'binance-pix' });

        // Criar ou atualizar licença
        let license = await License.findOne({ email: userEmail, productSlug: productSlug });
        if (!license) {
            // Calcular datas de expiração baseadas no plano
            let trialExpiresAt = null;
            let planExpiresAt = null;
            
            if (userPlan === 'trial') {
                const trialDays = product ? (product.trialDays || 7) : 7;
                trialExpiresAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
            } else if (userPlan === 'monthly') {
                planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            } else if (userPlan === 'yearly') {
                planExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
            }
            
            license = await License.create({ 
                email: userEmail,
                key: generateLicenseKey(),
                productId: product ? product._id : null,
                productSlug: productSlug,
                plan: userPlan, 
                active: true,
                trialExpiresAt,
                planExpiresAt
            });
        } else {
            license.plan = userPlan;
            license.active = true;
            
            // Atualizar datas de expiração
            if (userPlan === 'trial') {
                const trialDays = product ? (product.trialDays || 7) : 7;
                license.trialExpiresAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
                license.planExpiresAt = null;
            } else if (userPlan === 'monthly') {
                license.planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                license.trialExpiresAt = null;
            } else if (userPlan === 'yearly') {
                license.planExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
                license.trialExpiresAt = null;
            }
            
            await license.save();
        }

        req.session.user = userEmail;
        req.session.role = 'client';
        
        // Enviar email com chave de licença
        await sendLicenseEmail(userEmail, license.key, userPlan);
        
        res.render('success', { 
            license_key: license.key, 
            email: userEmail 
        });
    } catch (e) { 
        console.error('Erro no payment-success:', e);
        res.send("Erro: " + e.message); 
    }
});


// Validação de email (função auxiliar)
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

app.post('/process-checkout',
    body ? [
        body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
        body('password').trim().isLength({ min: 3, max: 255 }).withMessage('Senha deve ter entre 3 e 255 caracteres')
    ] : [],
    validateRequest,
    async (req, res) => {
    const { email, password } = req.body;
    
    // Sanitizar inputs (já validados pelo express-validator)
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedPassword = password.trim();
    
    try {
        let user = await User.findOne({ email: sanitizedEmail });
        if (!user) {
            // Hash da senha antes de criar usuário
            const hashedPassword = await hashPassword(sanitizedPassword);
            await User.create({ email: sanitizedEmail, password: hashedPassword });
        }
        // Determinar produto (padrão: binance-pix)
        const productSlug = 'binance-pix';
        const product = await Product.findOne({ slug: productSlug, active: true }) || 
                       await Product.findOne({ slug: 'binance-pix' }); // Fallback
        
        if (!await License.findOne({ email: sanitizedEmail, productSlug: productSlug })) {
            const trialDays = product ? (product.trialDays || 7) : 7;
            const trialExpiresAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
            
            const newLicense = await License.create({ 
                email: sanitizedEmail, 
                key: generateLicenseKey(), 
                productId: product ? product._id : null,
                productSlug: productSlug,
                plan: 'trial', 
                active: true,
                trialExpiresAt
            });
            
            // Enviar email com chave de licença trial
            await sendLicenseEmail(sanitizedEmail, newLicense.key, 'trial', trialExpiresAt);
            
            // Registrar atividade
            await ActivityLog.create({
                email: sanitizedEmail,
                action: 'created',
                description: 'Licença criada manualmente - Plano: trial',
                adminUser: req.session.user || 'admin',
                metadata: { plan: 'trial', source: 'manual' }
            });
        }
        req.session.user = sanitizedEmail;
        req.session.role = 'client';
        res.redirect('/minha-conta');
    } catch (e) { 
        console.error('Erro em /process-checkout:', e);
        res.status(500).send("Erro interno do servidor");
    }
});

app.post('/api/validate', 
    rateLimit ? apiLimiter : (req, res, next) => next(),
    body ? [
        body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
        body('license_key').trim().isLength({ min: 10, max: 100 }).matches(/^LIVEX-/).withMessage('Formato de chave de licença inválido'),
        body('domain').optional().trim().isLength({ max: 255 }).withMessage('Domínio inválido'),
        body('product').optional().trim().isLength({ max: 50 }).withMessage('Produto inválido'),
        body('plugin_slug').optional().trim().isLength({ max: 50 }).withMessage('Plugin slug inválido')
    ] : [],
    validateRequest,
    async (req, res) => {
    try {
        // Validação e sanitização de input (já validado pelo express-validator)
        const { email, license_key, domain, product, plugin_slug } = req.body;
        
        // Sanitizar inputs
        const sanitizedEmail = email.trim().toLowerCase();
        const sanitizedKey = license_key.trim();
        const sanitizedDomain = domain ? domain.trim().toLowerCase() : null;
        
        // Determinar produto (suporte a múltiplos plugins)
        const productSlug = (product || plugin_slug || 'binance-pix').trim().toLowerCase();
        
        // Buscar licença com produto (chave única por produto)
        const license = await License.findOne({ 
            email: sanitizedEmail, 
            key: sanitizedKey,
            productSlug: productSlug
        });
        
        if (!license) {
            return res.status(401).json({ success: false, message: 'Licença inválida' });
        }
        
        if (!license.active) {
            return res.status(403).json({ success: false, message: 'Licença suspensa' });
        }
        
        // Verificar expiração do trial
        if (license.plan === 'trial' && license.trialExpiresAt) {
            const now = new Date();
            const trialExpiresAt = new Date(license.trialExpiresAt);
            
            if (now > trialExpiresAt) {
                // Trial expirado - desativar licença automaticamente
                license.active = false;
                license.updatedAt = new Date();
                await license.save();
                
                // Registrar atividade
                await ActivityLog.create({
                    email,
                    action: 'trial_expired',
                    description: 'Trial expirado - licença desativada automaticamente',
                    adminUser: 'system',
                    metadata: { expiredAt: trialExpiresAt }
                });
                
                return res.status(403).json({ 
                    success: false, 
                    message: 'Trial expirado. Por favor, assine um plano para continuar usando o plugin.' 
                });
            }
        }
        
        // Verificar status da assinatura Stripe (mesmo que não esteja expirada ainda)
        if (license.plan === 'monthly' || license.plan === 'yearly') {
            if (license.stripeSubscriptionId && stripe) {
                try {
                    const subscription = await stripe.subscriptions.retrieve(license.stripeSubscriptionId);

                    // Se a assinatura não está ativa/trialing, desativar a licença
                    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
                        license.active = false;
                        license.updatedAt = new Date();
                        await license.save();

                        return res.status(403).json({
                            success: false,
                            message: 'Assinatura cancelada ou inativa. Por favor, renove sua assinatura.'
                        });
                    }

                    // Atualizar data de expiração a partir do Stripe, se disponível
                    if (subscription.current_period_end) {
                        license.planExpiresAt = new Date(subscription.current_period_end * 1000);
                        license.updatedAt = new Date();
                        await license.save();
                    }
                } catch (stripeError) {
                    console.error('Erro ao verificar assinatura Stripe:', stripeError);
                    return res.status(403).json({
                        success: false,
                        message: 'Não foi possível verificar a assinatura no momento.'
                    });
                }
            }
        }

        // Verificar expiração do plano pago
        if ((license.plan === 'monthly' || license.plan === 'yearly') && license.planExpiresAt) {
            const now = new Date();
            const planExpiresAt = new Date(license.planExpiresAt);
            
            if (now > planExpiresAt) {
                // Plano expirado - verificar se há assinatura Stripe ativa
                if (license.stripeSubscriptionId && stripe) {
                    try {
                        const subscription = await stripe.subscriptions.retrieve(license.stripeSubscriptionId);
                        
                        if (subscription.status === 'active' || subscription.status === 'trialing') {
                            // Assinatura está ativa no Stripe - atualizar data de expiração
                            if (subscription.current_period_end) {
                                license.planExpiresAt = new Date(subscription.current_period_end * 1000);
                                license.updatedAt = new Date();
                                await license.save();
                                
                                // Continuar - licença válida
                            } else {
                                // Sem data de renovação - considerar expirado
                                license.active = false;
                                license.updatedAt = new Date();
                                await license.save();
                                
                                return res.status(403).json({ 
                                    success: false, 
                                    message: 'Plano expirado. Por favor, renove sua assinatura.' 
                                });
                            }
                        } else {
                            // Assinatura cancelada ou inativa
                            license.active = false;
                            license.updatedAt = new Date();
                            await license.save();
                            
                            return res.status(403).json({ 
                                success: false, 
                                message: 'Assinatura cancelada ou inativa. Por favor, renove sua assinatura.' 
                            });
                        }
                    } catch (stripeError) {
                        // Erro ao verificar Stripe - considerar expirado por segurança
                        console.error('Erro ao verificar assinatura Stripe:', stripeError);
                        return res.status(403).json({ 
                            success: false, 
                            message: 'Plano expirado. Por favor, verifique sua assinatura.' 
                        });
                    }
                } else {
                    // Sem assinatura Stripe - considerar expirado
                    license.active = false;
                    license.updatedAt = new Date();
                    await license.save();
                    
                    return res.status(403).json({ 
                        success: false, 
                        message: 'Plano expirado. Por favor, renove sua assinatura.' 
                    });
                }
            }
        }
        
        // Função auxiliar para normalizar domínio (remover www, normalizar)
        function normalizeDomain(domain) {
            if (!domain || domain === 'localhost') return domain;
            
            // Remover protocolo se presente
            domain = domain.replace(/^https?:\/\//, '');
            
            // Remover porta se presente
            domain = domain.replace(/:\d+$/, '');
            
            // Remover www. (opcional - permite www e não-www)
            const withoutWww = domain.replace(/^www\./, '');
            
            // Converter para lowercase
            return withoutWww.toLowerCase().trim();
        }
        
        // Normalizar domínio recebido
        const normalizedDomain = sanitizedDomain ? normalizeDomain(sanitizedDomain) : null;
        
        // Registrar domínio se não estiver registrado
        if (!license.domain && normalizedDomain && normalizedDomain !== 'localhost') {
            // Validar formato básico de domínio
            const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
            if (!domainRegex.test(normalizedDomain)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Formato de domínio inválido' 
                });
            }
            
            license.domain = normalizedDomain;
            license.updatedAt = new Date();
            await license.save();
            
            // Registrar atividade
            await ActivityLog.create({
                email: sanitizedEmail,
                action: 'domain_registered',
                description: `Domínio registrado automaticamente: ${normalizedDomain}`,
                adminUser: 'system',
                metadata: { domain: normalizedDomain }
            });
        }
        
        // Validar domínio se já estiver registrado
        if (license.domain && normalizedDomain && normalizedDomain !== 'localhost') {
            const normalizedLicenseDomain = normalizeDomain(license.domain);
            
            // Comparar domínios normalizados (permite www e não-www)
            if (normalizedLicenseDomain !== normalizedDomain) {
                // Verificar se é subdomínio do domínio registrado
                const isSubdomain = normalizedDomain.endsWith('.' + normalizedLicenseDomain);
                
                if (!isSubdomain) {
                    return res.status(403).json({ 
                        success: false, 
                        message: `Licença registrada para outro domínio: ${license.domain}. Domínio atual: ${sanitizedDomain}` 
                    });
                }
                
                // Se for subdomínio, atualizar domínio principal (opcional - pode ser configurável)
                // Por padrão, permitimos subdomínios sem atualizar
            }
        }
        
        // Licença válida
        return res.json({ 
            success: true,
            data: {
                plan: license.plan,
                active: license.active,
                trialExpiresAt: license.trialExpiresAt,
                planExpiresAt: license.planExpiresAt
            }
        });
    } catch (e) {
        console.error('Erro na validação de licença:', e);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

app.get('/download-plugin', requireAuth, (req, res) => {
    try {
        const zip = new AdmZip();
        const pluginPath = path.join(__dirname, '../woocommerce-binance-pix');
        if (fs.existsSync(pluginPath)) {
            zip.addLocalFolder(pluginPath, 'woocommerce-binance-pix');
            res.set('Content-Type', 'application/octet-stream');
            res.set('Content-Disposition', `attachment; filename=WooCommerce-Binance-Pix.zip`);
            res.send(zip.toBuffer());
        } else {
            res.status(404).send('Plugin não encontrado.');
        }
    } catch (e) { res.status(500).send('Erro no download.'); }
});

// Página de log de atividades do admin
app.get('/admin/activity-log', requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        const filterAction = req.query.action || 'all';
        
        let query = {};
        if (filterAction !== 'all') {
            query.action = filterAction;
        }
        
        const activities = await AdminActivityLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        
        const totalActivities = await AdminActivityLog.countDocuments(query);
        const totalPages = Math.ceil(totalActivities / limit);
        
        // Estatísticas
        const stats = {
            total: totalActivities,
            today: await AdminActivityLog.countDocuments({
                createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
            }),
            thisWeek: await AdminActivityLog.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            })
        };
        
        // Buscar notificações não lidas para o menu
        const unreadNotifications = await Notification.find({ read: false })
            .sort({ createdAt: -1 })
            .limit(10);
        const totalUnreadNotifications = await Notification.countDocuments({ read: false });
        
        res.render('admin-activity-log', {
            activities,
            currentPage: 'atividades',
            notifications: {
                unread: unreadNotifications,
                totalUnread: totalUnreadNotifications
            },
            pagination: {
                page,
                limit,
                totalPages,
                totalActivities,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            filterAction,
            stats
        });
    } catch (e) {
        res.redirect('/admin?error=' + encodeURIComponent(e.message));
    }
});

// Marcar notificação como lida
app.post('/admin/notification/:id/read', requireAdmin, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (notification) {
            notification.read = true;
            await notification.save();
        }
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// Marcar todas as notificações como lidas
app.post('/admin/notifications/read-all', requireAdmin, async (req, res) => {
    try {
        await Notification.updateMany({ read: false }, { read: true });
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// Página de notificações
app.get('/admin/notifications', requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        const filterType = req.query.type || 'all';
        const filterRead = req.query.read || 'all';
        
        let query = {};
        if (filterType !== 'all') {
            query.type = filterType;
        }
        if (filterRead !== 'all') {
            query.read = filterRead === 'read';
        }
        
        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        
        const totalNotifications = await Notification.countDocuments(query);
        const totalPages = Math.ceil(totalNotifications / limit);
        const totalUnread = await Notification.countDocuments({ read: false });
        
        res.render('notifications', {
            notifications,
            currentPage: 'notificacoes',
            notificationsMenu: {
                unread: notifications.filter(n => !n.read),
                totalUnread: totalUnread
            },
            pagination: {
                page,
                limit,
                totalPages,
                totalNotifications,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            filterType,
            filterRead,
            totalUnread
        });
    } catch (e) {
        res.redirect('/admin?error=' + encodeURIComponent(e.message));
    }
});

// Exportar lista de clientes (CSV)
app.get('/admin/export-csv', requireAdmin, async (req, res) => {
    try {
        // Filtrar por produto se especificado
        const query = {};
        if (req.query.product && req.query.product !== 'all') {
            query.productSlug = req.query.product;
        }
        
        const licenses = await License.find(query).populate('productId', 'name slug').sort({ createdAt: -1 });
        
        // Cabeçalho CSV (incluindo produto)
        let csv = 'Email,Chave de Licença,Produto,Plano,Domínio,Status,Data de Criação,Última Atualização\n';
        
        // Dados
        licenses.forEach(license => {
            const email = `"${license.email}"`;
            const key = `"${license.key}"`;
            const plan = license.plan;
            const domain = license.domain ? `"${license.domain}"` : '';
            const product = (license.productId && typeof license.productId === 'object' && license.productId.name) 
                          ? license.productId.name 
                          : (license.productSlug || 'Padrão');
            const status = license.active ? 'Ativo' : 'Bloqueado';
            const createdAt = new Date(license.createdAt).toLocaleString('pt-BR');
            const updatedAt = license.updatedAt ? new Date(license.updatedAt).toLocaleString('pt-BR') : '';
            
            csv += `${email},${key},${product},${plan},${domain},${status},${createdAt},${updatedAt}\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=clientes-${new Date().toISOString().split('T')[0]}.csv`);
        res.send('\ufeff' + csv); // BOM para Excel reconhecer UTF-8
    } catch (e) {
        res.status(500).send('Erro ao exportar: ' + e.message);
    }
});

// Rota para deletar cliente completamente
app.post('/admin/delete-client', requireAdmin, 
    async (req, res) => {
    try {
        const { email } = req.body;
        
        // Validar email
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ success: false, message: 'Email é obrigatório' });
        }
        
        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Email inválido' });
        }
        
        // Sanitizar email
        const sanitizedEmail = email.trim().toLowerCase();

        // 1. Buscar licença para confirmar que existe
        const license = await License.findOne({ email: sanitizedEmail });
        if (!license) {
            return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
        }

        // 2. Deletar em ordem (para evitar referências órfãs)
        await ActivityLog.deleteMany({ email: sanitizedEmail });
        await Notification.deleteMany({ email: sanitizedEmail });
        await User.deleteOne({ email: sanitizedEmail });
        await License.deleteOne({ email: sanitizedEmail });

        // 3. Registrar ação no log do admin (com tratamento de erro)
        try {
            await AdminActivityLog.create({
                adminUser: req.session.user || 'admin',
                action: 'delete_client',
                description: `Cliente ${sanitizedEmail} deletado completamente do sistema`,
                targetEmail: sanitizedEmail
            });
        } catch (logError) {
            // Não falhar a operação se o log falhar, apenas registrar
            console.error('Erro ao registrar log de atividade (não crítico):', logError);
        }

        res.json({ success: true, message: 'Cliente excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar cliente:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir cliente: ' + error.message });
    }
});

// 8. Documentação
app.get('/docs', (req, res) => {
    res.render('docs');
});

// Endpoint para documentação OpenAPI/Swagger
app.get('/api-docs', (req, res) => {
    const swaggerDoc = require('./swagger.json');
    res.json(swaggerDoc);
});

// Swagger UI (se swagger-ui-express estiver instalado)
let swaggerUi = null;
try {
    swaggerUi = require('swagger-ui-express');
    const swaggerDocument = require('./swagger.json');
    app.use('/api-docs-ui', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    console.log('✅ Swagger UI disponível em /api-docs-ui');
} catch (e) {
    console.log('⚠️ swagger-ui-express não instalado. Para habilitar interface Swagger, execute: npm install swagger-ui-express');
    console.log('📖 Documentação OpenAPI disponível em /api-docs (JSON)');
}

function startServer(port) {
    const server = app.listen(port, () => {
        console.log(`\n✅ Servidor rodando: http://localhost:${port}`);
        console.log(`📋 Acesse: http://localhost:${port}`);
        console.log(`🔐 Admin: http://localhost:${port}/acesso-admin`);
    });
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`⚠️ Porta ${port} ocupada, tentando ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error('❌ Erro ao iniciar servidor:', err.message);
        }
    });
}

startServer(PORT);
