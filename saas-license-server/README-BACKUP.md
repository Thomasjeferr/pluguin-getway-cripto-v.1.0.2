# 💾 Guia de Backup - MongoDB

Este guia explica como usar o sistema de backup automático do MongoDB.

---

## 📋 Pré-requisitos

1. **mongodump** instalado no sistema
   - Windows: Baixe do [MongoDB Download Center](https://www.mongodb.com/try/download/database-tools)
   - Linux: `sudo apt-get install mongodb-database-tools` ou `sudo yum install mongodb-database-tools`
   - macOS: `brew install mongodb-database-tools`

2. **tar** e **gzip** (geralmente já instalados no Linux/macOS)
   - Windows: Use Git Bash ou WSL

---

## 🚀 Uso Básico

### Criar Backup

```bash
cd saas-license-server
npm run backup
```

Ou diretamente:

```bash
node backup-mongodb.js backup
```

### Listar Backups

```bash
npm run backup:list
```

Ou:

```bash
node backup-mongodb.js list
```

### Limpar Backups Antigos

```bash
npm run backup:cleanup
```

Ou:

```bash
node backup-mongodb.js cleanup
```

---

## ⚙️ Configuração

### Variáveis de Ambiente

Crie ou edite o arquivo `.env`:

```env
# URI do MongoDB
MONGODB_URI=mongodb://localhost:27017/cryptosaas
# OU para MongoDB Atlas:
# MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/cryptosaas

# Diretório de backup (padrão: ./backups)
BACKUP_DIR=./backups

# Dias para manter backups (padrão: 7)
BACKUP_RETENTION_DAYS=7
```

---

## 📅 Agendamento Automático

### Linux/macOS (Cron)

Edite o crontab:

```bash
crontab -e
```

Adicione linha para backup diário às 2h da manhã:

```cron
0 2 * * * cd /caminho/para/saas-license-server && /usr/bin/node backup-mongodb.js backup >> /var/log/mongodb-backup.log 2>&1
```

### Windows (Task Scheduler)

1. Abra o **Agendador de Tarefas**
2. Crie uma nova tarefa
3. Configure:
   - **Ação:** Iniciar programa
   - **Programa:** `node`
   - **Argumentos:** `backup-mongodb.js backup`
   - **Diretório inicial:** `C:\caminho\para\saas-license-server`
   - **Agendamento:** Diário às 2h

### Usando PM2 (Recomendado)

Se você usa PM2 para gerenciar o servidor:

```bash
# Instalar PM2
npm install -g pm2

# Criar script de backup
pm2 start backup-mongodb.js --name "mongodb-backup" --cron "0 2 * * *" --no-autorestart
```

---

## 📁 Estrutura de Backups

Os backups são salvos em:

```
saas-license-server/
  backups/
    backup-2025-12-08T02-00-00.tar.gz
    backup-2025-12-09T02-00-00.tar.gz
    ...
```

Formato do nome: `backup-YYYY-MM-DDTHH-MM-SS.tar.gz`

---

## 🔄 Restaurar Backup

### Descompactar Backup

```bash
cd backups
tar -xzf backup-2025-12-08T02-00-00.tar.gz
```

### Restaurar com mongorestore

```bash
# MongoDB local
mongorestore --host localhost:27017 --db cryptosaas backup-2025-12-08T02-00-00/cryptosaas

# MongoDB Atlas
mongorestore --uri "mongodb+srv://usuario:senha@cluster.mongodb.net/cryptosaas" backup-2025-12-08T02-00-00/cryptosaas
```

---

## ⚠️ Importante

1. **Teste os backups regularmente** - Um backup que não pode ser restaurado é inútil
2. **Armazene backups em local seguro** - Considere copiar para cloud storage (S3, Google Drive, etc.)
3. **Monitore espaço em disco** - Backups podem ocupar muito espaço
4. **Documente o processo de restore** - Em caso de emergência, você precisa saber como restaurar

---

## 🔐 Segurança

- Backups contêm dados sensíveis (senhas, chaves, etc.)
- Armazene backups em local seguro
- Use criptografia se armazenar em cloud
- Não compartilhe backups publicamente

---

## 📊 Monitoramento

### Verificar Tamanho dos Backups

```bash
du -sh backups/
```

### Verificar Último Backup

```bash
ls -lh backups/ | tail -1
```

### Verificar Espaço em Disco

```bash
df -h
```

---

## 🐛 Troubleshooting

### "mongodump: command not found"

**Solução:** Instale o MongoDB Database Tools

### "Permission denied"

**Solução:** Verifique permissões do diretório de backup:
```bash
chmod 755 backups/
```

### "Authentication failed"

**Solução:** Verifique credenciais no `MONGODB_URI`

### "Connection refused"

**Solução:** Verifique se MongoDB está rodando e acessível

---

**Última atualização:** 08/12/2025
