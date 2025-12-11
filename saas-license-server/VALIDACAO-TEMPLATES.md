# ✅ Validação de Templates EJS

Este documento descreve o sistema de validação de templates EJS implementado para garantir qualidade antes do deploy.

---

## 📋 O que é Validado

O script `validate-templates.js` verifica:

### 1. **Sintaxe EJS**
- ✅ Tags EJS balanceadas (`<%` e `%>`)
- ✅ Tags de output balanceadas (`<%=` e `%>`)
- ✅ Strings JavaScript não terminadas
- ✅ Template literals não fechados

### 2. **Renderização**
- ✅ Testa renderização básica com dados mock
- ✅ Verifica se o template renderiza sem erros
- ✅ Detecta erros de sintaxe em tempo de execução

### 3. **Segurança**
- ⚠️ Detecta uso de `innerHTML` sem sanitização (vulnerabilidade XSS)
- ⚠️ Alerta sobre práticas inseguras

### 4. **Qualidade de Código**
- ✅ Detecta erros comuns de CSS (ex: `text-center;`)
- ✅ Verifica estrutura básica do template

---

## 🚀 Como Usar

### Validação Manual

```bash
# Validar todos os templates
npm run validate:templates

# Ou diretamente
node validate-templates.js
```

### Validação Automática (Antes do Deploy)

O script é executado automaticamente antes do deploy através do hook `predeploy`:

```bash
npm run predeploy
```

Isso garante que os templates estão válidos antes de fazer deploy.

---

## 📊 Exemplo de Saída

### ✅ Sucesso

```
🔍 VALIDAÇÃO DE TEMPLATES EJS
==================================================

📁 Encontrados 15 arquivo(s) EJS:
   - views/dashboard.ejs
   - views/landing.ejs
   ...

🔍 Validando templates...

Validando: views/dashboard.ejs
   ✅ OK
Validando: views/landing.ejs
   ✅ OK
...

==================================================

📊 RESUMO DA VALIDAÇÃO
==================================================

✅ SUCESSO! Todos os 15 templates estão válidos!

🎉 Pronto para deploy!
```

### ❌ Com Erros

```
🔍 VALIDAÇÃO DE TEMPLATES EJS
==================================================

📁 Encontrados 15 arquivo(s) EJS:
   - views/dashboard.ejs
   ...

🔍 Validando templates...

Validando: views/dashboard.ejs
   ❌ [SYNTAX] Tags EJS não balanceadas: 10 abertas, 9 fechadas
   ❌ [SECURITY] Uso de innerHTML sem sanitização detectado
   ✅ OK

...

==================================================

📊 RESUMO DA VALIDAÇÃO
==================================================

❌ ERRO! 2 erro(s) encontrado(s) em 15 template(s)

📋 Detalhes dos erros:

📄 views/dashboard.ejs:
   - [SYNTAX] Tags EJS não balanceadas: 10 abertas, 9 fechadas
   - [SECURITY] Uso de innerHTML sem sanitização detectado

⚠️  Corrija os erros antes de fazer deploy!
```

---

## 🔧 Integração com CI/CD

### GitHub Actions

Adicione ao seu `.github/workflows/deploy.yml`:

```yaml
- name: Validar Templates EJS
  run: npm run validate:templates
```

### Git Hooks

Adicione ao `.git/hooks/pre-push`:

```bash
#!/bin/bash
npm run validate:templates
if [ $? -ne 0 ]; then
    echo "❌ Validação de templates falhou! Corrija os erros antes de fazer push."
    exit 1
fi
```

---

## 📝 Dados Mock para Teste

O script usa dados mock para testar renderização:

```javascript
{
    config: { priceMonthly: 97, priceYearly: 997, ... },
    licenses: [],
    products: [],
    stats: { ... },
    notifications: { unread: [], totalUnread: 0 },
    csrfToken: 'test-csrf-token-12345',
    ...
}
```

Esses dados são suficientes para testar a renderização básica da maioria dos templates.

---

## ⚠️ Limitações

O script de validação:

- ✅ Detecta erros de sintaxe básicos
- ✅ Testa renderização com dados mock
- ⚠️ **NÃO** testa lógica complexa de negócio
- ⚠️ **NÃO** testa integração com banco de dados
- ⚠️ **NÃO** substitui testes end-to-end

**Recomendação:** Use este script como primeira camada de validação, mas mantenha testes completos para funcionalidades críticas.

---

## 🐛 Solução de Problemas

### Erro: "Template renderizou vazio"

**Causa:** Template pode ter lógica condicional que não renderiza nada com dados mock.

**Solução:** Verifique se o template tem condições que dependem de dados específicos. Ajuste os dados mock se necessário.

### Erro: "Tags EJS não balanceadas"

**Causa:** Tag EJS não fechada ou fechada incorretamente.

**Solução:** Verifique todas as tags `<%` e `%>` no arquivo.

### Aviso: "Uso de innerHTML sem sanitização"

**Causa:** Código JavaScript usando `innerHTML` diretamente com dados não sanitizados.

**Solução:** Substitua por `textContent` ou use biblioteca de sanitização (ex: DOMPurify).

---

## 📚 Referências

- [Documentação EJS](https://ejs.co/)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

---

**Última atualização:** 2025-01-XX

