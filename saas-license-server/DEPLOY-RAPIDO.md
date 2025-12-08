# 🚀 Deploy Rápido - Railway.app

## ⚡ Deploy em 5 Minutos

### 1. Preparar Repositório
```bash
# Certifique-se que está tudo commitado
git add .
git commit -m "Preparado para deploy"
git push
```

### 2. Criar Conta Railway
1. Acesse: https://railway.app
2. Clique em "Login" > "GitHub"
3. Autorize o Railway

### 3. Deploy
1. Clique em "New Project"
2. Selecione "Deploy from GitHub repo"
3. Escolha seu repositório
4. Railway detecta automaticamente!

### 4. Configurar Variáveis
1. Vá em "Variables"
2. Adicione:
   ```
   MONGO_URI=sua_uri_do_mongodb_atlas
   SESSION_SECRET=uma_chave_secreta_forte_aqui
   PORT=5000
   ```

### 5. Obter Domínio
1. Vá em "Settings"
2. Clique em "Generate Domain"
3. Copie a URL (ex: `seu-projeto.up.railway.app`)

### 6. Configurar Stripe Webhook
1. Acesse: https://dashboard.stripe.com/webhooks
2. Adicione endpoint:
   - URL: `https://seu-projeto.up.railway.app/webhook/stripe`
   - Eventos: `checkout.session.completed`
3. Copie o Webhook Secret
4. Adicione no Railway Variables:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### 7. Atualizar MongoDB Atlas
1. Acesse MongoDB Atlas
2. Vá em "Network Access"
3. Adicione IP: `0.0.0.0/0` (permite todos) OU
4. Adicione o IP do Railway (veja nos logs)

### ✅ Pronto!
Seu servidor está rodando em: `https://seu-projeto.up.railway.app`

---

## 🔧 Troubleshooting

### Erro: "Cannot find module"
- Verifique se todas as dependências estão no `package.json`
- Railway roda `npm install` automaticamente

### Erro: "Port already in use"
- Railway define a porta automaticamente via `PORT`
- Seu código já usa `process.env.PORT || 5000` ✅

### Erro: MongoDB connection
- Verifique se o IP está na whitelist do Atlas
- Use `0.0.0.0/0` temporariamente para testar

### Webhook não funciona
- Certifique-se que está usando HTTPS
- Verifique o secret do webhook
- Veja logs no Railway para debug

---

## 💰 Custos

**Plano Grátis:**
- $5 de crédito/mês
- Suficiente para ~100 horas de uso
- Auto-sleep após inatividade

**Plano Pago:**
- $5/mês = sempre online
- $10/mês = mais recursos

---

## 📝 Checklist Final

- [ ] Código no GitHub
- [ ] Conta Railway criada
- [ ] Projeto deployado
- [ ] Variáveis de ambiente configuradas
- [ ] Domínio gerado
- [ ] MongoDB Atlas configurado
- [ ] Stripe webhook configurado
- [ ] Testado acesso ao site
- [ ] Testado checkout

---

## 🎯 Próximos Passos

1. Comprar domínio (opcional): Namecheap, Registro.br
2. Configurar DNS no Railway
3. Ativar SSL automático
4. Monitorar logs e performance
