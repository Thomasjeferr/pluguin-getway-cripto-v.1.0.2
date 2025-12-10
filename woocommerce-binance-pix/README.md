# WooCommerce Binance Pix Gateway

**Versão:** 1.0.0  
**Autor:** Plugin Cripto Woocommerce  
**Requer:** WordPress 5.8+, WooCommerce 3.0+, PHP 7.4+

---

## 📋 Descrição

Plugin para WooCommerce que permite aceitar pagamentos via **Pix** com conversão automática para **USDT** através da API Binance Pay. O cliente paga em Pix (BRL) e você recebe em USDT na sua carteira Binance.

### ✨ Características Principais

- 💳 **Pagamento via Pix** - Aceite pagamentos instantâneos via Pix
- 🪙 **Conversão Automática** - Receba em USDT na sua carteira Binance
- 🔒 **Sistema de Licenciamento** - Controle de licenças via servidor SaaS
- ⏱️ **Timer de Expiração** - Contagem regressiva visual para pagamentos
- 📋 **Copiar Código Pix** - Botão para copiar código Pix facilmente
- 🔔 **Webhook Seguro** - Validação HMAC-SHA512 de webhooks
- ⚡ **Expiração Automática** - Cancelamento automático de pedidos expirados
- 🧪 **Modo de Teste** - Suporte para testes com chaves de teste
- 📱 **Responsivo** - Interface otimizada para mobile e desktop

---

## 📦 Instalação

### Requisitos

- WordPress 5.8 ou superior
- WooCommerce 3.0 ou superior
- PHP 7.4 ou superior
- Servidor com suporte a SSL (HTTPS) para produção
- Conta Binance Merchant ativa
- Licença válida do plugin

### Passo a Passo

1. **Baixe o plugin** ou faça upload via WordPress Admin
2. **Ative o plugin** em `Plugins > Plugins Instalados`
3. **Configure o gateway** em `WooCommerce > Configurações > Pagamentos > Binance Pix / USDT`
4. **Insira suas credenciais:**
   - Licença (Email e Chave)
   - Credenciais Binance Pay (API Key e Secret Key)
5. **Salve as configurações** - A licença será validada automaticamente

---

## ⚙️ Configuração

### 1. Configurações Gerais

#### Ativar/Desativar
- Marque para ativar o método de pagamento no checkout

#### Título do Método de Pagamento
- Texto exibido no checkout (padrão: "Pix / Binance Pay")

#### Descrição do Método de Pagamento
- Descrição exibida no checkout (padrão: "Pague com Pix e receba em USDT na sua carteira Binance.")

#### URL de Sucesso Personalizada
- URL para redirecionar após pagamento confirmado
- Deixe em branco para usar a padrão do WooCommerce
- Exemplo: `https://seusite.com/obrigado`

#### Tempo de Expiração do Pagamento
- Tempo máximo para o cliente realizar o pagamento (em minutos)
- **Mínimo:** 5 minutos
- **Padrão:** 15 minutos
- Pedidos não pagos serão cancelados automaticamente após este tempo

### 2. Sistema de Licenciamento

#### URL do Servidor de Licença
- URL base do servidor SaaS de licenças
- Exemplo: `https://seusite.com` ou `http://localhost:3000` (desenvolvimento)
- **Padrão:** `http://localhost:3000`

#### Email de Licença
- Email usado para comprar a licença
- Deve corresponder ao email cadastrado no servidor SaaS

#### Chave de Ativação
- Chave de licença recebida por email após a compra
- A licença será validada automaticamente ao salvar

**Status da Licença:**
- ✅ **Verde:** Licença válida e ativa
- ❌ **Vermelho:** Licença inválida ou expirada
- ⚠️ **Amarelo:** Licença não validada ainda

> **Nota:** A licença é validada automaticamente:
> - Ao salvar as configurações
> - Diariamente via cron job
> - Ao verificar o status no admin

### 3. Credenciais Binance Pay

#### Modo de Teste
- Marque para usar chaves de teste
- ⚠️ **IMPORTANTE:** Binance Pay não possui sandbox dedicado
- Use chaves de **TESTE** do portal Binance Merchant
- A URL da API permanece a mesma, apenas as chaves mudam

#### Binance API Key
- Chave pública da API Binance Pay
- Obtenha em: [Binance Merchant Portal](https://merchant.binance.com/en/dashboard/developers)

#### Binance Secret Key
- Chave secreta da API Binance Pay
- Mantenha em segredo e nunca compartilhe

**Como obter as chaves:**
1. Acesse o [Portal Binance Merchant](https://merchant.binance.com/en/dashboard/developers)
2. Faça login com sua conta Binance
3. Navegue até **Developers > API Keys**
4. Crie uma nova API Key ou use uma existente
5. Copie a **API Key** e **Secret Key**
6. Cole nas configurações do plugin

---

## 🔧 Funcionamento

### Fluxo de Pagamento

1. **Cliente finaliza pedido** no checkout WooCommerce
2. **Plugin cria pedido** na API Binance Pay
3. **Modal é exibido** com QR Code e código Pix
4. **Cliente paga via Pix** usando app do banco
5. **Binance converte** Pix (BRL) para USDT automaticamente
6. **Webhook confirma** pagamento e atualiza pedido
7. **Cliente é redirecionado** para página de sucesso

### Timer de Expiração

- Timer visual mostra tempo restante para pagamento
- Fica vermelho quando restam menos de 60 segundos
- Pedidos não pagos são cancelados automaticamente após expiração
- Estoque é restaurado automaticamente ao cancelar

### Webhook

O plugin recebe notificações da Binance Pay via webhook:

- **PAY_SUCCESS:** Pagamento confirmado → Pedido marcado como pago
- **PAY_CLOSED:** Pagamento fechado → Pedido cancelado
- **PAY_CANCEL:** Pagamento cancelado → Pedido cancelado

**Segurança do Webhook:**
- Validação de assinatura HMAC-SHA512
- Verificação de Certificate-SN (API Key)
- Comparação segura com `hash_equals()` (proteção contra timing attacks)
- Sempre retorna HTTP 200 OK (não expõe falhas)

### Expiração Automática

- Cron job executa a cada 5 minutos
- Verifica pedidos pendentes/on-hold com pagamento Binance Pix
- Cancela pedidos expirados automaticamente
- Restaura estoque ao cancelar
- Adiciona nota no pedido

---

## 🔒 Segurança

### Proteções Implementadas

- ✅ **Validação de Nonce WordPress** - Proteção CSRF em endpoints AJAX
- ✅ **Validação de Permissões** - Verifica propriedade do pedido
- ✅ **Validação de Assinatura Webhook** - HMAC-SHA512
- ✅ **Verificação SSL** - Todas as requisições externas usam SSL
- ✅ **Sanitização de Inputs** - Todos os dados são sanitizados
- ✅ **Escape de Outputs** - Prevenção de XSS
- ✅ **Logging Seguro** - Sem exposição de dados sensíveis

### Recomendações

- Use **HTTPS** em produção (obrigatório para webhooks)
- Mantenha as **chaves secretas** em segurança
- Não compartilhe suas **credenciais Binance**
- Use **chaves de teste** durante desenvolvimento
- Monitore os **logs do WooCommerce** para erros

---

## 🐛 Solução de Problemas

### Licença não valida

**Sintomas:**
- Status da licença mostra vermelho
- Mensagem de erro ao salvar

**Soluções:**
1. Verifique se o email e chave estão corretos
2. Confirme que a URL do servidor está correta
3. Verifique se o servidor de licença está acessível
4. Confirme que a licença está ativa no servidor SaaS
5. Verifique os logs do WooCommerce (`WooCommerce > Status > Logs`)

### Pagamento não confirma

**Sintomas:**
- Cliente pagou mas pedido não atualiza
- Webhook não recebe notificação

**Soluções:**
1. Verifique se o webhook está configurado na Binance:
   - URL: `https://seusite.com/wc-api/wc_binance_pix_gateway`
2. Confirme que o site usa HTTPS (obrigatório)
3. Verifique os logs do WooCommerce para erros de webhook
4. Teste o webhook manualmente na Binance Merchant Portal
5. Verifique se o firewall não está bloqueando requisições

### QR Code não aparece

**Sintomas:**
- Modal abre mas QR Code não carrega
- Erro ao criar pedido na Binance

**Soluções:**
1. Verifique se as credenciais Binance estão corretas
2. Confirme que está usando chaves de teste em modo de teste
3. Verifique os logs do WooCommerce para erros da API
4. Teste a conexão com a API Binance manualmente
5. Verifique se o servidor tem acesso à internet

### Timer não funciona

**Sintomas:**
- Timer não aparece ou não atualiza
- Contagem regressiva não funciona

**Soluções:**
1. Limpe o cache do navegador
2. Verifique se o JavaScript está carregando
3. Abra o console do navegador (F12) para erros
4. Confirme que o tempo de expiração está configurado (mínimo 5 min)

---

## 📝 Logs

O plugin registra logs detalhados no sistema de logs do WooCommerce:

**Localização:** `WooCommerce > Status > Logs`

**Fontes de Log:**
- `binance-pix-api` - Requisições e respostas da API Binance
- `binance-pix-webhook` - Processamento de webhooks
- `binance-pix-license` - Validação de licenças

**Níveis de Log:**
- **Info:** Operações normais (modo de teste)
- **Error:** Erros e falhas
- **Success:** Operações bem-sucedidas

---

## 🔄 Atualizações

### Versão 1.0.0 (08/12/2025)

- ✅ Lançamento inicial
- ✅ Integração com Binance Pay API
- ✅ Sistema de licenciamento
- ✅ Timer de expiração visual
- ✅ Webhook seguro com validação HMAC-SHA512
- ✅ Expiração automática de pedidos
- ✅ Validação de nonce WordPress
- ✅ Validação de permissões

---

## 📞 Suporte

### Documentação
- [Binance Pay API Documentation](https://developers.binance.com/docs/binance-pay)
- [WooCommerce Payment Gateway API](https://woocommerce.com/document/payment-gateway-api/)

### Contato
Para suporte técnico, entre em contato através do servidor SaaS de licenças.

---

## 📄 Licença

Este plugin requer uma licença válida para funcionar. A licença é gerenciada através de um servidor SaaS.

**Termos de Uso:**
- Uma licença por domínio
- Licença válida apenas para o domínio registrado
- Não é permitido clonar ou redistribuir o plugin
- Suporte técnico incluído durante período de licença ativa

---

## 🛠️ Desenvolvimento

### Estrutura de Arquivos

```
woocommerce-binance-pix/
├── assets/
│   ├── css/
│   │   └── checkout.css          # Estilos do modal
│   └── js/
│       └── checkout.js           # JavaScript do frontend
├── includes/
│   ├── class-wc-binance-api.php  # Helper da API Binance
│   └── class-wc-binance-pix-gateway.php  # Classe principal
├── woocommerce-binance-pix.php   # Arquivo principal
└── README.md                     # Este arquivo
```

### Hooks e Filtros

**Actions:**
- `wc_binance_pix_check_expired_orders` - Cron para verificar pedidos expirados
- `wc_binance_pix_check_license` - Cron para verificar licença

**Filters:**
- `cron_schedules` - Adiciona intervalo de 5 minutos
- `woocommerce_payment_gateways` - Registra o gateway

### Endpoints API

- `wc-api/wc_binance_pix_gateway` - Webhook da Binance Pay
- `wc-api/wc_binance_check_status` - Verificação de status (polling)
- `wc-api/wc_binance_get_pix_code` - Obter código Pix

---

## ⚠️ Avisos Importantes

1. **Binance Pay não possui sandbox dedicado**
   - Use chaves de TESTE do portal Binance Merchant
   - A URL da API é a mesma para teste e produção
   - Certifique-se de usar chaves de teste durante desenvolvimento

2. **HTTPS é obrigatório em produção**
   - Webhooks da Binance requerem HTTPS
   - Certificados SSL válidos são necessários

3. **Licença é obrigatória**
   - O plugin não funciona sem licença válida
   - A licença é validada automaticamente
   - Pedidos não podem ser processados sem licença ativa

4. **Tempo de expiração mínimo**
   - O tempo mínimo de expiração é 5 minutos
   - Valores menores serão ajustados automaticamente

---

## 📊 Status do Plugin

**Score de Qualidade:** 85/100

**Funcionalidades:**
- ✅ Integração Binance Pay completa
- ✅ Sistema de licenciamento robusto
- ✅ Segurança implementada
- ✅ Frontend moderno e responsivo
- ✅ Tratamento de erros abrangente

**Melhorias Futuras:**
- 🔄 Tradução (i18n)
- 🔄 Melhorias de acessibilidade
- 🔄 Consulta de status na Binance
- 🔄 Minificação de assets

---

**Última atualização:** 08/12/2025  
**Versão:** 1.0.0
