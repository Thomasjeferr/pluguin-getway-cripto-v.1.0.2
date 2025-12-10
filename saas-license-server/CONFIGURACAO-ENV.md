# 🔧 Configuração de Variáveis de Ambiente

## ⚠️ Problema: Servidor não inicia

Se você está vendo o erro:
```
❌ ERRO CRÍTICO: ADMIN_USER e ADMIN_PASS devem estar definidos em produção!
```

Isso significa que o servidor está tentando rodar em modo **produção**, mas as credenciais não estão configuradas.

## ✅ Solução Rápida para Desenvolvimento

### Opção 1: Criar arquivo `.env` (Recomendado)

Crie um arquivo `.env` na pasta `saas-license-server/` com:

```env
# Modo desenvolvimento (permite credenciais padrão)
NODE_ENV=development

# Credenciais Admin (opcional em desenvolvimento)
# Se não definir, serão usados valores padrão:
# ADMIN_USER=master_root_v1
# ADMIN_PASS=X7#k9$mP2@secure_v9
ADMIN_USER=master_root_v1
ADMIN_PASS=X7#k9$mP2@secure_v9

# MongoDB
MONGO_URI=mongodb://localhost:27017/cryptosaas

# Porta
PORT=5000

# Session Secret
SESSION_SECRET=DEV_SECRET_CHANGE_IN_PRODUCTION
```

### Opção 2: Definir variáveis no terminal (Windows PowerShell)

```powershell
$env:NODE_ENV="development"
$env:ADMIN_USER="master_root_v1"
$env:ADMIN_PASS="X7#k9$mP2@secure_v9"
npm start
```

### Opção 3: Definir variáveis no terminal (Linux/Mac)

```bash
export NODE_ENV=development
export ADMIN_USER=master_root_v1
export ADMIN_PASS=X7#k9$mP2@secure_v9
npm start
```

## 🚀 Configuração para Produção

Para produção, você **DEVE** configurar credenciais seguras:

```env
# Modo produção (exige credenciais seguras)
NODE_ENV=production

# Credenciais Admin (OBRIGATÓRIO em produção)
# A senha deve ter:
# - Pelo menos 12 caracteres
# - Letras maiúsculas e minúsculas
# - Números
# - Caracteres especiais (!@#$%^&*(),.?":{}|<>)
ADMIN_USER=seu_usuario_admin_seguro
ADMIN_PASS=SuaSenhaMuitoSegura123!@#

# MongoDB (produção)
MONGO_URI=mongodb://usuario:senha@host:porta/database

# Porta
PORT=5000

# Session Secret (gere uma string aleatória)
# Use: openssl rand -base64 32
SESSION_SECRET=sua_chave_secreta_aleatoria_aqui

# Frontend URL
FRONTEND_URL=https://seudominio.com
```

## 📋 Variáveis Disponíveis

| Variável | Obrigatória | Padrão | Descrição |
|----------|-------------|--------|-----------|
| `NODE_ENV` | Não | `development` | Ambiente: `development` ou `production` |
| `ADMIN_USER` | Sim (produção) | `master_root_v1` | Usuário admin |
| `ADMIN_PASS` | Sim (produção) | `X7#k9$mP2@secure_v9` | Senha admin |
| `MONGO_URI` | Não | `mongodb://localhost:27017/cryptosaas` | URI do MongoDB |
| `PORT` | Não | `5000` | Porta do servidor |
| `SESSION_SECRET` | Não | `DEV_SECRET` | Secret para sessões |
| `FRONTEND_URL` | Não | `http://localhost:5000` | URL base do frontend |

## 🔒 Segurança

- **NUNCA** commite o arquivo `.env` no Git
- Em produção, use credenciais fortes e únicas
- Gere `SESSION_SECRET` aleatório para produção
- Use MongoDB com autenticação em produção

## ❓ Problemas Comuns

### "ERRO CRÍTICO: ADMIN_USER e ADMIN_PASS devem estar definidos em produção!"

**Causa:** `NODE_ENV=production` está definido, mas credenciais não estão configuradas.

**Solução:** 
1. Defina `NODE_ENV=development` no `.env`, OU
2. Configure `ADMIN_USER` e `ADMIN_PASS` no `.env`

### Servidor inicia mas não conecta ao MongoDB

**Causa:** MongoDB não está rodando ou URI incorreta.

**Solução:** 
1. Inicie o MongoDB: `mongod` ou `brew services start mongodb-community`
2. Verifique se `MONGO_URI` está correto no `.env`
