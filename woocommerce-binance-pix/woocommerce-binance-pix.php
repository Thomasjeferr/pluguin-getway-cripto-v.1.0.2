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
 * License Checker - Hook para validação externa (se necessário)
 * 
 * Esta função pode ser usada por outros plugins ou hooks do WordPress
 * para verificar o status da licença do plugin Binance Pix.
 * 
 * A validação principal é feita automaticamente pela classe WC_Binance_Pix_Gateway.
 */
function wc_binance_pix_check_license() {
    // Esta função está disponível para uso externo se necessário
    // A validação real é feita pela classe WC_Binance_Pix_Gateway
    return true; // Retorna true por padrão - validação real está na classe
}

/**
 * Adicionar intervalo personalizado de 5 minutos para cron
 */
function wc_binance_pix_cron_intervals( $schedules ) {
    $schedules['wc_binance_pix_5min'] = array(
        'interval' => 300, // 5 minutos em segundos
        'display'  => __( 'A cada 5 minutos', 'wc-binance-pix' ),
    );
    return $schedules;
}
add_filter( 'cron_schedules', 'wc_binance_pix_cron_intervals' );

/**
 * Ativação do plugin - agendar cron
 */
function wc_binance_pix_activate() {
    // Agendar verificação de pedidos expirados
    if ( ! wp_next_scheduled( 'wc_binance_pix_check_expired_orders' ) ) {
        wp_schedule_event( time(), 'wc_binance_pix_5min', 'wc_binance_pix_check_expired_orders' );
    }
    
    // Agendar verificação periódica de licença (diária)
    if ( ! wp_next_scheduled( 'wc_binance_pix_check_license' ) ) {
        wp_schedule_event( time(), 'daily', 'wc_binance_pix_check_license' );
    }
}
register_activation_hook( __FILE__, 'wc_binance_pix_activate' );

/**
 * Desativação do plugin - remover cron
 */
function wc_binance_pix_deactivate() {
    // Remover agendamento do cron de expiração
    $timestamp = wp_next_scheduled( 'wc_binance_pix_check_expired_orders' );
    if ( $timestamp ) {
        wp_unschedule_event( $timestamp, 'wc_binance_pix_check_expired_orders' );
    }
    
    // Remover agendamento do cron de licença
    $timestamp = wp_next_scheduled( 'wc_binance_pix_check_license' );
    if ( $timestamp ) {
        wp_unschedule_event( $timestamp, 'wc_binance_pix_check_license' );
    }
}
register_deactivation_hook( __FILE__, 'wc_binance_pix_deactivate' );
