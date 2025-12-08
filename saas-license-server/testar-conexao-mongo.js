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

console.log('🔍 Testando conexão com MongoDB...\n');
console.log('URI:', cleanMongoUri.replace(/:[^:@]+@/, ':****@')); // Esconde senha

mongoose.connect(cleanMongoUri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
})
    .then(async () => {
        console.log('✅ MongoDB Conectado com Sucesso!\n');
        
        // Testar operações
        console.log('📊 Testando operações no banco...');
        
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log(`\n📁 Coleções encontradas: ${collections.length}`);
        collections.forEach(col => {
            console.log(`   - ${col.name}`);
        });
        
        // Testar uma query simples
        const User = mongoose.model('User', new mongoose.Schema({
            email: String,
            password: String,
            role: String,
            createdAt: Date
        }));
        
        const userCount = await User.countDocuments();
        console.log(`\n👥 Usuários no banco: ${userCount}`);
        
        console.log('\n✅ Tudo funcionando perfeitamente!');
        console.log('\n💡 Nota: O MongoDB Atlas não mostra aplicações Node.js automaticamente');
        console.log('   na seção "Application Development". Isso é normal e não afeta');
        console.log('   o funcionamento do seu servidor.\n');
        
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Erro ao conectar:', err.message);
        process.exit(1);
    });
