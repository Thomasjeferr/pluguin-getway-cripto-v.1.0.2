<?php
defined( 'ABSPATH' ) || exit;

/**
 * Helper class for Binance Pay API interaction
 */
class WC_Binance_API_Helper {

    private $api_key;
    private $secret_key;
    private $base_url = 'https://bpay.binanceapi.com'; // Use sandbox URL for testing

    public function __construct( $api_key, $secret_key, $testmode = false ) {
        $this->api_key = $api_key;
        $this->secret_key = $secret_key;
        if ( $testmode ) {
            // URL de Sandbox da Binance Pay (se disponível, verifique a doc oficial atualizada)
            // A Binance Pay usa a mesma URL base, mas as chaves mudam.
        }
    }

    /**
     * Create Order
     */
    public function create_order( $order_data ) {
        $endpoint = '/binancepay/openapi/v2/order';
        return $this->request( 'POST', $endpoint, $order_data );
    }

    /**
     * Send Request
     */
    private function request( $method, $endpoint, $body = array() ) {
        $timestamp = round( microtime( true ) * 1000 );
        $nonce     = $this->generate_nonce();
        $payload   = json_encode( $body );
        
        $signature = $this->generate_signature( $timestamp, $nonce, $payload );

        $headers = array(
            'Content-Type' => 'application/json',
            'BinancePay-Timestamp' => $timestamp,
            'BinancePay-Nonce' => $nonce,
            'BinancePay-Certificate-SN' => $this->api_key,
            'BinancePay-Signature' => $signature,
        );

        $response = wp_remote_post( $this->base_url . $endpoint, array(
            'headers' => $headers,
            'body'    => $payload,
            'timeout' => 30,
        ) );

        if ( is_wp_error( $response ) ) {
            return $response;
        }

        return json_decode( wp_remote_retrieve_body( $response ), true );
    }

    /**
     * Generate Signature (HMAC-SHA512)
     */
    private function generate_signature( $timestamp, $nonce, $payload ) {
        $data_to_sign = $timestamp . "\n" . $nonce . "\n" . $payload . "\n";
        return strtoupper( hash_hmac( 'sha512', $data_to_sign, $this->secret_key ) );
    }

    private function generate_nonce() {
        return substr( str_shuffle( 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' ), 0, 32 );
    }
}

