# 🚀 GUIA PARA CONECTAR O PROJETO AO GITHUB

## 📋 Passo a Passo

### 1️⃣ **Criar Repositório no GitHub**

1. Acesse: **https://github.com/new**
2. Preencha:
   - **Repository name:** `woocommerce-binance-pix-plugin` (ou outro nome de sua escolha)
   - **Description:** `Plugin WooCommerce para pagamentos via Binance Pay e PIX`
   - **Visibility:** Escolha **Private** (recomendado) ou **Public**
   - **NÃO marque** "Add a README file" (já temos um)
   - **NÃO marque** "Add .gitignore" (já temos um)
   - **NÃO marque** "Choose a license" (opcional)
3. Clique em **"Create repository"**

### 2️⃣ **Copiar a URL do Repositório**

Após criar o repositório, o GitHub mostrará uma página com instruções. Você verá algo como:

```
https://github.com/SEU-USUARIO/woocommerce-binance-pix-plugin.git
```

**Copie essa URL!** Você precisará dela nos próximos passos.

### 3️⃣ **Executar os Comandos no Terminal**

Abra o PowerShell ou Git Bash no diretório do projeto e execute:

```powershell
# 1. Inicializar o Git (se ainda não foi feito)
git init

# 2. Adicionar todos os arquivos
git add .

# 3. Criar o primeiro commit
git commit -m "feat: Implementação completa do plugin WooCommerce Binance Pix + Servidor SaaS

- ✅ Correção de todas as vulnerabilidades XSS
- ✅ Correção de erros de sintaxe EJS
- ✅ Implementação de validação de templates
- ✅ Correção de credenciais expostas
- ✅ Implementação de função de licença
- ✅ Sistema de logging profissional
- ✅ Validação de entrada consistente
- ✅ Sanitização de regex
- ✅ Cookies seguros
- ✅ Versão centralizada do plugin
- ✅ Defensive programming em templates EJS"

# 4. Renomear branch para 'main' (padrão do GitHub)
git branch -M main

# 5. Adicionar o repositório remoto do GitHub
# SUBSTITUA 'SEU-USUARIO' e 'NOME-REPOSITORIO' pela URL que você copiou
git remote add origin https://github.com/SEU-USUARIO/NOME-REPOSITORIO.git

# 6. Enviar o código para o GitHub
git push -u origin main
```

### 4️⃣ **Autenticação no GitHub**

Se for solicitado, você precisará autenticar:

**Opção A - Personal Access Token (Recomendado):**
1. Acesse: https://github.com/settings/tokens
2. Clique em **"Generate new token"** → **"Generate new token (classic)"**
3. Dê um nome (ex: "Meu Projeto Plugin")
4. Marque a opção **"repo"** (acesso completo aos repositórios)
5. Clique em **"Generate token"**
6. **COPIE O TOKEN** (você só verá ele uma vez!)
7. Quando o Git pedir senha, use o **token** ao invés da senha

**Opção B - GitHub CLI:**
```powershell
# Instalar GitHub CLI (se não tiver)
winget install GitHub.cli

# Autenticar
gh auth login
```

### 5️⃣ **Verificar se Funcionou**

Após o `git push`, acesse seu repositório no GitHub:
```
https://github.com/SEU-USUARIO/NOME-REPOSITORIO
```

Você deve ver todos os arquivos do projeto lá! 🎉

---

## 🔄 **Comandos para Atualizações Futuras**

Sempre que fizer alterações, use:

```powershell
# 1. Ver o que mudou
git status

# 2. Adicionar arquivos alterados
git add .

# 3. Criar commit com mensagem descritiva
git commit -m "feat: descrição das mudanças"

# 4. Enviar para o GitHub
git push
```

---

## 📝 **Exemplo de Mensagens de Commit**

Use mensagens descritivas seguindo o padrão:

- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Documentação
- `style:` - Formatação
- `refactor:` - Refatoração
- `test:` - Testes
- `chore:` - Manutenção

**Exemplos:**
```bash
git commit -m "feat: adicionar validação de templates EJS"
git commit -m "fix: corrigir vulnerabilidade XSS em dashboard"
git commit -m "docs: atualizar README com instruções de instalação"
```

---

## ⚠️ **Importante**

- ✅ O arquivo `.gitignore` já está configurado para **não enviar**:
  - `node_modules/`
  - `.env` e arquivos de configuração sensíveis
  - `configuracao.env` (credenciais)
  - Logs e arquivos temporários

- ✅ **NUNCA** faça commit de:
  - Credenciais reais (`.env` com dados reais)
  - Senhas ou tokens
  - Chaves de API

---

## 🆘 **Problemas Comuns**

### Erro: "remote origin already exists"
```powershell
git remote remove origin
git remote add origin https://github.com/SEU-USUARIO/NOME-REPOSITORIO.git
```

### Erro: "failed to push some refs"
```powershell
git pull origin main --allow-unrelated-histories
git push -u origin main
```

### Esqueceu a URL do repositório?
```powershell
git remote -v
```

---

## 📞 **Precisa de Ajuda?**

Se encontrar problemas, verifique:
1. ✅ Você está autenticado no GitHub?
2. ✅ A URL do repositório está correta?
3. ✅ Você tem permissão para escrever no repositório?
4. ✅ O repositório foi criado no GitHub?

---

**Boa sorte! 🚀**




