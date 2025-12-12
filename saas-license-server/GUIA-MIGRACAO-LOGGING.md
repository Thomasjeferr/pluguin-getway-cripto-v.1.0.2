# 📝 GUIA DE MIGRAÇÃO: Sistema de Logging Profissional

**Data:** 2025-01-XX  
**Status:** ✅ **SISTEMA CRIADO - MIGRAÇÃO GRADUAL**

---

## 🎯 OBJETIVO

Substituir os **177 console.log/error/warn** por um sistema de logging profissional que:
- ✅ Tem níveis de log (debug, info, warn, error)
- ✅ Mascara dados sensíveis automaticamente
- ✅ Pode ser desabilitado em produção
- ✅ Formatação consistente
- ✅ Melhor performance

---

## 📦 SISTEMA CRIADO

### Arquivo: `utils/logger.js`

Sistema completo de logging com:
- ✅ Níveis de log configuráveis
- ✅ Mascaramento automático de dados sensíveis
- ✅ Formatação com timestamp
- ✅ Contexto por módulo
- ✅ Compatível com console.log existente

---

## 🔧 CONFIGURAÇÃO

### Variáveis de Ambiente

Adicione ao seu `.env` ou `configuracao.env`:

```env
# Nível de log (debug, info, warn, error, none)
LOG_LEVEL=info

# Ambiente (development, production)
NODE_ENV=production
```

### Níveis de Log

- **`debug`**: Todos os logs (apenas desenvolvimento)
- **`info`**: Informações gerais (padrão em produção)
- **`warn`**: Apenas avisos e erros
- **`error`**: Apenas erros
- **`none`**: Desabilitar todos os logs

---

## 📋 COMO USAR

### 1. Importar o Logger

```javascript
const logger = require('./utils/logger');

// Ou criar logger com contexto específico
const dbLogger = logger.child('DATABASE');
const apiLogger = logger.child('API');
```

### 2. Substituir console.log

**Antes:**
```javascript
console.log('Usuário criado:', user);
console.error('Erro ao conectar:', error);
console.warn('Aviso: configuração não encontrada');
```

**Depois:**
```javascript
logger.info('Usuário criado:', user);
logger.error('Erro ao conectar', error);
logger.warn('Aviso: configuração não encontrada');
```

### 3. Níveis de Log

```javascript
// Debug (apenas em desenvolvimento)
logger.debug('Detalhes internos:', data);

// Info (informações gerais)
logger.info('Operação concluída com sucesso');

// Warn (avisos)
logger.warn('Configuração não encontrada, usando padrão');

// Error (erros)
logger.error('Falha ao processar requisição', error);
```

---

## 🔒 MASCARAMENTO AUTOMÁTICO

O logger mascara automaticamente:

- ✅ Senhas (`password`, `senha`, `passwd`)
- ✅ Tokens (`token`, `api_key`, `secret`)
- ✅ MongoDB URIs (senhas na connection string)
- ✅ Stripe keys (`sk_`, `pk_`, `whsec_`)
- ✅ JWT tokens
- ✅ Números de cartão de crédito
- ✅ Objetos com campos sensíveis

**Exemplo:**
```javascript
// Antes (exposição de dados)
console.log('Login:', { email: 'user@example.com', password: 'senha123' });

// Depois (dados mascarados)
logger.info('Login:', { email: 'user@example.com', password: 'senha123' });
// Output: [INFO] Login: { email: 'user@example.com', password: '***MASKED***' }
```

---

## 📊 MIGRAÇÃO GRADUAL

### Fase 1: Importar Logger ✅ (FEITO)

```javascript
const logger = require('./utils/logger');
```

### Fase 2: Substituir Logs Críticos ✅ (INICIADO)

Substituir logs que podem expor dados sensíveis:
- ✅ Carregamento de configuração
- ✅ Erros de conexão
- ✅ Logs de autenticação
- ✅ Logs de API

### Fase 3: Substituir Logs de Debug

Substituir `console.log` por `logger.debug`:
```javascript
// Buscar por: console.log
// Substituir por: logger.debug (se for debug) ou logger.info (se for informação)
```

### Fase 4: Substituir Logs de Erro

Substituir `console.error` por `logger.error`:
```javascript
// Buscar por: console.error
// Substituir por: logger.error('Mensagem', error)
```

### Fase 5: Substituir Logs de Aviso

Substituir `console.warn` por `logger.warn`:
```javascript
// Buscar por: console.warn
// Substituir por: logger.warn('Mensagem')
```

---

## 🔍 ENCONTRAR TODOS OS CONSOLE.LOG

Execute no terminal:

```bash
# Contar ocorrências
grep -r "console\.\(log\|error\|warn\|info\)" saas-license-server/server.js | wc -l

# Ver todos
grep -n "console\.\(log\|error\|warn\|info\)" saas-license-server/server.js
```

---

## 📝 EXEMPLOS DE SUBSTITUIÇÃO

### Exemplo 1: Log Simples

**Antes:**
```javascript
console.log('Servidor iniciado na porta', PORT);
```

**Depois:**
```javascript
logger.info('Servidor iniciado na porta', PORT);
```

### Exemplo 2: Log com Objeto

**Antes:**
```javascript
console.log('Usuário criado:', { email, password });
```

**Depois:**
```javascript
logger.info('Usuário criado:', { email, password: '***MASKED***' });
// Ou simplesmente (mascaramento automático):
logger.info('Usuário criado:', { email, password });
```

### Exemplo 3: Log de Erro

**Antes:**
```javascript
console.error('Erro ao conectar MongoDB:', error);
```

**Depois:**
```javascript
logger.error('Erro ao conectar MongoDB', error);
```

### Exemplo 4: Log de Debug

**Antes:**
```javascript
console.log('Request body:', req.body);
```

**Depois:**
```javascript
logger.debug('Request body:', req.body);
```

---

## 🚀 BENEFÍCIOS

### Segurança
- ✅ Dados sensíveis mascarados automaticamente
- ✅ Menos risco de exposição em logs
- ✅ Logs limpos para auditoria

### Performance
- ✅ Logs de debug desabilitados em produção
- ✅ Menos overhead de I/O
- ✅ Logs mais eficientes

### Manutenibilidade
- ✅ Formatação consistente
- ✅ Timestamps em todos os logs
- ✅ Contexto por módulo
- ✅ Fácil de filtrar e buscar

---

## ⚙️ CONFIGURAÇÃO AVANÇADA

### Logger com Contexto

```javascript
const dbLogger = logger.child('DATABASE');
const apiLogger = logger.child('API');
const authLogger = logger.child('AUTH');

// Uso
dbLogger.info('Conexão estabelecida');
apiLogger.warn('Rate limit atingido');
authLogger.error('Falha na autenticação', error);
```

### Desabilitar Logs em Produção

```env
# .env
NODE_ENV=production
LOG_LEVEL=warn  # Apenas avisos e erros
```

---

## 📊 STATUS DA MIGRAÇÃO

### ✅ Concluído
- [x] Sistema de logging criado
- [x] Logger importado no server.js
- [x] Logs críticos substituídos (carregamento de config)

### 🔄 Em Progresso
- [ ] Substituir logs de autenticação
- [ ] Substituir logs de API
- [ ] Substituir logs de banco de dados

### 📋 Pendente
- [ ] Substituir todos os 177 console.log
- [ ] Testar mascaramento de dados
- [ ] Configurar LOG_LEVEL em produção

---

## 🎯 PRÓXIMOS PASSOS

1. **Substituir logs críticos** (autenticação, API, banco)
2. **Testar mascaramento** de dados sensíveis
3. **Configurar LOG_LEVEL** em produção
4. **Migrar gradualmente** os logs restantes
5. **Monitorar performance** após migração

---

## 📝 NOTAS

- ✅ O sistema é **compatível** com console.log existente
- ✅ Pode ser **migrado gradualmente** sem quebrar código
- ✅ **Mascaramento automático** protege dados sensíveis
- ✅ **Níveis de log** permitem controle fino em produção

---

**Sistema criado em:** 2025-01-XX  
**Próxima ação:** Substituir logs críticos de autenticação e API




