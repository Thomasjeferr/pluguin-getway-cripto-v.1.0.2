# 🔒 GUIA URGENTE: Rotação de Credenciais Expostas

**Status:** 🔴 **CRÍTICO - AÇÃO IMEDIATA NECESSÁRIA**

---

## ⚠️ PROBLEMA IDENTIFICADO

O arquivo `configuracao.env` foi commitado no repositório Git, expondo credenciais sensíveis:

- ✅ MongoDB URI com usuário e senha
- ✅ SESSION_SECRET

**Impacto:** 🔴 **CRÍTICO** - Qualquer pessoa com acesso ao repositório pode ver essas credenciais.

---

## 🚨 AÇÕES URGENTES (FAZER AGORA)

### 1. **Rotacionar Credenciais do MongoDB** 🔴 URGENTE

#### No MongoDB Atlas:

1. Acesse: https://cloud.mongodb.com/
2. Vá em **Database Access**
3. Encontre o usuário: `thomasjferrer_db_user`
4. Clique em **Edit** → **Edit Password**
5. Gere uma nova senha forte
6. Salve a nova senha em local seguro

#### Atualizar Connection String:

```bash
# Nova URI será algo como:
MONGO_URI=mongodb+srv://thomasjferrer_db_user:NOVA_SENHA_AQUI@cluster0.qscmo2c.mongodb.net/cryptosaas?retryWrites=true&w=majority
```

---

### 2. **Gerar Novo SESSION_SECRET** 🔴 URGENTE

Execute no terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Ou use este gerador online: https://randomkeygen.com/

**Atualizar no arquivo:**
```env
SESSION_SECRET=SUA_NOVA_CHAVE_GERADA_AQUI
```

---

### 3. **Remover Arquivo do Git** 🔴 URGENTE

Se você estiver usando Git:

```bash
# Remover do índice (não deleta o arquivo local)
git rm --cached saas-license-server/configuracao.env

# Commit a remoção
git commit -m "Remover configuracao.env do repositório (credenciais sensíveis)"

# Se já foi feito push, você precisará limpar o histórico
# ATENÇÃO: Isso reescreve o histórico do Git
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch saas-license-server/configuracao.env" \
  --prune-empty --tag-name-filter cat -- --all

# Forçar push (CUIDADO - avise sua equipe antes!)
git push origin --force --all
```

**⚠️ IMPORTANTE:** Se o repositório é público ou compartilhado, as credenciais já podem ter sido expostas. **ROTACIONAR É OBRIGATÓRIO!**

---

### 4. **Verificar .gitignore** ✅

O `.gitignore` já está configurado corretamente:

```
configuracao.env
*.env
```

Mas o arquivo foi commitado **antes** do `.gitignore` ser configurado.

---

### 5. **Criar Arquivo Local** ✅

1. Copie o arquivo de exemplo:
   ```bash
   cp saas-license-server/configuracao.env.example saas-license-server/configuracao.env
   ```

2. Edite `configuracao.env` com suas credenciais reais (após rotacioná-las)

3. **NUNCA** faça commit deste arquivo

---

## 📋 CHECKLIST DE SEGURANÇA

- [ ] 🔴 Rotacionar senha do MongoDB
- [ ] 🔴 Gerar novo SESSION_SECRET
- [ ] 🔴 Remover arquivo do Git (se usando Git)
- [ ] 🔴 Atualizar arquivo local com novas credenciais
- [ ] ✅ Verificar que .gitignore está funcionando
- [ ] ✅ Criar configuracao.env.example (já criado)

---

## 🔐 BOAS PRÁTICAS

### Em Desenvolvimento

- ✅ Use `configuracao.env.example` como template
- ✅ Mantenha `configuracao.env` local apenas
- ✅ Nunca commite arquivos `.env`

### Em Produção

- ✅ Use variáveis de ambiente do sistema
- ✅ Use serviços de secrets (AWS Secrets Manager, Azure Key Vault, etc.)
- ✅ Nunca armazene credenciais em arquivos no servidor

---

## 🛠️ CONFIGURAÇÃO RECOMENDADA

### Desenvolvimento Local

```bash
# 1. Copiar exemplo
cp configuracao.env.example configuracao.env

# 2. Editar com suas credenciais
# (usar editor de texto)

# 3. Verificar que está no .gitignore
git check-ignore configuracao.env
# Deve retornar: saas-license-server/configuracao.env
```

### Produção (Recomendado)

Use variáveis de ambiente do sistema:

```bash
export MONGO_URI="mongodb+srv://..."
export SESSION_SECRET="..."
export ADMIN_USER="..."
export ADMIN_PASS="..."
```

Ou use um arquivo `.env` no servidor (fora do repositório).

---

## ⚠️ SE O REPOSITÓRIO É PÚBLICO

Se o repositório é público no GitHub/GitLab:

1. 🔴 **ROTACIONAR CREDENCIAIS IMEDIATAMENTE** (já expostas)
2. 🔴 Limpar histórico do Git (se possível)
3. 🔴 Considerar tornar o repositório privado
4. 🔴 Verificar logs de acesso ao MongoDB para atividades suspeitas

---

## 📞 SUPORTE

Se precisar de ajuda:

1. Verifique os logs do MongoDB Atlas para acesso não autorizado
2. Monitore tentativas de login no servidor
3. Considere adicionar IP whitelist no MongoDB Atlas

---

**Última atualização:** 2025-01-XX  
**Prioridade:** 🔴 **CRÍTICA - AÇÃO IMEDIATA**




