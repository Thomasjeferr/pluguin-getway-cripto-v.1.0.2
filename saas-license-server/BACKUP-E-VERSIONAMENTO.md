# 💾 Backup e Versionamento - Guia Completo

## 🎯 Estratégia de Backup Recomendada

### 1. **Git + GitHub** (Principal) ⭐ OBRIGATÓRIO
- ✅ Histórico completo de mudanças
- ✅ Pode voltar para qualquer versão
- ✅ Backup na nuvem (grátis)
- ✅ Colaboração fácil

### 2. **Backup Local** (Complementar)
- ✅ Backup manual antes de mudanças grandes
- ✅ Backup do banco de dados

### 3. **Tags Git** (Marcar Versões Estáveis)
- ✅ Marcar versões que funcionam
- ✅ Fácil voltar para versão estável

---

## 🚀 Setup Inicial - Git + GitHub

### Passo 1: Verificar se Git está instalado
```bash
git --version
```

Se não tiver, instale: https://git-scm.com/download/win

### Passo 2: Inicializar Git no Projeto
```bash
cd "C:\Users\thoma\OneDrive\Área de Trabalho\Pluguin -Woocomerc-Cripto-pix-usdt"
git init
```

### Passo 3: Criar .gitignore
Já criamos o arquivo `.gitignore` para proteger dados sensíveis.

### Passo 4: Primeiro Commit
```bash
git add .
git commit -m "Versão inicial estável - Plugin Cripto Woocommerce completo"
```

### Passo 5: Criar Repositório no GitHub
1. Acesse: https://github.com/new
2. Nome: `plugin-cripto-woocommerce` (ou outro)
3. Descrição: "SaaS de Licenciamento para Plugin WooCommerce Binance Pay"
4. **NÃO** marque "Initialize with README"
5. Clique em "Create repository"

### Passo 6: Conectar ao GitHub
```bash
git remote add origin https://github.com/SEU_USUARIO/plugin-cripto-woocommerce.git
git branch -M main
git push -u origin main
```

---

## 📌 Marcar Versão Estável (Tag)

### Quando marcar uma versão:
- ✅ Funcionalidades completas
- ✅ Testes passando
- ✅ Pronto para produção
- ✅ Antes de mudanças grandes

### Como marcar:
```bash
# Criar tag
git tag -a v1.0.0 -m "Versão estável - Integração Stripe completa"

# Enviar tag para GitHub
git push origin v1.0.0
```

### Voltar para versão marcada:
```bash
# Ver todas as tags
git tag

# Voltar para uma tag específica
git checkout v1.0.0

# Ou criar nova branch a partir da tag
git checkout -b versao-estavel v1.0.0
```

---

## 🔄 Workflow de Backup Diário

### Antes de fazer mudanças:
```bash
# 1. Ver status
git status

# 2. Adicionar mudanças
git add .

# 3. Commit com mensagem descritiva
git commit -m "Descrição do que foi feito"

# 4. Enviar para GitHub
git push
```

### Se algo der errado:
```bash
# Ver histórico
git log --oneline

# Voltar para commit anterior
git reset --hard HEAD~1

# OU voltar para commit específico
git reset --hard abc1234

# OU voltar para tag estável
git checkout v1.0.0
```

---

## 💾 Backup do Banco de Dados

### MongoDB Atlas já tem backup automático!
- ✅ Backup diário automático
- ✅ Pode restaurar até 2 dias atrás (plano grátis)
- ✅ Até 30 dias (planos pagos)

### Backup Manual (Opcional):
```bash
# Instalar mongodump (se necessário)
npm install -g mongodb-database-tools

# Fazer backup
mongodump --uri="sua_uri_mongodb" --out=./backup-$(date +%Y%m%d)
```

---

## 📁 Estrutura de Backup Recomendada

```
projeto/
├── .git/                    # Histórico Git
├── .gitignore              # Arquivos ignorados
├── backup-manual/          # Backups manuais (se necessário)
│   └── backup-2025-01-08/
└── [resto do projeto]
```

---

## 🛡️ O que está protegido no .gitignore

✅ **Protegido (NÃO vai para GitHub):**
- `.env` - Variáveis de ambiente
- `configuracao.env` - Configurações
- `node_modules/` - Dependências
- Arquivos temporários

✅ **Vai para GitHub:**
- Código fonte
- Views (HTML)
- Configurações públicas
- Documentação

---

## 🚨 Checklist de Segurança

Antes de fazer push para GitHub:

- [ ] `.env` está no `.gitignore`?
- [ ] `configuracao.env` está no `.gitignore`?
- [ ] Não há senhas no código?
- [ ] Não há chaves de API no código?
- [ ] `node_modules/` está ignorado?

---

## 📋 Scripts Úteis

### Backup Rápido (Windows)
Crie `backup-rapido.bat`:
```batch
@echo off
echo Fazendo backup...
git add .
git commit -m "Backup automatico - %date% %time%"
git push
echo Backup concluido!
pause
```

### Verificar Status
```bash
git status
git log --oneline -10  # Últimos 10 commits
```

---

## 🎯 Recomendações Finais

1. **Sempre faça commit antes de mudanças grandes**
2. **Use tags para marcar versões estáveis**
3. **GitHub é seu backup principal** - use sempre!
4. **MongoDB Atlas já faz backup automático**
5. **Teste antes de marcar como versão estável**

---

## 🔧 Troubleshooting

### Erro: "fatal: not a git repository"
```bash
git init
```

### Erro: "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/SEU_USUARIO/repo.git
```

### Esqueci de adicionar algo no commit anterior
```bash
git add arquivo-esquecido.js
git commit --amend --no-edit
git push --force
```

---

## 📞 Próximos Passos

1. ✅ Configurar Git
2. ✅ Criar repositório GitHub
3. ✅ Fazer primeiro commit
4. ✅ Marcar versão estável atual (v1.0.0)
5. ✅ Configurar backup automático (opcional)
