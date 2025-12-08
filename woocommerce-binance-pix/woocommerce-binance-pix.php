<?php
/**
 * Plugin Name: WooCommerce Binance Pix Gateway
 * Plugin URI: https://seusite.com/
 * Description: Aceite pagamentos via Pix com conversão automática para USDT via Binance Pay. Requer licença ativa.
 * Version: 1.0.0
 * Author: Seu Nome
 * Author URI: https://seusite.com/
 * Text Domain: wc-binance-pix
 * Domain Path: /i18n/languages/
 * Requires at least: 5.8
 * Requires PHP: 7.4
 *
 * @package WooCommerce
 */

defined( 'ABSPATH' ) || exit;

// Define plugin paths
define( 'WC_BINANCE_PIX_PATH', plugin_dir_path( __FILE__ ) );
define( 'WC_BINANCE_PIX_URL', plugin_dir_url( __FILE__ ) );

/**
 * Check if WooCommerce is active
 */
if ( ! in_array( 'woocommerce/woocommerce.php', apply_filters( 'active_plugins', get_option( 'active_plugins' ) ) ) ) {
	return;
}

/**
 * Initialize the gateway class
 */
function wc_binance_pix_init() {
	if ( ! class_exists( 'WC_Payment_Gateway' ) ) {
		return;
	}

    // Carregar Helper da API primeiro
    require_once WC_BINANCE_PIX_PATH . 'includes/class-wc-binance-api.php';
	require_once WC_BINANCE_PIX_PATH . 'includes/class-wc-binance-pix-gateway.php';
}
add_action( 'plugins_loaded', 'wc_binance_pix_init' );

/**
 * Add the gateway to WooCommerce
 */
function wc_binance_pix_add_to_gateways( $gateways ) {
	$gateways[] = 'WC_Binance_Pix_Gateway';
	return $gateways;
}
add_filter( 'woocommerce_payment_gateways', 'wc_binance_pix_add_to_gateways' );

/**
 * License Checker (Placeholder for now)
 */
function wc_binance_pix_check_license() {
    // Logic to check with SaaS API will go here
}
