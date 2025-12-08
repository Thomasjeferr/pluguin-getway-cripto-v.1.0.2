# Plugin Cripto Woocommerce - SaaS de Licenciamento

Sistema completo de SaaS para gerenciamento de licenças do Plugin WooCommerce Binance Pay (Pix para USDT).

## 🚀 Funcionalidades

- ✅ Landing page moderna e responsiva
- ✅ Sistema de licenciamento com bloqueio por domínio
- ✅ Integração completa com Stripe para pagamentos
- ✅ Painel administrativo completo
- ✅ Área do cliente
- ✅ Teste grátis (7 dias)
- ✅ Planos mensais e anuais
- ✅ Download automático do plugin
- ✅ Webhooks do Stripe para processamento automático

## 📋 Requisitos

- Node.js 14+ 
- MongoDB (Atlas recomendado)
- Conta Stripe (para pagamentos)

## 🛠️ Instalação

```bash
cd saas-license-server
npm install
npm start
```

## ⚙️ Configuração

1. Copie `configuracao.env` para `.env`
2. Configure as variáveis:
   - `MONGO_URI` - URI do MongoDB Atlas
   - `SESSION_SECRET` - Chave secreta para sessões
   - `PORT` - Porta do servidor (padrão: 5000)

3. Configure Stripe no painel admin:
   - Acesse `/acesso-admin`
   - Login: `master_root_v1`
   - Senha: `X7#k9$mP2@secure_v9`
   - Preencha as chaves do Stripe

## 📦 Estrutura do Projeto

```
├── saas-license-server/     # Servidor Node.js
│   ├── server.js            # Servidor principal
│   ├── views/               # Templates EJS
│   └── package.json
├── woocommerce-binance-pix/ # Plugin WordPress
└── README.md
```

## 🔐 Credenciais Padrão

**Admin:**
- Usuário: `master_root_v1`
- Senha: `X7#k9$mP2@secure_v9`

⚠️ **IMPORTANTE:** Altere essas credenciais em produção!

## 📚 Documentação

- `BACKUP-E-VERSIONAMENTO.md` - Guia de backup e Git
- `HOSPEDAGEM-RECOMENDACOES.md` - Opções de hospedagem
- `DEPLOY-RAPIDO.md` - Guia de deploy no Railway
- `INTEGRACAO-STRIPE.md` - Configuração do Stripe

## 🚀 Deploy

Veja `DEPLOY-RAPIDO.md` para instruções detalhadas.

**Recomendado:** Railway.app (grátis para começar)

## 💾 Backup

Use Git + GitHub para versionamento:
```bash
git add .
git commit -m "Descrição das mudanças"
git push
```

Marque versões estáveis:
```bash
git tag -a v1.0.0 -m "Versão estável"
git push origin v1.0.0
```

## 📝 Licença

Proprietário - Todos os direitos reservados

## 🤝 Suporte

Para suporte, consulte a documentação ou abra uma issue.
