<?php
/**
 * Fired when the plugin is uninstalled.
 *
 * @package WooCommerce_Binance_Pix
 * @since   1.0.0
 */

// Se não foi chamado pelo WordPress, sair
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

/**
 * Limpeza completa ao desinstalar o plugin
 * 
 * Remove todos os dados criados pelo plugin:
 * - Transients (cache)
 * - Cron jobs (tarefas agendadas)
 * - Opções de configuração
 * - Meta dados de pedidos (opcional)
 */
function wc_binance_pix_uninstall() {
    global $wpdb;

    // ============================================
    // 1. REMOVER TRANSIENTS (Cache)
    // ============================================
    
    // Lista de transients usados pelo plugin
    $transients = array(
        'wc_binance_pix_license_status',
        'wc_binance_pix_license_message',
        'wc_binance_pix_license_data',
    );
    
    // Remover opção de modo degradado
    delete_option( '_wc_binance_pix_license_last_valid' );

    foreach ( $transients as $transient ) {
        delete_transient( $transient );
        
        // Também remover versões com timeout (WordPress pode criar múltiplas versões)
        delete_transient( '_transient_' . $transient );
        delete_transient( '_transient_timeout_' . $transient );
    }

    // Remover todos os transients que começam com o prefixo do plugin
    // (caso haja algum que não foi listado acima)
    $wpdb->query(
        $wpdb->prepare(
            "DELETE FROM {$wpdb->options} 
            WHERE option_name LIKE %s 
            OR option_name LIKE %s",
            $wpdb->esc_like( '_transient_wc_binance_pix_' ) . '%',
            $wpdb->esc_like( '_transient_timeout_wc_binance_pix_' ) . '%'
        )
    );

    // ============================================
    // 2. REMOVER CRON JOBS (Tarefas Agendadas)
    // ============================================
    
    // Lista de hooks de cron
    $cron_hooks = array(
        'wc_binance_pix_check_expired_orders',
        'wc_binance_pix_check_license',
    );

    foreach ( $cron_hooks as $hook ) {
        // Obter todos os timestamps agendados para este hook
        $crons = _get_cron_array();
        
        if ( $crons ) {
            foreach ( $crons as $timestamp => $cron ) {
                if ( isset( $cron[ $hook ] ) ) {
                    foreach ( $cron[ $hook ] as $key => $event ) {
                        wp_unschedule_event( $timestamp, $hook, $event['args'] );
                    }
                }
            }
        }
        
        // Limpeza adicional: remover diretamente do banco
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->options} 
                WHERE option_name = %s",
                '_transient_timeout_wc_binance_pix_' . $hook
            )
        );
    }

    // Remover todos os eventos de cron relacionados ao plugin
    $wpdb->query(
        $wpdb->prepare(
            "DELETE FROM {$wpdb->options} 
            WHERE option_name = %s 
            AND option_value LIKE %s",
            '_transient_cron',
            '%wc_binance_pix%'
        )
    );

    // ============================================
    // 3. REMOVER OPÇÕES DE CONFIGURAÇÃO
    // ============================================
    
    // Remover configurações do gateway WooCommerce
    // O WooCommerce salva as configurações como: woocommerce_{gateway_id}_settings
    delete_option( 'woocommerce_binance_pix_settings' );
    
    // Remover qualquer outra opção que comece com o prefixo do plugin
    $wpdb->query(
        $wpdb->prepare(
            "DELETE FROM {$wpdb->options} 
            WHERE option_name LIKE %s",
            $wpdb->esc_like( 'wc_binance_pix_' ) . '%'
        )
    );

    // ============================================
    // 4. REMOVER META DADOS DE PEDIDOS (OPCIONAL)
    // ============================================
    
    // NOTA: Por padrão, NÃO removemos meta dados de pedidos porque:
    // - São dados históricos importantes
    // - Podem ser necessários para auditoria
    // - Pedidos já processados não devem ser alterados
    
    // Se você quiser remover os meta dados também, descomente o código abaixo:
    /*
    $meta_keys = array(
        '_binance_pix_code',
        '_binance_pix_created_at',
        '_binance_pix_timeout_minutes',
        '_binance_checkout_url',
        '_binance_webhook_data',
    );

    foreach ( $meta_keys as $meta_key ) {
        $wpdb->delete(
            $wpdb->postmeta,
            array( 'meta_key' => $meta_key ),
            array( '%s' )
        );
    }
    */

    // ============================================
    // 5. LIMPEZA ADICIONAL
    // ============================================
    
    // Limpar cache do WordPress (se houver)
    if ( function_exists( 'wp_cache_flush' ) ) {
        wp_cache_flush();
    }

    // Limpar cache do WooCommerce (se houver)
    if ( function_exists( 'wc_delete_product_transients' ) ) {
        // Não há transients de produtos, mas podemos limpar cache geral
    }

    // Remover logs do plugin (se houver sistema de logs customizado)
    // Nota: Logs do WooCommerce são mantidos, pois podem ser úteis para debug
}

// Executar limpeza
wc_binance_pix_uninstall();
