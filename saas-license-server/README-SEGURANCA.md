# 🔒 Guia de Segurança - Servidor SaaS

## ⚠️ IMPORTANTE: Configuração de Segurança

Este guia descreve as melhorias de segurança implementadas e como configurá-las corretamente.

---

## ✅ Melhorias Implementadas

### 1. **Credenciais Admin em Variáveis de Ambiente**
- ✅ Credenciais admin agora são carregadas de variáveis de ambiente
- ✅ Aviso exibido se valores padrão estiverem sendo usados
- ✅ Comparação segura de strings (evita timing attacks)

### 2. **Rate Limiting**
- ✅ Rate limiting geral: 100 requisições por IP a cada 15 minutos
- ✅ Rate limiting para login: 5 tentativas por IP a cada 15 minutos
- ✅ Rate limiting para API: 30 requisições por minuto por IP

### 3. **Helmet.js (Headers de Segurança)**
- ✅ Content Security Policy configurado
- ✅ Headers de segurança HTTP implementados
- ✅ Proteção contra XSS, clickjacking, etc.

### 4. **Validação de Input**
- ✅ Validação de formato de email
- ✅ Validação de formato de chave de licença
- ✅ Validação de formato de domínio
- ✅ Sanitização de todos os inputs
- ✅ Validação nos schemas MongoDB

### 5. **Índices de Performance**
- ✅ Índices adicionados em campos frequentemente consultados
- ✅ Melhor performance em queries

---

## 📋 Configuração Obrigatória

### Passo 1: Criar arquivo `.env`

Crie um arquivo `.env` na pasta `saas-license-server/` com o seguinte conteúdo:

```env
# CREDENCIAIS ADMIN (OBRIGATÓRIO EM PRODUÇÃO)
ADMIN_USER=seu_usuario_admin_seguro
ADMIN_PASS=sua_senha_muito_segura_aqui

# MONGODB
MONGODB_URI=mongodb://localhost:27017/license-server

# SERVIDOR
PORT=5000
NODE_ENV=production
```

### Passo 2: Instalar Dependências de Segurança

Execute no terminal:

```bash
cd saas-license-server
npm install helmet express-rate-limit express-validator
```

### Passo 3: Verificar Avisos no Console

Ao iniciar o servidor, verifique se não há avisos sobre:
- Credenciais usando valores padrão
- Dependências de segurança não instaladas

---

## 🔐 Boas Práticas de Segurança

### Credenciais Admin

1. **NUNCA** use os valores padrão em produção
2. Use senhas fortes (mínimo 16 caracteres, mistura de maiúsculas, minúsculas, números e símbolos)
3. Não compartilhe o arquivo `.env`
4. Adicione `.env` ao `.gitignore` (já está configurado)

### Rate Limiting

- Os limites padrão são adequados para a maioria dos casos
- Ajuste conforme necessário no arquivo `server.js`
- Monitore logs para identificar tentativas de abuso

### MongoDB

- Use autenticação no MongoDB
- Configure whitelist de IPs no MongoDB Atlas
- Use conexão SSL/TLS em produção

### Headers de Segurança

- O Helmet.js está configurado com CSP adequado
- Ajuste a política CSP se necessário para seus recursos externos

---

## 🚨 Troubleshooting

### "Credenciais admin usando valores padrão"

**Solução:** Configure `ADMIN_USER` e `ADMIN_PASS` no arquivo `.env`

### "Helmet não instalado"

**Solução:** Execute `npm install helmet`

### "express-rate-limit não instalado"

**Solução:** Execute `npm install express-rate-limit`

### "express-validator não instalado"

**Solução:** Execute `npm install express-validator`

---

## 📊 Status de Segurança

| Recurso | Status | Prioridade |
|---------|--------|------------|
| Credenciais em env vars | ✅ Implementado | 🔴 Crítico |
| Rate Limiting | ✅ Implementado | 🔴 Crítico |
| Validação de Input | ✅ Implementado | 🔴 Crítico |
| Helmet.js | ✅ Implementado | 🟡 Importante |
| Validação nos Schemas | ✅ Implementado | 🟡 Importante |
| Índices de Performance | ✅ Implementado | 🟢 Melhoria |

---

## 📝 Checklist de Deploy

Antes de fazer deploy em produção, verifique:

- [ ] Arquivo `.env` criado com credenciais seguras
- [ ] `ADMIN_USER` alterado do valor padrão
- [ ] `ADMIN_PASS` alterado do valor padrão
- [ ] Todas as dependências instaladas (`npm install`)
- [ ] MongoDB configurado com autenticação
- [ ] Rate limiting ativo (sem avisos no console)
- [ ] Helmet.js ativo (sem avisos no console)
- [ ] Testes de login funcionando
- [ ] Testes de API funcionando

---

**Última atualização:** 08/12/2025
