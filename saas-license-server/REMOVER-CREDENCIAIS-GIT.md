# 🔒 REMOVER CREDENCIAIS DO HISTÓRICO DO GIT

**Status:** 🔴 **CRÍTICO - EXECUTAR AGORA**

---

## ⚠️ ATENÇÃO

Este guia é para remover o arquivo `configuracao.env` do histórico do Git, pois ele contém credenciais expostas.

**IMPORTANTE:** Se o repositório já foi compartilhado ou está público, as credenciais já podem ter sido expostas. **ROTACIONAR AS CREDENCIAIS É OBRIGATÓRIO!**

---

## 📋 PASSOS PARA REMOVER DO GIT

### Opção 1: Se o arquivo ainda NÃO foi commitado

```bash
# Apenas remover do índice (mantém arquivo local)
git rm --cached saas-license-server/configuracao.env

# Commit
git commit -m "Remover configuracao.env - credenciais sensíveis"
```

---

### Opção 2: Se o arquivo JÁ foi commitado (mais comum)

#### Passo 1: Remover do índice atual

```bash
git rm --cached saas-license-server/configuracao.env
git commit -m "Remover configuracao.env do repositório"
```

#### Passo 2: Limpar histórico (reescreve histórico do Git)

**⚠️ ATENÇÃO:** Isso reescreve o histórico do Git. Avise sua equipe antes!

```bash
# Usando git filter-branch (método tradicional)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch saas-license-server/configuracao.env" \
  --prune-empty --tag-name-filter cat -- --all
```

**OU** usando `git-filter-repo` (método moderno - recomendado):

```bash
# Instalar git-filter-repo (se não tiver)
pip install git-filter-repo

# Remover arquivo do histórico
git filter-repo --path saas-license-server/configuracao.env --invert-paths
```

#### Passo 3: Forçar push (CUIDADO!)

```bash
# Avisar equipe antes!
git push origin --force --all
git push origin --force --tags
```

---

### Opção 3: Usando BFG Repo-Cleaner (Mais Rápido)

```bash
# 1. Instalar BFG
# Download: https://rtyley.github.io/bfg-repo-cleaner/

# 2. Clonar repositório como espelho
git clone --mirror https://github.com/usuario/repositorio.git

# 3. Remover arquivo
java -jar bfg.jar --delete-files configuracao.env repositorio.git

# 4. Limpar e fazer push
cd repositorio.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

---

## ✅ VERIFICAÇÃO

Após remover, verifique:

```bash
# Verificar que arquivo não está mais no Git
git log --all --full-history -- saas-license-server/configuracao.env
# Não deve retornar nada

# Verificar que .gitignore está funcionando
git check-ignore saas-license-server/configuracao.env
# Deve retornar: saas-license-server/configuracao.env
```

---

## 🔄 SE O REPOSITÓRIO É PÚBLICO

Se o repositório é público no GitHub/GitLab:

1. 🔴 **ROTACIONAR CREDENCIAIS IMEDIATAMENTE**
2. 🔴 Limpar histórico (se possível)
3. 🔴 Considerar tornar privado temporariamente
4. 🔴 Verificar logs de acesso para atividades suspeitas

**Nota:** Mesmo limpando o histórico, as credenciais podem ter sido copiadas. Rotacionar é obrigatório!

---

## 📝 APÓS REMOVER

1. ✅ Criar `configuracao.env` localmente (não commitado)
2. ✅ Preencher com novas credenciais (após rotacionar)
3. ✅ Verificar que `.gitignore` está funcionando
4. ✅ Testar que o servidor funciona com novas credenciais

---

**Última atualização:** 2025-01-XX  
**Prioridade:** 🔴 **CRÍTICA**




