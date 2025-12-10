// Script para testar criação de cliente
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Carregar .env
try {
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
    }
} catch (err) {
    console.log('Erro ao ler .env:', err.message);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cryptosaas';

// Limpar URI
let cleanMongoUri = MONGO_URI;
cleanMongoUri = cleanMongoUri.replace(/[?&]appName=\s*/gi, '');
cleanMongoUri = cleanMongoUri.replace(/[?&]appName=$/gi, '');
cleanMongoUri = cleanMongoUri.replace(/\?\?/g, '?').replace(/&&/g, '&');
cleanMongoUri = cleanMongoUri.replace(/[?&]$/, '');

console.log('🔌 Conectando ao MongoDB...');
console.log('📍 URI:', cleanMongoUri.replace(/:[^:@]+@/, ':****@'));

mongoose.connect(cleanMongoUri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
})
    .then(async () => {
        console.log('✅ MongoDB Conectado!\n');
        
        // Importar modelos
        const UserSchema = new mongoose.Schema({
            email: { type: String, required: true, unique: true, lowercase: true, trim: true },
            password: { type: String, required: true, minlength: 3 },
            role: { type: String, default: 'client' },
            createdAt: { type: Date, default: Date.now }
        });
        
        const LicenseSchema = new mongoose.Schema({
            email: { type: String, required: true, lowercase: true, trim: true },
            key: { type: String, required: true, unique: true },
            productSlug: { type: String, default: 'binance-pix' },
            plan: { type: String, default: 'trial', enum: ['trial', 'monthly', 'yearly'] },
            active: { type: Boolean, default: true },
            domain: { type: String, default: null },
            notes: { type: String, default: '' },
            trialExpiresAt: { type: Date, default: null },
            planExpiresAt: { type: Date, default: null },
            createdAt: { type: Date, default: Date.now }
        });
        
        const User = mongoose.model('User', UserSchema);
        const License = mongoose.model('License', LicenseSchema);
        
        // Testar criação
        const testEmail = 'teste-' + Date.now() + '@exemplo.com';
        const testPassword = 'senha123456';
        
        console.log('🧪 Testando criação de cliente...');
        console.log('📧 Email:', testEmail);
        
        // Verificar se já existe
        const existingUser = await User.findOne({ email: testEmail });
        if (existingUser) {
            console.log('⚠️ Usuário já existe, removendo...');
            await User.deleteOne({ email: testEmail });
        }
        
        const existingLicense = await License.findOne({ email: testEmail });
        if (existingLicense) {
            console.log('⚠️ Licença já existe, removendo...');
            await License.deleteOne({ email: testEmail });
        }
        
        // Criar usuário
        console.log('👤 Criando usuário...');
        const user = await User.create({
            email: testEmail,
            password: testPassword,
            role: 'client'
        });
        console.log('✅ Usuário criado! ID:', user._id);
        
        // Criar licença
        console.log('🔑 Criando licença...');
        const licenseKey = 'LIVEX-TEST-' + Date.now().toString(36).toUpperCase();
        const license = await License.create({
            email: testEmail,
            key: licenseKey,
            productSlug: 'binance-pix',
            plan: 'trial',
            active: true,
            trialExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
        console.log('✅ Licença criada! ID:', license._id);
        console.log('🔑 Chave:', licenseKey);
        
        // Verificar se foi salvo
        const savedUser = await User.findOne({ email: testEmail });
        const savedLicense = await License.findOne({ email: testEmail });
        
        console.log('\n✅ === TESTE CONCLUÍDO COM SUCESSO ===');
        console.log('👤 Usuário salvo:', !!savedUser);
        console.log('🔑 Licença salva:', !!savedLicense);
        
        // Limpar teste
        console.log('\n🧹 Limpando dados de teste...');
        await User.deleteOne({ email: testEmail });
        await License.deleteOne({ email: testEmail });
        console.log('✅ Dados de teste removidos');
        
        console.log('\n✅ Banco de dados está funcionando corretamente!');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Erro:', err.message);
        console.error('❌ Stack:', err.stack);
        process.exit(1);
    });


