# Integração Stripe Completa - Instruções

## ✅ O que foi implementado:

### 1. **Painel Admin - Configuração Stripe**
- Campos para inserir:
  - **Stripe Secret Key** (sk_live_... ou sk_test_...)
  - **Stripe Publishable Key** (pk_live_... ou pk_test_...)
  - **Webhook Secret** (whsec_...)

### 2. **Gerenciamento de Assinaturas**
- Botões de ação na tabela de licenças:
  - ✅ Ativar/Bloquear assinatura
  - 🔑 Regenerar chave de licença
  - 📋 Copiar chave de licença
  - 🔄 Alterar plano (Trial/Mensal/Anual)

### 3. **Checkout com Stripe Real**
- Modais funcionais com integração Stripe
- Redirecionamento para Stripe Checkout
- Processamento de pagamentos reais
- Webhook para processar eventos do Stripe

### 4. **Rotas Implementadas**
- `/create-checkout-session` - Cria sessão Stripe
- `/payment-success` - Página de sucesso após pagamento
- `/webhook/stripe` - Processa eventos do Stripe
- `/admin/manage-subscription` - API para gerenciar assinaturas

## 📋 Como Configurar:

### Passo 1: Instalar Stripe
```bash
cd saas-license-server
npm install stripe
```

### Passo 2: Obter Chaves do Stripe
1. Acesse: https://dashboard.stripe.com/apikeys
2. Copie as chaves:
   - **Secret Key** (sk_test_... ou sk_live_...)
   - **Publishable Key** (pk_test_... ou pk_live_...)

### Passo 3: Configurar Webhook
1. Acesse: https://dashboard.stripe.com/webhooks
2. Clique em "Add endpoint"
3. URL: `https://seu-dominio.com/webhook/stripe`
4. Eventos para ouvir:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
5. Copie o **Signing secret** (whsec_...)

### Passo 4: Configurar no Painel Admin
1. Acesse: `http://localhost:5000/acesso-admin`
2. Login: `master_root_v1`
3. Senha: `X7#k9$mP2@secure_v9`
4. Preencha os campos do Stripe
5. Clique em "Salvar Alterações"

## 🎯 Funcionalidades:

### Para Admin:
- ✅ Gerenciar todas as assinaturas
- ✅ Ativar/Desativar licenças
- ✅ Regenerar chaves
- ✅ Alterar planos
- ✅ Configurar Stripe

### Para Clientes:
- ✅ Teste grátis (7 dias)
- ✅ Assinatura mensal
- ✅ Assinatura anual
- ✅ Checkout seguro via Stripe
- ✅ Acesso imediato após pagamento

## ⚠️ Importante:

1. **Teste primeiro com chaves de teste** (sk_test_...)
2. **Configure o webhook** para processar eventos automaticamente
3. **Use HTTPS em produção** para o webhook funcionar
4. **Mantenha as chaves secretas seguras** - nunca compartilhe

## 🔧 Troubleshooting:

- **Erro ao criar sessão Stripe**: Verifique se as chaves estão corretas
- **Webhook não funciona**: Verifique a URL e o secret
- **Pagamento não confirma**: Verifique os logs do Stripe Dashboard
