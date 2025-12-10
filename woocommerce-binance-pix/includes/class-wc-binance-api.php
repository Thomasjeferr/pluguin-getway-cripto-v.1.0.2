<?php
defined( 'ABSPATH' ) || exit;

/**
 * Helper class for Binance Pay API interaction
 */
class WC_Binance_API_Helper {

    private $api_key;
    private $secret_key;
    private $base_url = 'https://bpay.binanceapi.com';
    private $testmode = false;

    public function __construct( $api_key, $secret_key, $testmode = false ) {
        $this->api_key = $api_key;
        $this->secret_key = $secret_key;
        $this->testmode = $testmode;
        
        // Nota: Binance Pay não possui sandbox dedicado
        // A mesma URL é usada para produção e teste
        // A diferença está nas chaves API (chaves de teste vs produção)
        // Em modo de teste, certifique-se de usar chaves de teste do portal Binance Merchant
    }

    /**
     * Create Order
     */
    public function create_order( $order_data ) {
        $endpoint = '/binancepay/openapi/v2/order';
        return $this->request( 'POST', $endpoint, $order_data );
    }

    /**
     * Send Request with Automatic Retry
     * 
     * @param string $method HTTP method
     * @param string $endpoint API endpoint
     * @param array $body Request body
     * @param int $max_retries Maximum number of retry attempts (default: 3)
     * @return array|WP_Error Response data or error
     */
    private function request( $method, $endpoint, $body = array(), $max_retries = 3 ) {
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

        // Log em modo de teste para debug
        if ( $this->testmode && function_exists( 'wc_get_logger' ) ) {
            $logger = wc_get_logger();
            $logger->info( 
                '[Binance Pay API] Modo de teste ativo - Requisição: ' . $endpoint,
                array( 'source' => 'binance-pix-api' )
            );
        }

        // Tentar requisição com retry automático
        $attempt = 0;
        $last_error = null;
        
        while ( $attempt < $max_retries ) {
            $attempt++;
            
            // Calcular delay exponencial (1s, 2s, 4s)
            if ( $attempt > 1 ) {
                $delay = pow( 2, $attempt - 2 ); // 1, 2, 4 segundos
                sleep( $delay );
                
                // Log de retry
                if ( function_exists( 'wc_get_logger' ) ) {
                    $logger = wc_get_logger();
                    $logger->warning( 
                        sprintf( '[Binance Pay API] Tentativa %d de %d - Endpoint: %s', $attempt, $max_retries, $endpoint ),
                        array( 'source' => 'binance-pix-api' )
                    );
                }
            }

            $response = wp_remote_post( $this->base_url . $endpoint, array(
                'headers' => $headers,
                'body'    => $payload,
                'timeout' => 30,
                'sslverify' => true, // Sempre verificar SSL
            ) );

            // Se não for erro, processar resposta
            if ( ! is_wp_error( $response ) ) {
                $response_code = wp_remote_retrieve_response_code( $response );
                
                // Se for erro HTTP 5xx, tentar novamente
                if ( $response_code >= 500 && $response_code < 600 && $attempt < $max_retries ) {
                    $last_error = new WP_Error( 
                        'http_error', 
                        sprintf( 'Erro HTTP %d do servidor Binance. Tentando novamente...', $response_code )
                    );
                    continue;
                }
                
                // Se for sucesso ou erro 4xx (não retry), processar resposta
                $response_body = json_decode( wp_remote_retrieve_body( $response ), true );
                
                // Log resposta em modo de teste
                if ( $this->testmode && function_exists( 'wc_get_logger' ) ) {
                    $logger = wc_get_logger();
                    $status = isset( $response_body['status'] ) ? $response_body['status'] : 'unknown';
                    $logger->info( 
                        '[Binance Pay API] Resposta recebida - Status: ' . $status . ' (Tentativa: ' . $attempt . ')',
                        array( 'source' => 'binance-pix-api' )
                    );
                }

                return $response_body;
            }
            
            // Se for erro de conexão, armazenar e tentar novamente
            $last_error = $response;
            $error_code = $response->get_error_code();
            
            // Erros que devem ser retentados: timeout, conexão, DNS
            $retryable_errors = array( 'http_request_failed', 'timeout', 'connect_failed', 'ssl_connect_failed' );
            
            if ( ! in_array( $error_code, $retryable_errors, true ) ) {
                // Erro não retentável, retornar imediatamente
                if ( $this->testmode && function_exists( 'wc_get_logger' ) ) {
                    $logger = wc_get_logger();
                    $logger->error( 
                        '[Binance Pay API] Erro não retentável: ' . $response->get_error_message(),
                        array( 'source' => 'binance-pix-api' )
                    );
                }
                return $response;
            }
            
            // Log de erro retentável
            if ( function_exists( 'wc_get_logger' ) ) {
                $logger = wc_get_logger();
                $logger->warning( 
                    sprintf( 
                        '[Binance Pay API] Erro retentável (tentativa %d/%d): %s - %s', 
                        $attempt, 
                        $max_retries,
                        $error_code,
                        $response->get_error_message()
                    ),
                    array( 'source' => 'binance-pix-api' )
                );
            }
        }
        
        // Todas as tentativas falharam
        if ( function_exists( 'wc_get_logger' ) ) {
            $logger = wc_get_logger();
            $error_message = is_wp_error( $last_error ) ? $last_error->get_error_message() : 'Erro desconhecido';
            $logger->error( 
                sprintf( 
                    '[Binance Pay API] Todas as %d tentativas falharam. Último erro: %s', 
                    $max_retries,
                    $error_message
                ),
                array( 'source' => 'binance-pix-api' )
            );
        }
        
        return $last_error;
    }

    /**
     * Generate Signature (HMAC-SHA512)
     * 
     * @param string|int $timestamp Timestamp em milissegundos
     * @param string $nonce Nonce único
     * @param string $payload Payload JSON
     * @return string Assinatura HMAC-SHA512 em maiúsculas
     */
    public function generate_signature( $timestamp, $nonce, $payload ) {
        $data_to_sign = $timestamp . "\n" . $nonce . "\n" . $payload . "\n";
        return strtoupper( hash_hmac( 'sha512', $data_to_sign, $this->secret_key ) );
    }

    private function generate_nonce() {
        return substr( str_shuffle( 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' ), 0, 32 );
    }

    /**
     * Valida assinatura do webhook Binance Pay
     * 
     * @param string $timestamp Timestamp do header
     * @param string $nonce Nonce do header
     * @param string $payload Payload JSON bruto
     * @param string $received_signature Assinatura recebida no header
     * @return bool True se a assinatura for válida
     */
    public function validate_webhook_signature( $timestamp, $nonce, $payload, $received_signature ) {
        // Recalcular assinatura usando o mesmo método
        $calculated_signature = $this->generate_signature( $timestamp, $nonce, $payload );
        
        // Comparar assinaturas de forma segura (evita timing attacks)
        return hash_equals( $calculated_signature, strtoupper( $received_signature ) );
    }
}

