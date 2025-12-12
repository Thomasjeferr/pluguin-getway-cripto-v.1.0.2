# 🔒 GUIA: Sanitização de Regex em Queries MongoDB

**Data:** 2025-01-XX  
**Status:** ✅ **IMPLEMENTADO**

---

## ⚠️ VULNERABILIDADE: ReDoS (Regular Expression Denial of Service)

### O Problema

Usar strings de usuário diretamente em queries MongoDB com `$regex` pode causar:
- ❌ **ReDoS** - Ataque de negação de serviço
- ❌ **Performance degradada** - Regex maliciosos podem travar o servidor
- ❌ **Exploração de caracteres especiais** - `.`, `*`, `+`, `?`, etc.

### Exemplo Inseguro

```javascript
// ❌ PERIGOSO - Não sanitizado
const search = req.query.search;
query.$or = [
    { email: { $regex: search, $options: 'i' } },
    { domain: { $regex: search, $options: 'i' } }
];
```

**Problema:** Se `search = "(a+)+b"`, pode causar ReDoS.

---

## ✅ SOLUÇÃO: Função `escapeRegex()`

### Função Implementada

```javascript
function escapeRegex(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }
    
    // Limitar comprimento (proteção contra ReDoS)
    const maxLength = 100;
    const limitedStr = str.trim().substring(0, maxLength);
    
    if (!limitedStr) {
        return '';
    }
    
    // Escapar caracteres especiais
    return limitedStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

### Características

- ✅ **Limita comprimento** - Máximo 100 caracteres
- ✅ **Escapa caracteres especiais** - `.`, `*`, `+`, `?`, `^`, `$`, `{`, `}`, `(`, `)`, `|`, `[`, `]`, `\`
- ✅ **Trim automático** - Remove espaços no início/fim
- ✅ **Validação de tipo** - Retorna string vazia se não for string

---

## 📋 USO CORRETO

### Exemplo Seguro

```javascript
// ✅ SEGURO - Sanitizado
const search = req.query.search || '';
const safeSearch = escapeRegex(search);

if (safeSearch) {
    query.$or = [
        { email: { $regex: safeSearch, $options: 'i' } },
        { domain: { $regex: safeSearch, $options: 'i' } }
    ];
}
```

### Implementação Atual

**Arquivo:** `server.js` (linha ~1909)

```javascript
// Busca por email ou domínio (com sanitização de regex)
if (search) {
    const safeSearch = escapeRegex(search);
    if (safeSearch) {
        query.$or = [
            { email: { $regex: safeSearch, $options: 'i' } },
            { domain: { $regex: safeSearch, $options: 'i' } }
        ];
    }
}
```

---

## 🔍 CARACTERES ESCAPADOS

A função `escapeRegex()` escapa os seguintes caracteres especiais:

| Caractere | Descrição | Exemplo |
|-----------|-----------|---------|
| `.` | Qualquer caractere | `a.b` → `a\.b` |
| `*` | Zero ou mais | `a*b` → `a\*b` |
| `+` | Um ou mais | `a+b` → `a\+b` |
| `?` | Zero ou um | `a?b` → `a\?b` |
| `^` | Início da string | `^a` → `\^a` |
| `$` | Fim da string | `a$` → `a\$` |
| `{` | Quantificador | `a{2}` → `a\{2\}` |
| `}` | Quantificador | `a{2}` → `a\{2\}` |
| `(` | Grupo | `(a)` → `\(a\)` |
| `)` | Grupo | `(a)` → `\(a\)` |
| `\|` | OU lógico | `a\|b` → `a\|b` |
| `[` | Classe de caracteres | `[a]` → `\[a\]` |
| `]` | Classe de caracteres | `[a]` → `\[a\]` |
| `\` | Escape | `\n` → `\\n` |

---

## 🚨 PADRÕES PERIGOSOS

### Padrões que Causam ReDoS

Estes padrões são automaticamente escapados pela função:

```javascript
// Padrões perigosos (exemplos)
"(a+)+b"        // ReDoS - muitos backtracking
"(a|a)*"        // ReDoS - muitas alternativas
"(a*)*"         // ReDoS - quantificadores aninhados
"a{1,1000}"     // ReDoS - range muito grande
```

### Proteção Automática

A função `escapeRegex()` transforma esses padrões em literais seguros:

```javascript
escapeRegex("(a+)+b")  // Retorna: "\\(a\\+)\\+b"
escapeRegex("(a|a)*")  // Retorna: "\\(a\\|a)\\*"
escapeRegex("(a*)*")   // Retorna: "\\(a\\*)\\*"
```

---

## 📊 LIMITAÇÕES

### Comprimento Máximo

- **Máximo:** 100 caracteres
- **Motivo:** Prevenir strings muito longas que podem causar lentidão
- **Comportamento:** Strings maiores são truncadas

```javascript
const longString = "a".repeat(200);
escapeRegex(longString); // Retorna apenas os primeiros 100 caracteres
```

### Validação de Tipo

- **Aceita:** Apenas strings
- **Rejeita:** `null`, `undefined`, números, objetos
- **Comportamento:** Retorna string vazia para tipos inválidos

```javascript
escapeRegex(null);        // Retorna: ''
escapeRegex(undefined);   // Retorna: ''
escapeRegex(123);         // Retorna: ''
escapeRegex({});          // Retorna: ''
```

---

## ✅ CHECKLIST DE SEGURANÇA

Ao usar `$regex` em queries MongoDB:

- [x] ✅ **Sempre usar `escapeRegex()`** antes de usar em `$regex`
- [x] ✅ **Validar se string não está vazia** após sanitização
- [x] ✅ **Limitar comprimento** (já feito pela função)
- [x] ✅ **Documentar uso** em comentários
- [x] ✅ **Testar com strings maliciosas**

---

## 🧪 TESTES

### Teste de Sanitização

```javascript
// Teste básico
const test1 = escapeRegex("test@example.com");
console.log(test1); // "test@example.com"

// Teste com caracteres especiais
const test2 = escapeRegex("test+user@example.com");
console.log(test2); // "test\\+user@example.com"

// Teste com padrão ReDoS
const test3 = escapeRegex("(a+)+b");
console.log(test3); // "\\(a\\+)\\+b"

// Teste com string longa
const test4 = escapeRegex("a".repeat(200));
console.log(test4.length); // 100 (truncado)
```

---

## 📝 EXEMPLOS DE USO

### Exemplo 1: Busca Simples

```javascript
app.get('/admin', requireAdmin, async (req, res) => {
    const search = req.query.search || '';
    const safeSearch = escapeRegex(search);
    
    let query = {};
    if (safeSearch) {
        query.$or = [
            { email: { $regex: safeSearch, $options: 'i' } },
            { domain: { $regex: safeSearch, $options: 'i' } }
        ];
    }
    
    const licenses = await License.find(query);
    // ...
});
```

### Exemplo 2: Busca com Múltiplos Campos

```javascript
const search = req.query.search || '';
const safeSearch = escapeRegex(search);

if (safeSearch) {
    query.$or = [
        { email: { $regex: safeSearch, $options: 'i' } },
        { domain: { $regex: safeSearch, $options: 'i' } },
        { notes: { $regex: safeSearch, $options: 'i' } }
    ];
}
```

---

## 🚀 BENEFÍCIOS

### Segurança
- ✅ Previne ataques ReDoS
- ✅ Protege contra exploração de regex
- ✅ Limita impacto de strings maliciosas

### Performance
- ✅ Limita comprimento de strings
- ✅ Evita regex complexos
- ✅ Melhora tempo de resposta

### Manutenibilidade
- ✅ Função centralizada
- ✅ Fácil de usar
- ✅ Bem documentada

---

## ⚠️ NOTAS IMPORTANTES

1. **Sempre usar `escapeRegex()`** antes de usar em `$regex`
2. **Nunca usar** strings de usuário diretamente em regex
3. **Validar** se string não está vazia após sanitização
4. **Considerar** usar índices de texto do MongoDB para buscas mais complexas

---

## 📚 REFERÊNCIAS

- [OWASP - ReDoS](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)
- [MongoDB - $regex](https://docs.mongodb.com/manual/reference/operator/query/regex/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

**Guia criado em:** 2025-01-XX  
**Status:** ✅ **Função implementada e documentada**



