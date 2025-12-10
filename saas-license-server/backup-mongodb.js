/**
 * Script de Backup do MongoDB
 * 
 * Este script cria um backup do banco de dados MongoDB
 * Pode ser executado manualmente ou agendado via cron
 * 
 * Uso:
 *   node backup-mongodb.js
 * 
 * Variáveis de ambiente:
 *   MONGODB_URI - URI de conexão do MongoDB
 *   BACKUP_DIR - Diretório para salvar backups (padrão: ./backups)
 *   BACKUP_RETENTION_DAYS - Dias para manter backups (padrão: 7)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Carregar variáveis de ambiente
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/cryptosaas';
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, 'backups');
const BACKUP_RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS) || 7;

// Extrair informações da URI
function parseMongoUri(uri) {
    try {
        // Formato: mongodb://[user:pass@]host[:port]/database
        const match = uri.match(/mongodb(?:\+srv)?:\/\/(?:([^:]+):([^@]+)@)?([^\/]+)\/([^?]+)/);
        if (match) {
            return {
                user: match[1] || null,
                password: match[2] || null,
                host: match[3],
                database: match[4]
            };
        }
    } catch (e) {
        console.error('Erro ao parsear URI do MongoDB:', e.message);
    }
    return null;
}

// Criar backup usando mongodump
function createBackup() {
    try {
        // Criar diretório de backup se não existir
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
            console.log(`✅ Diretório de backup criado: ${BACKUP_DIR}`);
        }

        const uriInfo = parseMongoUri(MONGODB_URI);
        if (!uriInfo) {
            throw new Error('Não foi possível parsear URI do MongoDB');
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}`);

        console.log(`📦 Iniciando backup do MongoDB...`);
        console.log(`   Database: ${uriInfo.database}`);
        console.log(`   Destino: ${backupPath}`);

        // Construir comando mongodump
        let command = 'mongodump';
        
        // Adicionar opções baseadas na URI
        if (MONGODB_URI.includes('mongodb+srv')) {
            // MongoDB Atlas
            command += ` --uri "${MONGODB_URI}"`;
        } else {
            // MongoDB local ou remoto
            if (uriInfo.user && uriInfo.password) {
                command += ` --username "${uriInfo.user}" --password "${uriInfo.password}"`;
            }
            command += ` --host "${uriInfo.host}"`;
            command += ` --db "${uriInfo.database}"`;
        }
        
        command += ` --out "${backupPath}"`;

        // Executar backup
        execSync(command, { stdio: 'inherit' });

        // Compactar backup
        const zipPath = `${backupPath}.tar.gz`;
        console.log(`📦 Compactando backup...`);
        execSync(`tar -czf "${zipPath}" -C "${BACKUP_DIR}" "backup-${timestamp}"`, { stdio: 'inherit' });
        
        // Remover diretório não compactado
        fs.rmSync(backupPath, { recursive: true, force: true });

        console.log(`✅ Backup criado com sucesso: ${zipPath}`);
        
        // Limpar backups antigos
        cleanupOldBackups();
        
        return zipPath;
    } catch (error) {
        console.error('❌ Erro ao criar backup:', error.message);
        process.exit(1);
    }
}

// Limpar backups antigos
function cleanupOldBackups() {
    try {
        const files = fs.readdirSync(BACKUP_DIR);
        const now = Date.now();
        const retentionMs = BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
        let deletedCount = 0;

        files.forEach(file => {
            if (file.startsWith('backup-') && file.endsWith('.tar.gz')) {
                const filePath = path.join(BACKUP_DIR, file);
                const stats = fs.statSync(filePath);
                const fileAge = now - stats.mtimeMs;

                if (fileAge > retentionMs) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                    console.log(`🗑️  Backup antigo removido: ${file}`);
                }
            }
        });

        if (deletedCount > 0) {
            console.log(`✅ ${deletedCount} backup(s) antigo(s) removido(s)`);
        }
    } catch (error) {
        console.error('⚠️  Erro ao limpar backups antigos:', error.message);
    }
}

// Listar backups existentes
function listBackups() {
    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            console.log('📁 Nenhum backup encontrado.');
            return;
        }

        const files = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.startsWith('backup-') && file.endsWith('.tar.gz'))
            .map(file => {
                const filePath = path.join(BACKUP_DIR, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    size: stats.size,
                    date: stats.mtime
                };
            })
            .sort((a, b) => b.date - a.date);

        if (files.length === 0) {
            console.log('📁 Nenhum backup encontrado.');
            return;
        }

        console.log(`\n📁 Backups encontrados (${files.length}):\n`);
        files.forEach((file, index) => {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            console.log(`  ${index + 1}. ${file.name}`);
            console.log(`     Tamanho: ${sizeMB} MB`);
            console.log(`     Data: ${file.date.toLocaleString('pt-BR')}\n`);
        });
    } catch (error) {
        console.error('❌ Erro ao listar backups:', error.message);
    }
}

// Função principal
function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'backup';

    console.log('🔒 Sistema de Backup MongoDB\n');

    switch (command) {
        case 'backup':
            createBackup();
            break;
        case 'list':
            listBackups();
            break;
        case 'cleanup':
            cleanupOldBackups();
            break;
        default:
            console.log('Uso: node backup-mongodb.js [backup|list|cleanup]');
            console.log('\nComandos:');
            console.log('  backup  - Criar novo backup (padrão)');
            console.log('  list    - Listar backups existentes');
            console.log('  cleanup - Limpar backups antigos');
            process.exit(1);
    }
}

// Executar
if (require.main === module) {
    main();
}

module.exports = { createBackup, cleanupOldBackups, listBackups };
