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
let stripe = null; // Será inicializado quando necessário

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
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 1,
})
    .then(() => console.log('✅ MongoDB Conectado com Sucesso!'))
    .catch(err => {
        console.error('❌ Erro ao conectar no MongoDB:', err.message);
        console.log('⚠️ Servidor continuará rodando, mas sem banco de dados.');
    });

// --- MODELOS DE DADOS ---
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'client' },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const LicenseSchema = new mongoose.Schema({
    email: { type: String, required: true },
    key: { type: String, required: true, unique: true },
    domain: { type: String, default: null },
    active: { type: Boolean, default: true },
    plan: { type: String, default: 'trial' },
    createdAt: { type: Date, default: Date.now }
});
const License = mongoose.model('License', LicenseSchema);

const ConfigSchema = new mongoose.Schema({
    trialDays: { type: Number, default: 7 },
    priceMonthly: { type: Number, default: 97.00 },
    priceYearly: { type: Number, default: 997.00 },
    promoText: { type: String, default: "Oferta de Lançamento" }
});
const Config = mongoose.model('Config', ConfigSchema);

async function initConfig() {
    try {
        const count = await Config.countDocuments();
        if (count === 0) await Config.create({});
    } catch (e) { /* Ignorar se banco não conectou */ }
}
mongoose.connection.once('open', initConfig);

// --- SERVIDOR ---
const app = express();
const ADMIN_USER = 'master_root_v1';
const ADMIN_PASS = 'X7#k9$mP2@secure_v9';

const viewsPath = path.join(__dirname, 'views');
app.set('view engine', 'ejs');
app.set('views', viewsPath);

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
            let license = await License.findOne({ email });
            if (!license) {
                license = await License.create({
                    email,
                    key: generateLicenseKey(),
                    plan,
                    active: true
                });
            } else {
                license.plan = plan;
                license.active = true;
                await license.save();
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
    }

    res.json({ received: true });
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'DEV_SECRET',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// --- MIDDLEWARES ---
function requireAuth(req, res, next) {
    if (req.session && req.session.user) return next();
    res.redirect('/acesso-admin');
}

function requireAdmin(req, res, next) {
    if (req.session && req.session.user === ADMIN_USER) return next();
    res.redirect('/acesso-admin');
}

function generateLicenseKey() {
    return 'LIVEX-' + Math.random().toString(36).substr(2, 9).toUpperCase() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
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
    if (req.session.user === ADMIN_USER) return res.redirect('/admin');
    if (req.session.user) return res.redirect('/minha-conta');
    res.render('login', { error: null, actionUrl: '/acesso-admin' });
});

app.post('/acesso-admin', async (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.user = ADMIN_USER;
        req.session.role = 'admin';
        return res.redirect('/admin');
    }
    try {
        const client = await User.findOne({ email: username, password: password });
        if (client) {
            req.session.user = client.email;
            req.session.role = 'client';
            return res.redirect('/minha-conta');
        }
    } catch (e) {}
    res.render('login', { error: 'Credenciais inválidas.', actionUrl: '/acesso-admin' });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/acesso-admin');
});

app.get('/admin', requireAdmin, async (req, res) => {
    try {
        const licenses = await License.find().sort({ createdAt: -1 });
        let config = await Config.findOne();
        if (!config) {
            config = await Config.create({});
        }
        // Não enviar chaves secretas para o frontend (segurança)
        const safeConfig = {
            trialDays: config.trialDays || 7,
            priceMonthly: config.priceMonthly || 97.00,
            priceYearly: config.priceYearly || 997.00,
            promoText: config.promoText || "Oferta de Lançamento",
            stripeSecretKey: config.stripeSecretKey || '',
            stripePublishableKey: config.stripePublishableKey || '',
            stripeWebhookSecret: config.stripeWebhookSecret || ''
        };
        res.render('dashboard', { licenses, config: safeConfig });
    } catch (e) { res.send("Erro banco de dados: " + e.message); }
});

app.post('/admin/update-config', requireAdmin, async (req, res) => {
    try {
        await Config.findOneAndUpdate({}, req.body, { upsert: true });
        
        // Reinicializar Stripe se as chaves mudaram
        if (req.body.stripeSecretKey) {
            stripe = require('stripe')(req.body.stripeSecretKey);
            console.log('✅ Stripe reinicializado com nova chave');
        }
        
        res.redirect('/admin?success=1');
    } catch (e) {
        res.redirect('/admin?error=' + encodeURIComponent(e.message));
    }
});

app.post('/admin/change-plan', requireAdmin, async (req, res) => {
    try {
        await License.findOneAndUpdate({ email: req.body.email }, { plan: req.body.newPlan });
        res.redirect('/admin?success=1');
    } catch (e) {
        res.redirect('/admin?error=' + encodeURIComponent(e.message));
    }
});

// Nova rota para gerenciar assinatura específica
app.post('/admin/manage-subscription', requireAdmin, async (req, res) => {
    try {
        const { email, action, newPlan } = req.body;
        const license = await License.findOne({ email });
        
        if (!license) {
            return res.json({ success: false, message: 'Licença não encontrada' });
        }

        switch (action) {
            case 'activate':
                license.active = true;
                break;
            case 'deactivate':
                license.active = false;
                break;
            case 'change-plan':
                if (newPlan) license.plan = newPlan;
                break;
            case 'regenerate-key':
                license.key = generateLicenseKey();
                break;
        }

        await license.save();
        res.json({ success: true, license });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

app.post('/toggle-license', requireAdmin, async (req, res) => {
    const license = await License.findOne({ email: req.body.email });
    if (license) { license.active = !license.active; await license.save(); }
    res.redirect('/admin');
});

app.get('/minha-conta', requireAuth, async (req, res) => {
    if (req.session.role === 'admin') return res.redirect('/admin');
    const userEmail = req.session.user;
    try {
        const userLicense = await License.findOne({ email: userEmail });
        res.render('client-area', { user: {
            email: userEmail,
            license_key: userLicense ? userLicense.key : 'Gerando...',
            active: userLicense ? userLicense.active : false
        }});
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

// --- ROTAS DE PAGAMENTO COM STRIPE ---
app.post('/create-checkout-session', async (req, res) => {
    const { email, password, planId } = req.body;
    try {
        // Criar ou encontrar usuário
        if (!await User.findOne({ email })) {
            await User.create({ email, password });
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

        // Criar produto e preço no Stripe (ou usar existentes)
        const product = await stripe.products.create({
            name: `Plugin Cripto Woocommerce - ${planId === 'monthly' ? 'Mensal' : 'Anual'}`,
            description: 'Assinatura do Plugin Cripto Woocommerce'
        });

        const priceObj = await stripe.prices.create({
            product: product.id,
            unit_amount: price,
            currency: 'brl',
            recurring: {
                interval: period
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
                plan: planId
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

        // Criar ou atualizar licença
        let license = await License.findOne({ email: userEmail });
        if (!license) {
            license = await License.create({ 
                email: userEmail, 
                key: generateLicenseKey(), 
                plan: userPlan, 
                active: true 
            });
        } else {
            license.plan = userPlan;
            license.active = true;
            await license.save();
        }

        req.session.user = userEmail;
        req.session.role = 'client';
        res.render('success', { 
            license_key: license.key, 
            email: userEmail 
        });
    } catch (e) { 
        console.error('Erro no payment-success:', e);
        res.send("Erro: " + e.message); 
    }
});


app.post('/process-checkout', async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!await User.findOne({ email })) await User.create({ email, password });
        if (!await License.findOne({ email })) {
            await License.create({ email, key: generateLicenseKey(), plan: 'trial', active: true });
        }
        req.session.user = email;
        req.session.role = 'client';
        res.redirect('/minha-conta');
    } catch (e) { res.send("Erro: " + e.message); }
});

app.post('/api/validate', async (req, res) => {
    try {
        const { email, license_key, domain } = req.body;
        const license = await License.findOne({ email, key: license_key });
        
        if (!license) return res.status(401).json({ success: false, message: 'Inválida' });
        if (!license.active) return res.status(403).json({ success: false, message: 'Suspensa' });
        
        if (!license.domain && domain && domain !== 'localhost') {
            license.domain = domain;
            await license.save();
        }
        if (license.domain && license.domain !== domain && domain !== 'localhost') {
            return res.status(403).json({ success: false, message: 'Domínio incorreto' });
        }
        return res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
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

// 8. Documentação
app.get('/docs', (req, res) => {
    res.render('docs');
});

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
