# 🚀 Recomendações de Hospedagem - Plugin Cripto Woocommerce

## 📊 Análise do Projeto

Seu projeto precisa de:
- ✅ Node.js (Express)
- ✅ MongoDB (já usando Atlas - grátis)
- ✅ HTTPS (obrigatório para webhooks Stripe)
- ✅ Domínio personalizado
- ✅ Processo sempre rodando (não serverless)

---

## 🏆 TOP 3 RECOMENDAÇÕES (Ordem de Custo)

### 1. **Railway.app** ⭐ RECOMENDADO
**Custo:** Grátis (com limites) ou $5/mês

**Vantagens:**
- ✅ Setup super fácil (conecta GitHub)
- ✅ HTTPS automático
- ✅ Domínio grátis (.railway.app)
- ✅ Deploy automático
- ✅ Logs integrados
- ✅ Variáveis de ambiente fáceis

**Plano Grátis:**
- $5 de crédito/mês
- Suficiente para projeto pequeno/médio
- Auto-sleep após inatividade (acorda na primeira requisição)

**Como usar:**
1. Acesse: https://railway.app
2. Conecte seu GitHub
3. Selecione o repositório
4. Railway detecta Node.js automaticamente
5. Adicione variáveis de ambiente (.env)
6. Deploy automático!

**Custo real:** Grátis para começar, depois $5-10/mês

---

### 2. **Render.com** ⭐ MUITO BOM
**Custo:** Grátis (com limites) ou $7/mês

**Vantagens:**
- ✅ Plano grátis generoso
- ✅ HTTPS automático
- ✅ Deploy automático do GitHub
- ✅ Fácil configuração
- ✅ Suporte a webhooks

**Plano Grátis:**
- Serviço pode "dormir" após 15min inativo
- Primeira requisição demora ~30s para acordar
- Perfeito para desenvolvimento/testes

**Plano Pago ($7/mês):**
- Sempre online
- Sem limites de tráfego
- Ideal para produção

**Como usar:**
1. Acesse: https://render.com
2. Conecte GitHub
3. Crie "Web Service"
4. Selecione repositório
5. Configure:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: Node
6. Adicione variáveis de ambiente
7. Deploy!

**Custo real:** Grátis para testes, $7/mês para produção

---

### 3. **Fly.io** ⭐ ALTERNATIVA
**Custo:** Grátis (3 VMs pequenas grátis)

**Vantagens:**
- ✅ 3 VMs grátis para sempre
- ✅ Performance excelente
- ✅ Global (múltiplas regiões)
- ✅ HTTPS automático

**Desvantagens:**
- ⚠️ Setup um pouco mais complexo
- ⚠️ Precisa criar `fly.toml`

**Custo real:** Grátis até certo ponto, depois ~$5-10/mês

---

## 💰 Comparação de Custos

| Serviço | Plano Grátis | Plano Pago | Dificuldade |
|---------|--------------|------------|-------------|
| **Railway** | $5 crédito/mês | $5-10/mês | ⭐ Muito Fácil |
| **Render** | Com sleep | $7/mês | ⭐ Muito Fácil |
| **Fly.io** | 3 VMs grátis | $5-10/mês | ⭐⭐ Fácil |
| **DigitalOcean** | Não | $5/mês | ⭐⭐ Médio |
| **VPS (Hetzner)** | Não | €4/mês (~R$22) | ⭐⭐⭐ Difícil |

---

## 🎯 RECOMENDAÇÃO FINAL

### Para Começar (Desenvolvimento/Testes):
**Railway.app** - Grátis, super fácil, perfeito para começar

### Para Produção (Cliente Real):
**Render.com** - $7/mês, sempre online, confiável

### Para Economizar Máximo:
**VPS Hetzner** - €4/mês (~R$22), mas precisa configurar tudo

---

## 📋 Checklist de Deploy

### Antes de Fazer Deploy:

1. ✅ **Variáveis de Ambiente:**
   ```
   MONGO_URI=sua_uri_mongodb
   PORT=5000 (ou deixe vazio, o serviço define)
   SESSION_SECRET=sua_chave_secreta
   ```

2. ✅ **Arquivo .gitignore:**
   - Certifique-se que `.env` está no .gitignore
   - Não commite chaves secretas!

3. ✅ **package.json:**
   - Verifique se tem `"start": "node server.js"`

4. ✅ **MongoDB Atlas:**
   - Adicione IP do servidor na whitelist (ou 0.0.0.0/0 para permitir todos)

5. ✅ **Stripe Webhook:**
   - Configure URL: `https://seu-dominio.com/webhook/stripe`
   - Use HTTPS obrigatoriamente!

---

## 🚀 Guia Rápido - Railway (Recomendado)

### Passo a Passo:

1. **Criar conta:**
   - Acesse: https://railway.app
   - Login com GitHub

2. **Novo Projeto:**
   - Clique em "New Project"
   - Selecione "Deploy from GitHub repo"
   - Escolha seu repositório

3. **Configurar:**
   - Railway detecta Node.js automaticamente
   - Vá em "Variables" e adicione:
     - `MONGO_URI`
     - `SESSION_SECRET`
     - `PORT` (opcional)

4. **Domínio:**
   - Vá em "Settings" > "Generate Domain"
   - Ou adicione domínio customizado

5. **Deploy:**
   - Automaticamente após push no GitHub!
   - Ou clique em "Deploy Now"

6. **Logs:**
   - Veja logs em tempo real na aba "Deployments"

---

## 🔒 Segurança

### Importante:
- ✅ **NUNCA** commite `.env` no GitHub
- ✅ Use variáveis de ambiente do serviço
- ✅ Mantenha `SESSION_SECRET` forte e único
- ✅ Use HTTPS sempre (obrigatório para Stripe)
- ✅ Configure firewall do MongoDB Atlas

---

## 💡 Dicas Finais

1. **Comece com Railway grátis** para testar
2. **Mude para Render pago** quando tiver clientes reais
3. **MongoDB Atlas já é grátis** - não precisa mudar
4. **Domínio:** Compre na Namecheap ou Registro.br (~R$30/ano)
5. **Backup:** Configure backup automático do MongoDB

---

## 📞 Suporte

Se precisar de ajuda no deploy, me avise! Posso criar scripts de deploy automático ou guias mais detalhados para qualquer plataforma.
