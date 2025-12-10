# 🔍 Análise: Problema ao Salvar Novo Cliente

**Data:** 08/12/2025  
**Status:** Em investigação  
**Próximos passos:** Testar soluções abaixo

---

## 📋 Problema Reportado

Ao criar um novo cliente pelo modal "Novo Cliente", o sistema não está salvando os dados no banco de dados.

---

## 🔍 Possíveis Causas Identificadas

### 1. **Proteção CSRF Bloqueando Requisição** ⚠️ **MAIS PROVÁVEL**

**Evidências:**
- Middleware CSRF está ativo para todas as requisições POST
- O formulário envia via `fetch()` com JSON
- Token CSRF pode não estar sendo enviado corretamente

**Como funciona atualmente:**
```javascript
// Frontend (dashboard.ejs linha ~2570)
headers['X-CSRF-Token'] = data._csrf; // Enviando no header

// Backend (server.js linha ~918)
if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return csrfProtection(req, res, next); // Valida CSRF
}
```

**Problema:** O middleware `csurf` por padrão espera o token em:
- `req.body._csrf` (para formulários HTML)
- `req.headers['csrf-token']` ou `req.headers['xsrf-token']` (para AJAX)

Mas pode estar esperando em outro formato quando usamos JSON.

**Solução 1:** Verificar se o middleware CSRF aceita token no header `X-CSRF-Token`
```javascript
// Adicionar configuração no middleware CSRF
const csrfProtection = csrf({ 
    cookie: false,
    value: (req) => {
        return req.body._csrf || 
               req.headers['x-csrf-token'] || 
               req.headers['csrf-token'] || 
               req.headers['xsrf-token'];
    }
});
```

**Solução 2:** Enviar token no body ao invés do header
```javascript
// Frontend - adicionar _csrf no body
const requestData = {
    _csrf: data._csrf, // Adicionar aqui
    email: data.email,
    plan: data.plan,
    // ...
};
```

**Solução 3:** Excluir a rota `/admin/create-client` do CSRF (não recomendado por segurança)
```javascript
app.use((req, res, next) => {
    if (req.path === '/webhook/stripe' || req.path === '/admin/create-client') {
        return next(); // Pular CSRF
    }
    // ...
});
```

---

### 2. **Express-Validator Normalizando Email Incorretamente**

**Evidências:**
- `body('email').isEmail().normalizeEmail()` está sendo usado
- `normalizeEmail()` pode modificar o formato do email
- Pode estar causando erro silencioso

**Como testar:**
```javascript
// Adicionar log antes e depois da validação
console.log('Email antes da validação:', req.body.email);
// Validação acontece aqui
console.log('Email após validação:', req.body.email);
```

**Solução:** Se necessário, remover `normalizeEmail()` temporariamente para testar:
```javascript
body('email').isEmail().withMessage('Email inválido'), // Remover normalizeEmail()
```

---

### 3. **Sessão/Autenticação Expirada**

**Evidências:**
- `requireAdmin` verifica `req.session.user === FINAL_ADMIN_USER`
- Se a sessão expirar, redireciona para `/acesso-admin`
- Pode estar retornando erro 302 (redirect) ao invés de JSON

**Como testar:**
```javascript
// Adicionar log no requireAdmin
function requireAdmin(req, res, next) {
    console.log('🔐 Verificando autenticação admin...');
    console.log('   - Session user:', req.session?.user);
    console.log('   - FINAL_ADMIN_USER:', FINAL_ADMIN_USER);
    console.log('   - Match:', req.session?.user === FINAL_ADMIN_USER);
    
    if (req.session && req.session.user === FINAL_ADMIN_USER) {
        console.log('✅ Autenticação OK');
        return next();
    }
    console.log('❌ Autenticação falhou - redirecionando');
    res.redirect('/acesso-admin');
}
```

**Solução:** Se sessão expirou, fazer login novamente antes de criar cliente.

---

### 4. **Erro Silencioso no Try/Catch**

**Evidências:**
- Try/catch pode estar capturando erro mas não retornando resposta adequada
- Pode estar havendo erro de validação do Mongoose que não está sendo tratado

**Como testar:**
- Verificar logs do servidor (terminal) quando tenta criar cliente
- Procurar por mensagens como "❌ ERRO AO CRIAR CLIENTE"

**Solução:** Já implementado - logs detalhados estão no código.

---

### 5. **Body Parser Não Processando JSON Corretamente**

**Evidências:**
- Requisição está sendo enviada como `JSON.stringify(requestData)`
- Headers incluem `'Content-Type': 'application/json'`
- Mas pode não estar sendo parseado corretamente

**Verificar:**
```javascript
// server.js - verificar se express.json() está configurado
app.use(express.json()); // Deve estar antes das rotas
app.use(express.urlencoded({ extended: true }));
```

---

## 🧪 Plano de Testes para Amanhã

### Teste 1: Verificar CSRF
1. Abrir Console do navegador (F12)
2. Criar novo cliente
3. Verificar mensagem de erro no console
4. Se aparecer erro 403 ou "Invalid CSRF token", problema é CSRF

### Teste 2: Verificar Autenticação
1. Verificar se está logado como admin
2. Criar novo cliente
3. Se redirecionar para login, problema é sessão

### Teste 3: Verificar Logs do Servidor
1. Criar novo cliente
2. Verificar terminal do servidor
3. Procurar por logs começando com "📝 === INICIANDO CRIAÇÃO DE CLIENTE ==="
4. Se não aparecer, requisição não está chegando ao servidor

### Teste 4: Testar Rota Diretamente
```bash
# Usar curl ou Postman para testar diretamente
curl -X POST http://localhost:3000/admin/create-client \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=SEU_SESSION_ID" \
  -d '{
    "email": "teste@exemplo.com",
    "plan": "trial",
    "password": "senha123",
    "domain": "exemplo.com"
  }'
```

---

## 🔧 Soluções Rápidas para Testar

### Solução A: Desabilitar CSRF Temporariamente (APENAS PARA TESTE)

```javascript
// server.js linha ~917
app.use((req, res, next) => {
    if (req.path === '/webhook/stripe' || req.path === '/admin/create-client') {
        return next(); // Pular CSRF temporariamente
    }
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        return csrfProtection(req, res, next);
    }
    next();
});
```

### Solução B: Enviar CSRF no Body

```javascript
// dashboard.ejs linha ~2574
const requestData = {
    _csrf: data._csrf, // Adicionar CSRF no body
    email: data.email,
    plan: data.plan,
    password: data.password,
    domain: data.domain || null,
    notes: data.notes || null
};
```

### Solução C: Usar FormData ao invés de JSON

```javascript
// dashboard.ejs - modificar submitNewClient
const formData = new FormData(form); // Já está sendo criado
// Enviar FormData diretamente (não converter para JSON)
const response = await fetch('/admin/create-client', {
    method: 'POST',
    body: formData, // Enviar FormData
    credentials: 'same-origin'
});
```

---

## 📝 Checklist para Debug

- [ ] Verificar Console do Navegador (F12)
- [ ] Verificar Logs do Servidor (Terminal)
- [ ] Verificar se está autenticado como admin
- [ ] Verificar se MongoDB está conectado
- [ ] Verificar se token CSRF está sendo enviado
- [ ] Testar requisição direta com curl/Postman
- [ ] Verificar se express.json() está configurado
- [ ] Verificar se há erros de validação do Mongoose

---

## 🎯 Próximos Passos

1. **Amanhã pela manhã:**
   - Executar Teste 1, 2 e 3 acima
   - Coletar informações dos logs
   - Identificar causa raiz

2. **Após identificar problema:**
   - Aplicar solução correspondente
   - Testar novamente
   - Fazer commit da correção

3. **Se problema persistir:**
   - Implementar Solução A (desabilitar CSRF temporariamente) para isolar problema
   - Testar cada solução B e C
   - Documentar qual funcionou

---

## 📚 Referências Úteis

- [Documentação csurf](https://github.com/expressjs/csurf)
- [Documentação express-validator](https://express-validator.github.io/docs/)
- [Express Body Parser](https://expressjs.com/en/api.html#express.json)

---

**Última atualização:** 08/12/2025 23:00

