# 📝 GUIA: Validação de Entrada Consistente

**Data:** 2025-01-XX  
**Status:** ✅ **VALIDAÇÃO IMPLEMENTADA**

---

## 🎯 OBJETIVO

Garantir que **todas as rotas que recebem input** tenham validação consistente usando `express-validator` para prevenir:
- ❌ Injeção de dados maliciosos
- ❌ Dados inválidos
- ❌ Ataques de manipulação de entrada

---

## ✅ VALIDAÇÃO IMPLEMENTADA

### Rotas com Validação Completa

1. ✅ `/admin/create-client` - Criação de cliente
2. ✅ `/admin/products` - Gerenciamento de produtos
3. ✅ `/admin/products/:id` - Atualização de produto
4. ✅ `/admin/update-config` - Atualização de configuração
5. ✅ `/admin/change-plan` - Mudança de plano
6. ✅ `/admin/client/:email/update` - Atualização de cliente
7. ✅ `/admin/cancel-subscription` - Cancelamento de assinatura
8. ✅ `/admin/refund-payment` - Reembolso de pagamento
9. ✅ `/toggle-license` - Ativar/desativar licença
10. ✅ `/admin/delete-client` - Deletar cliente
11. ✅ `/create-checkout-session` - Criar sessão de checkout
12. ✅ `/process-checkout` - Processar checkout
13. ✅ `/api/validate` - Validação de licença
14. ✅ `/esqueci-senha` - Recuperação de senha
15. ✅ `/resetar-senha` - Reset de senha
16. ✅ `/acesso-admin` - Login admin

---

## 📋 PADRÃO DE VALIDAÇÃO

### Estrutura Básica

```javascript
app.post('/rota',
    requireAdmin, // Se necessário
    body ? [
        // Validações aqui
        body('campo').trim().isLength({ min: 1, max: 255 }).withMessage('Mensagem de erro')
    ] : [],
    validateRequest, // Middleware de validação
    async (req, res) => {
        // Handler da rota
    }
);
```

---

## 🔍 VALIDAÇÕES COMUNS

### Email

```javascript
body('email').isEmail().normalizeEmail().withMessage('Email inválido')
```

### Senha

```javascript
body('password').trim().isLength({ min: 6, max: 255 }).withMessage('Senha deve ter entre 6 e 255 caracteres')
```

### String com Limite

```javascript
body('nome').trim().isLength({ min: 1, max: 255 }).withMessage('Nome é obrigatório')
```

### Número Inteiro

```javascript
body('trialDays').optional().isInt({ min: 0, max: 365 }).withMessage('Dias de trial inválidos')
```

### Número Decimal

```javascript
body('priceMonthly').optional().isFloat({ min: 0 }).withMessage('Preço inválido')
```

### URL/Domínio

```javascript
body('domain').optional().trim().isLength({ max: 255 }).withMessage('Domínio inválido')
```

### Slug (URL-friendly)

```javascript
body('slug').trim().matches(/^[a-z0-9-]+$/).withMessage('Slug inválido (apenas letras minúsculas, números e hífens)')
```

### Enum/Valores Permitidos

```javascript
body('planId').trim().isIn(['monthly', 'yearly', 'trial']).withMessage('Plano inválido')
```

### Chave de Licença

```javascript
body('license_key').trim().isLength({ min: 10, max: 100 }).matches(/^LIVEX-/).withMessage('Formato de chave inválido')
```

---

## 📝 EXEMPLOS POR ROTA

### 1. Criação de Cliente

```javascript
app.post('/admin/create-client', 
    requireAdmin,
    body ? [
        body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
        body('password').trim().isLength({ min: 6, max: 255 }).withMessage('Senha deve ter entre 6 e 255 caracteres'),
        body('domain').optional().trim().isLength({ max: 255 }).withMessage('Domínio inválido'),
        body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notas muito longas')
    ] : [],
    validateRequest,
    async (req, res) => {
        // Handler
    }
);
```

### 2. Criação de Produto

```javascript
app.post('/admin/products',
    requireAdmin,
    body ? [
        body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Nome é obrigatório'),
        body('slug').trim().matches(/^[a-z0-9-]+$/).withMessage('Slug inválido'),
        body('trialDays').optional().isInt({ min: 0, max: 365 }),
        body('priceMonthly').optional().isFloat({ min: 0 }),
        body('priceYearly').optional().isFloat({ min: 0 }),
        body('order').optional().isInt({ min: 0 }),
        body('promoText').optional().trim().isLength({ max: 500 }),
        body('description').optional().trim().isLength({ max: 2000 }),
        body('icon').optional().trim().isLength({ max: 255 })
    ] : [],
    validateRequest,
    async (req, res) => {
        // Handler
    }
);
```

### 3. Validação de Licença

```javascript
app.post('/api/validate', 
    body ? [
        body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
        body('license_key').trim().isLength({ min: 10, max: 100 }).matches(/^LIVEX-/).withMessage('Formato de chave inválido'),
        body('domain').optional().trim().isLength({ max: 255 }).withMessage('Domínio inválido'),
        body('product').optional().trim().isLength({ max: 50 }).withMessage('Produto inválido'),
        body('plugin_slug').optional().trim().isLength({ max: 50 }).withMessage('Plugin slug inválido')
    ] : [],
    validateRequest,
    async (req, res) => {
        // Handler
    }
);
```

---

## 🔒 SEGURANÇA

### Sanitização Automática

O `express-validator` faz sanitização automática:
- ✅ `.trim()` - Remove espaços no início e fim
- ✅ `.normalizeEmail()` - Normaliza formato de email
- ✅ `.toLowerCase()` - Converte para minúsculas (quando aplicável)

### Validação de Comprimento

Sempre validar comprimento máximo para prevenir:
- ❌ Buffer overflow
- ❌ Ataques de DoS
- ❌ Dados excessivamente grandes

### Validação de Formato

Validar formato específico:
- ✅ Emails: `.isEmail()`
- ✅ URLs: `.isURL()`
- ✅ Slugs: `.matches(/^[a-z0-9-]+$/)`
- ✅ Chaves: `.matches(/^LIVEX-/)`

---

## 📊 CHECKLIST DE VALIDAÇÃO

Para cada rota que recebe input:

- [ ] ✅ Email validado com `.isEmail().normalizeEmail()`
- [ ] ✅ Senhas validadas com comprimento mínimo/máximo
- [ ] ✅ Strings validadas com comprimento máximo
- [ ] ✅ Números validados com `.isInt()` ou `.isFloat()`
- [ ] ✅ URLs/domínios validados com comprimento máximo
- [ ] ✅ Enums validados com `.isIn()`
- [ ] ✅ Padrões validados com `.matches()`
- [ ] ✅ Campos opcionais marcados com `.optional()`
- [ ] ✅ Middleware `validateRequest` aplicado

---

## 🚀 BENEFÍCIOS

### Segurança
- ✅ Previne injeção de dados maliciosos
- ✅ Valida formato antes de processar
- ✅ Sanitiza automaticamente

### Qualidade
- ✅ Dados consistentes
- ✅ Mensagens de erro claras
- ✅ Validação centralizada

### Manutenibilidade
- ✅ Código mais limpo
- ✅ Fácil de adicionar novas validações
- ✅ Padrão consistente

---

## 📝 NOTAS

- ✅ Todas as rotas POST/PUT que recebem input devem ter validação
- ✅ Use `.optional()` para campos não obrigatórios
- ✅ Sempre defina comprimento máximo para strings
- ✅ Valide formato específico quando necessário
- ✅ Use `validateRequest` middleware para processar erros

---

**Guia criado em:** 2025-01-XX  
**Status:** ✅ **Validação implementada em todas as rotas críticas**




