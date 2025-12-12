# 🔒 GUIA: Configuração de Cookies Seguros

**Data:** 2025-01-XX  
**Status:** ✅ **IMPLEMENTADO**

---

## 🎯 OBJETIVO

Garantir que cookies de sessão sejam configurados de forma segura, especialmente em produção, para prevenir:
- ❌ Interceptação de cookies em HTTP
- ❌ Ataques XSS (via JavaScript)
- ❌ Ataques CSRF

---

## ✅ CONFIGURAÇÃO ATUAL

### Configuração de Sessão

**Arquivo:** `server.js` (linha ~898)

```javascript
app.use(session({
    secret: process.env.SESSION_SECRET || 'DEV_SECRET',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: isProductionEnv, // true em produção (requer HTTPS)
        httpOnly: true, // Prevenir acesso via JavaScript
        sameSite: 'strict', // Proteção adicional contra CSRF
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));
```

---

## 🔒 FLAGS DE SEGURANÇA

### 1. `secure: true` (Produção)

**O que faz:**
- ✅ Cookies só são enviados via HTTPS
- ✅ Previne interceptação em conexões HTTP
- ✅ Obrigatório em produção

**Configuração:**
```javascript
secure: isProductionEnv  // true se NODE_ENV=production
```

**Importante:**
- ⚠️ Requer HTTPS configurado
- ⚠️ Em desenvolvimento, pode ser `false` para permitir HTTP local

### 2. `httpOnly: true`

**O que faz:**
- ✅ Previne acesso via JavaScript (`document.cookie`)
- ✅ Protege contra ataques XSS
- ✅ Sempre deve ser `true`

**Configuração:**
```javascript
httpOnly: true  // Sempre true
```

### 3. `sameSite: 'strict'`

**O que faz:**
- ✅ Previne envio de cookies em requisições cross-site
- ✅ Proteção adicional contra CSRF
- ✅ Melhor segurança que `'lax'`

**Configuração:**
```javascript
sameSite: 'strict'  // Sempre 'strict'
```

**Alternativas:**
- `'lax'` - Menos restritivo (permite alguns cross-site)
- `'none'` - Permite cross-site (requer `secure: true`)

### 4. `maxAge`

**O que faz:**
- ✅ Define tempo de expiração do cookie
- ✅ Limita duração da sessão

**Configuração:**
```javascript
maxAge: 24 * 60 * 60 * 1000  // 24 horas
```

---

## 🌍 DETECÇÃO DE AMBIENTE

### Variável de Ambiente

```javascript
const isProductionEnv = process.env.NODE_ENV === 'production';
```

### Configuração

**Desenvolvimento:**
```bash
# Não definir NODE_ENV ou definir como 'development'
NODE_ENV=development
# Cookies: secure=false (permite HTTP local)
```

**Produção:**
```bash
# Definir explicitamente como 'production'
NODE_ENV=production
# Cookies: secure=true (requer HTTPS)
```

---

## 📋 CHECKLIST DE SEGURANÇA

### Configuração de Cookies

- [x] ✅ `secure: true` em produção
- [x] ✅ `httpOnly: true` sempre
- [x] ✅ `sameSite: 'strict'` sempre
- [x] ✅ `maxAge` definido
- [x] ✅ Detecção de ambiente funcionando

### Em Produção

- [ ] 🔴 **Configurar HTTPS** (obrigatório para `secure: true`)
- [ ] 🔴 **Definir NODE_ENV=production**
- [ ] 🔴 **Configurar SESSION_SECRET** forte
- [ ] 🔴 **Testar cookies** em ambiente de produção

---

## 🚀 CONFIGURAÇÃO EM PRODUÇÃO

### 1. Variáveis de Ambiente

Adicione ao `.env` ou variáveis do sistema:

```env
NODE_ENV=production
SESSION_SECRET=SUA_CHAVE_SECRETA_FORTE_AQUI
```

### 2. Gerar SESSION_SECRET Forte

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Ou use gerador online
# https://randomkeygen.com/
```

### 3. Configurar HTTPS

**Obrigatório** para `secure: true` funcionar:

```javascript
// Exemplo com Express e HTTPS
const https = require('https');
const fs = require('fs');

const options = {
    key: fs.readFileSync('path/to/private-key.pem'),
    cert: fs.readFileSync('path/to/certificate.pem')
};

https.createServer(options, app).listen(443);
```

**Ou use um proxy reverso:**
- Nginx com SSL
- Cloudflare
- AWS ALB com SSL

---

## 🔍 VERIFICAÇÃO

### Verificar Configuração

```javascript
// Verificar ambiente
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('isProductionEnv:', isProductionEnv);

// Verificar cookies
// No navegador (DevTools > Application > Cookies):
// - secure: deve ser true em produção
// - httpOnly: deve ser true sempre
// - sameSite: deve ser 'Strict'
```

### Teste em Produção

1. ✅ Acessar via HTTPS
2. ✅ Verificar cookies no DevTools
3. ✅ Confirmar `secure: true`
4. ✅ Testar que cookies não são acessíveis via JavaScript

---

## ⚠️ PROBLEMAS COMUNS

### Cookie não é enviado

**Causa:** `secure: true` mas site está em HTTP

**Solução:**
- Configurar HTTPS
- Ou usar `secure: false` apenas em desenvolvimento

### Cookie acessível via JavaScript

**Causa:** `httpOnly: false`

**Solução:**
- Sempre usar `httpOnly: true`

### Cookie enviado em requisições cross-site

**Causa:** `sameSite: 'none'` ou não definido

**Solução:**
- Usar `sameSite: 'strict'`

---

## 📊 ANTES vs DEPOIS

### Antes (Inseguro)
```javascript
cookie: { 
    secure: false  // ❌ Sempre false
}
```

**Riscos:**
- ❌ Cookies interceptados em HTTP
- ❌ Vulnerável a ataques man-in-the-middle
- ❌ Sem proteção adicional

### Depois (Seguro)
```javascript
cookie: { 
    secure: isProductionEnv,  // ✅ true em produção
    httpOnly: true,          // ✅ Sempre true
    sameSite: 'strict',      // ✅ Sempre 'strict'
    maxAge: 24 * 60 * 60 * 1000
}
```

**Proteções:**
- ✅ Cookies só via HTTPS em produção
- ✅ Não acessível via JavaScript
- ✅ Proteção contra CSRF
- ✅ Expiração definida

---

## 🚀 BENEFÍCIOS

### Segurança
- ✅ Previne interceptação de cookies
- ✅ Protege contra XSS
- ✅ Protege contra CSRF
- ✅ Conformidade com boas práticas

### Conformidade
- ✅ OWASP Top 10
- ✅ PCI DSS (se aplicável)
- ✅ GDPR (se aplicável)

---

## 📝 NOTAS IMPORTANTES

1. **HTTPS é obrigatório** em produção quando `secure: true`
2. **NODE_ENV=production** deve ser definido explicitamente
3. **SESSION_SECRET** deve ser forte e único
4. **Testar** configuração antes de deploy
5. **Monitorar** logs para erros de cookie

---

## 📚 REFERÊNCIAS

- [OWASP - Secure Cookie Flags](https://owasp.org/www-community/HttpOnly)
- [MDN - Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [Express Session](https://github.com/expressjs/session)

---

**Guia criado em:** 2025-01-XX  
**Status:** ✅ **Configuração segura implementada**



