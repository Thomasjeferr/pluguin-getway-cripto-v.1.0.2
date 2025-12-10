# 🔒 Relatório de Segurança - Projeto WooCommerce Binance Pix

**Data da Análise:** 08/12/2025  
**Versão Analisada:** 1.0.0

---

## 📊 Resumo Executivo

### ✅ Pontos Fortes
- ✅ Rate limiting implementado
- ✅ Helmet.js configurado
- ✅ Validação de webhooks do Stripe
- ✅ Proteção contra timing attacks (hash_equals)
- ✅ Variáveis de ambiente para credenciais
- ✅ Sanitização básica de inputs
- ✅ Headers de segurança configurados

### ⚠️ Pontos de Atenção
- ⚠️ Senhas armazenadas em texto plano no banco
- ⚠️ Cookies de sessão sem flag `secure` em produção
- ⚠️ Validação de entrada limitada
- ⚠️ Logs podem expor informações sensíveis
- ⚠️ Falta de CSRF tokens em formulários
- ⚠️ MongoDB queries com regex podem ser vulneráveis

---

## 🔍 Análise Detalhada

### 1. **Autenticação e Autorização**

#### ✅ Implementado:
- ✅ Middleware `requireAdmin` para proteger rotas administrativas
- ✅ Comparação segura de senhas usando `hash_equals` (proteção contra timing attacks)
- ✅ Rate limiting específico para login (`loginLimiter`)
- ✅ Logs de tentativas de login falhadas

#### ⚠️ Problemas Identificados:

**CRÍTICO: Senhas em Texto Plano**
```javascript
// server.js linha 995
const client = await User.findOne({ email: sanitizedUser.toLowerCase(), password: sanitizedPassword });
```
- **Problema:** Senhas de usuários armazenadas em texto plano no MongoDB
- **Risco:** Se o banco for comprometido, todas as senhas estarão expostas
- **Recomendação:** Implementar hash de senhas com `bcrypt` ou `argon2`

**MÉDIO: Credenciais Admin em Variáveis de Ambiente**
```javascript
// server.js linha 345-346
const ADMIN_USER = process.env.ADMIN_USER || 'master_root_v1';
const ADMIN_PASS = process.env.ADMIN_PASS || 'X7#k9$mP2@secure_v9';
```
- **Problema:** Valores padrão hardcoded se variáveis não estiverem definidas
- **Risco:** Em produção, se `.env` não for configurado, credenciais padrão serão usadas
- **Recomendação:** 
  - Forçar erro se variáveis não estiverem definidas em produção
  - Validar complexidade de senha admin
  - Implementar 2FA para admin

---

### 2. **Proteção de Dados Sensíveis**

#### ✅ Implementado:
- ✅ Variáveis de ambiente para credenciais (MONGO_URI, STRIPE keys, etc.)
- ✅ Senhas SMTP não são enviadas ao frontend
- ✅ Chaves Stripe não são expostas em logs completos

#### ⚠️ Problemas Identificados:

**MÉDIO: Logs Expõem Informações Parciais**
```javascript
// server.js linha 976
console.log('🔍 Tentativa de login - Usuário/Email:', sanitizedUser.substring(0, Math.min(5, sanitizedUser.length)) + '***', ...);
```
- **Problema:** Logs mostram primeiros caracteres de credenciais
- **Risco:** Informação parcial pode ajudar em ataques de força bruta
- **Recomendação:** Remover logs de credenciais ou usar apenas hash

**BAIXO: Arquivos .env no Repositório**
- **Problema:** Arquivos `.env` e `configuracao.env` podem estar no repositório
- **Risco:** Credenciais expostas no Git
- **Recomendação:** 
  - Adicionar `.env*` ao `.gitignore`
  - Criar `.env.example` com valores de exemplo
  - Usar secrets management (AWS Secrets Manager, HashiCorp Vault)

---

### 3. **Validação de Entrada**

#### ✅ Implementado:
- ✅ Sanitização básica com `.trim()`
- ✅ Validação de tipos (`typeof`, `parseInt`, `parseFloat`)
- ✅ Validação de formato de email
- ✅ Validação de formato de chave de licença (`startsWith('LIVEX-')`)

#### ⚠️ Problemas Identificados:

**MÉDIO: Validação Limitada com express-validator**
```javascript
// server.js linha 68-74
try {
    const expressValidator = require('express-validator');
    body = expressValidator.body;
    validationResult = expressValidator.validationResult;
} catch (e) {
    console.log('⚠️ express-validator não instalado...');
}
```
- **Problema:** `express-validator` está instalado mas não está sendo usado consistentemente
- **Risco:** Inputs não validados podem causar injection ou erros
- **Recomendação:** 
  - Usar `express-validator` em todas as rotas que recebem input
  - Validar comprimento máximo de strings
  - Validar formato de URLs, emails, domínios

**MÉDIO: Queries MongoDB com Regex**
```javascript
// server.js linha 1036-1038
query.$or = [
    { email: { $regex: search, $options: 'i' } },
    { domain: { $regex: search, $options: 'i' } }
];
```
- **Problema:** Regex não sanitizado pode causar ReDoS (Regular Expression Denial of Service)
- **Risco:** Ataques de negação de serviço com regex maliciosos
- **Recomendação:** 
  - Escapar caracteres especiais do regex
  - Limitar comprimento da string de busca
  - Usar índices de texto do MongoDB

---

### 4. **Proteção contra Ataques**

#### ✅ Implementado:
- ✅ **Rate Limiting:**
  - `generalLimiter`: 100 req/15min
  - `loginLimiter`: 5 req/15min
  - `apiLimiter`: 50 req/15min
- ✅ **Helmet.js:** Headers de segurança configurados
- ✅ **Webhook Validation:** Stripe webhooks validados com assinatura HMAC
- ✅ **SSL Verification:** Verificação SSL para requisições HTTPS

#### ⚠️ Problemas Identificados:

**MÉDIO: Falta de CSRF Protection**
- **Problema:** Formulários não têm tokens CSRF
- **Risco:** Ataques Cross-Site Request Forgery
- **Recomendação:** 
  - Implementar `csurf` ou `csurf` middleware
  - Adicionar tokens CSRF em todos os formulários
  - Validar tokens em rotas POST/PUT/DELETE

**BAIXO: Cookies de Sessão**
```javascript
// server.js linha 670-674
app.use(session({
    secret: process.env.SESSION_SECRET || 'DEV_SECRET',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // ⚠️ Deve ser true em produção com HTTPS
}));
```
- **Problema:** `secure: false` permite cookies em HTTP
- **Risco:** Cookies podem ser interceptados em conexões não criptografadas
- **Recomendação:** 
  - `secure: true` em produção (requer HTTPS)
  - `httpOnly: true` (já está implícito)
  - `sameSite: 'strict'` para proteção adicional

---

### 5. **Segurança do Banco de Dados**

#### ✅ Implementado:
- ✅ Mongoose schemas com validação
- ✅ Índices para performance e unicidade
- ✅ Queries parametrizadas (Mongoose protege contra NoSQL injection)

#### ⚠️ Problemas Identificados:

**BAIXO: MongoDB Injection (Protegido pelo Mongoose)**
- **Status:** ✅ Mongoose protege contra NoSQL injection por padrão
- **Observação:** Queries usando objetos JavaScript são seguras

**MÉDIO: Backup de Banco de Dados**
- **Status:** Sistema de backup implementado (`backup-mongodb.js`)
- **Recomendação:** 
  - Verificar se backups estão sendo executados regularmente
  - Criptografar backups
  - Testar restauração de backups

---

### 6. **Segurança de APIs e Webhooks**

#### ✅ Implementado:
- ✅ Validação de assinatura HMAC do Stripe
- ✅ Rate limiting em `/api/validate`
- ✅ Validação de domínio para licenças
- ✅ Verificação de expiração de licenças

#### ⚠️ Problemas Identificados:

**BAIXO: API `/api/validate` Pública**
- **Problema:** Endpoint de validação é público (necessário para plugin)
- **Risco:** Abuso para enumerar licenças válidas
- **Mitigação:** ✅ Rate limiting implementado
- **Recomendação Adicional:** 
  - Adicionar CAPTCHA após X tentativas
  - Logging de tentativas suspeitas

---

### 7. **Segurança do Plugin WordPress**

#### ✅ Implementado:
- ✅ Validação de licença com servidor SaaS
- ✅ Verificação periódica de licença (cron diário)
- ✅ Retry automático com exponential backoff
- ✅ Modo degradado se servidor estiver offline

#### ⚠️ Problemas Identificados:

**BAIXO: Falta de Nonce Validation no Plugin**
- **Problema:** Não encontrei validação de nonce nos AJAX endpoints do plugin
- **Risco:** Ataques CSRF em ações AJAX
- **Recomendação:** 
  - Adicionar `wp_verify_nonce()` em todos os endpoints AJAX
  - Usar `wp_create_nonce()` no frontend

**BAIXO: Validação de URL do Servidor**
- **Problema:** URL do servidor de licenças pode ser qualquer string
- **Risco:** SSRF (Server-Side Request Forgery) se URL maliciosa
- **Recomendação:** 
  - Validar formato de URL
  - Whitelist de domínios permitidos
  - Validar que URL começa com `https://`

---

### 8. **Logs e Monitoramento**

#### ✅ Implementado:
- ✅ Logs de atividades do admin
- ✅ Logs de tentativas de login
- ✅ Sistema de notificações

#### ⚠️ Problemas Identificados:

**MÉDIO: Logs Podem Conter Dados Sensíveis**
- **Problema:** Logs podem expor emails, IPs, ações de usuários
- **Risco:** Violação de LGPD/GDPR se logs forem acessados
- **Recomendação:** 
  - Implementar rotação de logs
  - Criptografar logs sensíveis
  - Implementar retenção de logs (ex: 90 dias)

---

## 🎯 Priorização de Correções

### 🔴 CRÍTICO (Corrigir Imediatamente)
1. **Hash de Senhas:** Implementar bcrypt/argon2 para senhas de usuários
2. **Credenciais Admin:** Forçar erro se variáveis de ambiente não estiverem definidas em produção
3. **CSRF Protection:** Adicionar tokens CSRF em todos os formulários

### 🟡 MÉDIO (Corrigir em Breve)
4. **Validação de Entrada:** Usar express-validator consistentemente
5. **Sanitização de Regex:** Proteger queries MongoDB com regex
6. **Cookies Seguros:** Configurar `secure: true` em produção
7. **Logs Sensíveis:** Remover ou hashear informações sensíveis dos logs

### 🟢 BAIXO (Melhorias Futuras)
8. **2FA para Admin:** Implementar autenticação de dois fatores
9. **CAPTCHA:** Adicionar CAPTCHA após tentativas de login
10. **Backup Encryption:** Criptografar backups do MongoDB
11. **Nonce no Plugin:** Adicionar validação de nonce nos endpoints AJAX

---

## 📋 Checklist de Segurança

### Configuração de Produção
- [ ] Variáveis de ambiente configuradas (sem valores padrão)
- [ ] HTTPS habilitado
- [ ] Cookies com `secure: true`
- [ ] SESSION_SECRET forte e único
- [ ] MongoDB com autenticação habilitada
- [ ] Firewall configurado
- [ ] Backups automáticos funcionando

### Código
- [ ] Senhas com hash (bcrypt/argon2)
- [ ] CSRF tokens em formulários
- [ ] Validação de entrada completa
- [ ] Rate limiting ativo
- [ ] Helmet.js configurado
- [ ] Logs sem dados sensíveis
- [ ] Webhooks validados

### Plugin WordPress
- [ ] Nonce validation em AJAX
- [ ] Validação de URL do servidor
- [ ] SSL verification ativo
- [ ] Sanitização de inputs

---

## 🔧 Recomendações de Implementação

### 1. Hash de Senhas (CRÍTICO)
```javascript
const bcrypt = require('bcrypt');

// Ao criar usuário
const hashedPassword = await bcrypt.hash(password, 10);
await User.create({ email, password: hashedPassword });

// Ao validar login
const user = await User.findOne({ email });
const isValid = await bcrypt.compare(password, user.password);
```

### 2. CSRF Protection (CRÍTICO)
```javascript
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

app.use(csrfProtection);

// Em rotas que renderizam formulários
res.render('form', { csrfToken: req.csrfToken() });

// Em rotas POST
app.post('/route', csrfProtection, (req, res) => { ... });
```

### 3. Validação com express-validator (MÉDIO)
```javascript
const { body, validationResult } = require('express-validator');

app.post('/api/validate', [
    body('email').isEmail().normalizeEmail(),
    body('license_key').isLength({ min: 10, max: 100 }),
    body('domain').isFQDN()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    // ...
});
```

### 4. Sanitização de Regex (MÉDIO)
```javascript
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const safeSearch = escapeRegex(search);
query.$or = [
    { email: { $regex: safeSearch, $options: 'i' } }
];
```

---

## 📊 Score de Segurança

**Score Atual: 6.5/10**

- **Autenticação:** 6/10 (senhas em texto plano)
- **Autorização:** 8/10 (middleware bem implementado)
- **Validação:** 5/10 (limitada)
- **Proteção de Dados:** 7/10 (variáveis de ambiente, mas logs expõem dados)
- **Proteção contra Ataques:** 7/10 (rate limiting e helmet, mas falta CSRF)
- **Segurança de API:** 7/10 (webhooks validados, mas endpoint público)
- **Logs e Monitoramento:** 6/10 (logs podem expor dados sensíveis)

**Score Esperado após Correções: 9/10**

---

## 📝 Conclusão

O projeto possui uma **base sólida de segurança** com rate limiting, helmet.js, e validação de webhooks. No entanto, existem **vulnerabilidades críticas** que devem ser corrigidas antes de produção, especialmente:

1. **Hash de senhas** (CRÍTICO)
2. **Proteção CSRF** (CRÍTICO)
3. **Validação de entrada completa** (MÉDIO)

Com as correções recomendadas, o sistema estará pronto para produção com um nível de segurança adequado.

---

**Próximos Passos:**
1. Implementar hash de senhas
2. Adicionar CSRF protection
3. Melhorar validação de entrada
4. Revisar e limpar logs
5. Configurar produção com HTTPS e cookies seguros
