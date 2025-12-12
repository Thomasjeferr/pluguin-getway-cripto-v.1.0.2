# 📦 VERSIONAMENTO DO PLUGIN

**Plugin:** WooCommerce Binance Pix Gateway

---

## 📋 VERSÃO ATUAL

**Versão:** `1.0.0`

**Data de Lançamento:** 2025-01-XX

---

## 🔄 COMO ATUALIZAR A VERSÃO

### 1. Atualizar Constante

**Arquivo:** `woocommerce-binance-pix.php` (linha ~19)

```php
if ( ! defined( 'WC_BINANCE_PIX_VERSION' ) ) {
    define( 'WC_BINANCE_PIX_VERSION', '1.0.0' ); // ← Atualizar aqui
}
```

### 2. Atualizar Header do Plugin

**Arquivo:** `woocommerce-binance-pix.php` (linha 6)

```php
/**
 * Plugin Name: WooCommerce Binance Pix Gateway
 * ...
 * Version: 1.0.0  // ← Atualizar aqui também
 * ...
 */
```

**Nota:** O header do plugin é lido pelo WordPress, então deve ser atualizado manualmente. A constante `WC_BINANCE_PIX_VERSION` pode ser usada no código.

---

## 📝 HISTÓRICO DE VERSÕES

### 1.0.0 (2025-01-XX)
- ✅ Lançamento inicial
- ✅ Integração com Binance Pay API
- ✅ Sistema de licenciamento
- ✅ Timer de expiração visual
- ✅ Webhook seguro com validação HMAC-SHA512
- ✅ Expiração automática de pedidos
- ✅ Validação de nonce WordPress
- ✅ Validação de permissões

---

## 🔍 ONDE A VERSÃO É USADA

### 1. Header do Plugin
```php
/**
 * Version: 1.0.0
 */
```

### 2. Constante (Novo)
```php
define( 'WC_BINANCE_PIX_VERSION', '1.0.0' );
```

### 3. Uso no Código (Futuro)
```php
// Exemplo de uso da constante
$plugin_version = WC_BINANCE_PIX_VERSION;
```

---

## 📋 CHECKLIST DE ATUALIZAÇÃO

Ao atualizar a versão:

- [ ] Atualizar constante `WC_BINANCE_PIX_VERSION`
- [ ] Atualizar header do plugin (`Version:`)
- [ ] Atualizar `README.md` (se aplicável)
- [ ] Atualizar `VERSION.md` (este arquivo)
- [ ] Atualizar changelog
- [ ] Testar plugin após atualização

---

**Última atualização:** 2025-01-XX



