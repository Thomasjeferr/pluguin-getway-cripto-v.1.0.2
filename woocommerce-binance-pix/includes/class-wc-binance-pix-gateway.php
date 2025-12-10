<?php
defined( 'ABSPATH' ) || exit;

/**
 * WC_Binance_Pix_Gateway Class.
 */
class WC_Binance_Pix_Gateway extends WC_Payment_Gateway {

	/**
	 * Constructor
	 */
	public function __construct() {
		$this->id                 = 'binance_pix';
		$this->has_fields         = false; 
		$this->method_title       = __( 'Binance Pix / USDT', 'wc-binance-pix' );
		$this->method_description = __( 'Aceite pagamentos via Pix convertidos em USDT via Binance Pay.', 'wc-binance-pix' );

		// Load the settings
		$this->init_form_fields();
		$this->init_settings();

		// Define user set variables
		$this->title        = $this->get_option( 'title' );
		$this->description  = $this->get_option( 'description' );
		
		// Definir ícone do Pix (SVG inline) - deve ser definido após carregar configurações
		$this->icon = $this->get_pix_icon();
		$this->enabled      = $this->get_option( 'enabled' );
		$this->testmode     = 'yes' === $this->get_option( 'testmode' );
        $this->custom_success_url = $this->get_option( 'custom_success_url' ); // URL personalizada
        
        // Tempo de expiração do pagamento (em minutos)
        $timeout_minutes = intval( $this->get_option( 'payment_timeout' ) );
        if ( $timeout_minutes < 5 ) {
            $timeout_minutes = 15; // Padrão se menor que 5
        }
        if ( $timeout_minutes > 120 ) {
            $timeout_minutes = 120; // Máximo 120 minutos (2 horas)
        }
        $this->payment_timeout_minutes = $timeout_minutes;
        
        // License Keys
        $this->license_server_url = $this->get_option( 'license_server_url' ) ?: 'http://localhost:3000';
        $this->license_email = $this->get_option( 'license_email' );
        $this->license_key   = $this->get_option( 'license_key' );

        // Binance Keys
		$this->binance_api_key    = $this->get_option( 'binance_api_key' );
		$this->binance_secret_key = $this->get_option( 'binance_secret_key' );

		// Actions
		add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, array( $this, 'process_admin_options' ) );
        add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, array( $this, 'validate_license_on_save' ) );
        
        // Webhook listener
		add_action( 'woocommerce_api_wc_binance_pix_gateway', array( $this, 'webhook' ) );

        // Enqueue Scripts para o Modal
        add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_payment_scripts' ) );

        // Endpoint para verificação de status (Polling)
        add_action( 'woocommerce_api_wc_binance_check_status', array( $this, 'check_order_status' ) );
        
        // Endpoint para obter código Pix (se necessário decodificar QR Code)
        add_action( 'woocommerce_api_wc_binance_get_pix_code', array( $this, 'get_pix_code' ) );
        
        // Agendar verificação de pedidos expirados (se não estiver agendado)
        if ( ! wp_next_scheduled( 'wc_binance_pix_check_expired_orders' ) ) {
            wp_schedule_event( time(), 'wc_binance_pix_5min', 'wc_binance_pix_check_expired_orders' );
        }
        
        // Hook para executar a verificação
        add_action( 'wc_binance_pix_check_expired_orders', array( $this, 'check_and_expire_orders' ) );
        
        // Agendar verificação periódica de licença (diária)
        if ( ! wp_next_scheduled( 'wc_binance_pix_check_license' ) ) {
            wp_schedule_event( time(), 'daily', 'wc_binance_pix_check_license' );
        }
        
        // Hook para verificação periódica de licença
        add_action( 'wc_binance_pix_check_license', array( $this, 'validate_license_periodic' ) );
	}

    /**
     * Retorna o ícone SVG do Pix
     * Ícone oficial do Pix (Bacen) em formato SVG
     */
    private function get_pix_icon() {
        // SVG do ícone Pix - estilo oficial brasileiro
        $svg_content = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="50" height="50">
            <defs>
                <linearGradient id="pixGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#32BCAD;stop-opacity:1" />
                    <stop offset="50%" style="stop-color:#2a9d8f;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#21867a;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Fundo arredondado -->
            <rect width="200" height="200" rx="25" fill="url(#pixGradient)"/>
            <!-- Símbolo Pix (4 losangos) -->
            <g fill="white" opacity="0.95">
                <path d="M80 60 L120 60 L100 80 Z"/>
                <path d="M120 60 L140 80 L100 80 Z"/>
                <path d="M100 80 L140 80 L120 100 Z"/>
                <path d="M100 80 L120 100 L80 100 Z"/>
            </g>
            <!-- Círculo central -->
            <circle cx="100" cy="100" r="25" fill="white" opacity="0.9"/>
            <!-- Losango interno -->
            <path d="M90 100 L100 90 L110 100 L100 110 Z" fill="#32BCAD"/>
        </svg>';
        
        // Codificar para data URI (URL encode para evitar problemas)
        $encoded = base64_encode($svg_content);
        return 'data:image/svg+xml;base64,' . $encoded;
    }

    public function enqueue_payment_scripts() {
        if ( is_checkout() ) {
            wp_enqueue_script( 'wc-binance-modal', WC_BINANCE_PIX_URL . 'assets/js/checkout.js', array( 'jquery' ), '1.0', true );
            wp_enqueue_style( 'wc-binance-modal-css', WC_BINANCE_PIX_URL . 'assets/css/checkout.css' );
            
            // Gerar nonce para segurança dos endpoints AJAX
            $nonce = wp_create_nonce( 'wc_binance_pix_nonce' );
            
            wp_localize_script( 'wc-binance-modal', 'wc_binance_params', array(
                'check_status_url' => WC()->api_request_url( 'wc_binance_check_status' ),
                'get_pix_code_url' => WC()->api_request_url( 'wc_binance_get_pix_code' ),
                'custom_success_url' => $this->custom_success_url,
                'payment_timeout_minutes' => $this->payment_timeout_minutes,
                'testmode' => $this->testmode,
                'nonce' => $nonce // Nonce para validação de segurança
            ));
        }
    }

	/**
	 * Initialize Gateway Settings Form Fields
	 */
	public function init_form_fields() {
		$this->form_fields = array(
			'enabled' => array(
				'title'   => __( 'Ativar/Desativar', 'wc-binance-pix' ),
				'type'    => 'checkbox',
				'label'   => __( 'Ativar pagamento via Binance Pix', 'wc-binance-pix' ),
				'default' => 'yes',
			),
			'title' => array(
				'title'       => __( 'Título do Método de Pagamento', 'wc-binance-pix' ),
				'type'        => 'text',
				'description' => __( 'Este é o título que aparecerá no checkout para o cliente.', 'wc-binance-pix' ),
				'default'     => __( 'Pix / Binance Pay', 'wc-binance-pix' ),
				'desc_tip'    => true,
			),
			'description' => array(
				'title'       => __( 'Descrição do Método de Pagamento', 'wc-binance-pix' ),
				'type'        => 'textarea',
				'description' => __( 'Esta é a descrição que aparecerá no checkout para o cliente.', 'wc-binance-pix' ),
				'default'     => __( 'Pague com Pix e receba em USDT na sua carteira Binance.', 'wc-binance-pix' ),
				'desc_tip'    => true,
			),
            'custom_success_url' => array(
				'title'       => __( 'URL de Sucesso Personalizada', 'wc-binance-pix' ),
				'type'        => 'text',
				'description' => __( 'Para onde o cliente vai após o pagamento ser confirmado? Deixe em branco para usar a padrão do WooCommerce.', 'wc-binance-pix' ),
				'placeholder' => 'https://seusite.com/obrigado',
			),
            'payment_timeout' => array(
				'title'       => __( 'Tempo de Expiração do Pagamento (minutos)', 'wc-binance-pix' ),
				'type'        => 'number',
				'description' => __( 'Tempo máximo que o cliente tem para realizar o pagamento. Mínimo: 5 minutos. Padrão: 15 minutos.', 'wc-binance-pix' ),
				'default'     => '15',
				'custom_attributes' => array(
					'min' => '5',
					'step' => '1'
				),
			),
			'testmode' => array(
				'title'       => __( 'Modo de Teste', 'wc-binance-pix' ),
				'type'        => 'checkbox',
				'label'       => __( 'Ativar modo de teste', 'wc-binance-pix' ),
				'description' => __( '⚠️ IMPORTANTE: Binance Pay não possui sandbox dedicado. Use chaves de TESTE do portal Binance Merchant. A URL da API permanece a mesma, apenas as chaves mudam. Certifique-se de usar chaves de teste para não processar pagamentos reais.', 'wc-binance-pix' ),
				'default'     => 'yes',
				'desc_tip'    => false,
			),
            'section_license' => array(
				'title'       => __( 'Licença do Plugin', 'wc-binance-pix' ),
				'type'        => 'title',
                'description' => $this->get_license_status_display() . '<br>' . 
                                __( 'Insira suas credenciais para ativar o plugin. A licença será validada automaticamente ao salvar.', 'wc-binance-pix' ),
			),
            'license_server_url' => array(
				'title'       => __( 'URL do Servidor de Licença', 'wc-binance-pix' ),
				'type'        => 'text',
				'description' => __( 'URL base do servidor SaaS de licenças (ex: https://seusite.com ou http://localhost:3000).', 'wc-binance-pix' ),
				'default'     => 'http://localhost:3000',
				'placeholder' => 'https://seusite.com',
				'desc_tip'    => true,
			),
            'license_email' => array(
				'title'       => __( 'Email de Licença', 'wc-binance-pix' ),
				'type'        => 'email',
				'description' => __( 'Email usado para comprar a licença.', 'wc-binance-pix' ),
				'desc_tip'    => true,
			),
            'license_key' => array(
				'title'       => __( 'Chave de Ativação', 'wc-binance-pix' ),
				'type'        => 'password',
				'description' => __( 'Chave de licença recebida por email após a compra.', 'wc-binance-pix' ),
				'desc_tip'    => true,
			),
             'section_api' => array(
				'title'       => __( 'Credenciais Binance Pay', 'wc-binance-pix' ),
				'type'        => 'title',
                'description' => $this->get_testmode_warning() . '<br>' . 
                                __( 'Obtenha essas chaves no portal Binance Merchant. <a href="https://merchant.binance.com/en/dashboard/developers" target="_blank">Clique aqui para acessar.</a>', 'wc-binance-pix' ),
			),
            'binance_api_key' => array(
				'title'       => __( 'Binance API Key', 'wc-binance-pix' ),
				'type'        => 'text',
			),
            'binance_secret_key' => array(
				'title'       => __( 'Binance Secret Key', 'wc-binance-pix' ),
				'type'        => 'password',
			),
		);
	}

    /**
     * Validate payment timeout field
     */
    public function validate_payment_timeout_field( $key, $value ) {
        $value = intval( $value );
        if ( $value < 5 ) {
            WC_Admin_Settings::add_error( __( 'O tempo de expiração do pagamento deve ser no mínimo 5 minutos.', 'wc-binance-pix' ) );
            return 15; // Retornar valor padrão
        }
        return $value;
    }

    public function validate_license_on_save() {
        $this->init_settings();
        $email = $this->settings['license_email'] ?? '';
        $key   = $this->settings['license_key'] ?? '';
        $server_url = $this->settings['license_server_url'] ?? 'http://localhost:3000';

        // Se campos vazios, limpar status
        if ( empty( $email ) || empty( $key ) ) {
            delete_transient( 'wc_binance_pix_license_status' );
            delete_transient( 'wc_binance_pix_license_message' );
            return;
        }

        // Validar licença
        $result = $this->validate_license( $email, $key, $server_url );
        
        // Mostrar mensagem de feedback
        if ( $result['valid'] ) {
            WC_Admin_Settings::add_message( __( '✅ Licença validada com sucesso!', 'wc-binance-pix' ) );
        } else {
            WC_Admin_Settings::add_error( 
                __( '❌ Erro na validação da licença: ', 'wc-binance-pix' ) . $result['message'] 
            );
        }
    }

    /**
     * Valida licença com o servidor SaaS
     * 
     * @param string $email Email da licença
     * @param string $key Chave da licença
     * @param string $server_url URL do servidor
     * @return array Resultado da validação
     */
    private function validate_license( $email, $key, $server_url = null ) {
        if ( empty( $server_url ) ) {
            $server_url = $this->license_server_url ?: 'http://localhost:3000';
        }

        // Limpar URL (remover barra final se houver)
        $server_url = rtrim( $server_url, '/' );
        $api_url = $server_url . '/api/validate';

        // Obter domínio atual
        $domain = isset( $_SERVER['HTTP_HOST'] ) ? $_SERVER['HTTP_HOST'] : 'unknown';
        
        // Remover porta se presente (para validação)
        $domain = preg_replace( '/:\d+$/', '', $domain );
        
        // Identificador do produto (para suporte a múltiplos plugins)
        $product_slug = 'binance-pix'; // Identificador deste plugin

        // Tentar validação com retry automático
        $max_retries = 3;
        $attempt = 0;
        $last_error = null;
        $response = null;
        
        while ( $attempt < $max_retries ) {
            $attempt++;
            
            // Delay exponencial para retries (1s, 2s)
            if ( $attempt > 1 ) {
                $delay = pow( 2, $attempt - 2 );
                sleep( $delay );
                
                if ( function_exists( 'wc_get_logger' ) ) {
                    $logger = wc_get_logger();
                    $logger->warning( 
                        sprintf( '[Binance Pix] Tentativa %d de %d para validar licença', $attempt, $max_retries ),
                        array( 'source' => 'binance-pix-license' )
                    );
                }
            }
            
            $response = wp_remote_post( $api_url, array(
                'body'    => json_encode( array( 
                    'email' => $email, 
                    'license_key' => $key, 
                    'domain' => $domain,
                    'product' => $product_slug,
                    'plugin_slug' => $product_slug // Alias para compatibilidade
                ) ),
                'headers' => array( 'Content-Type' => 'application/json' ),
                'timeout' => 15,
                'sslverify' => strpos( $server_url, 'https' ) === 0, // Verificar SSL apenas para HTTPS
            ) );
            
            // Se não for erro, processar resposta
            if ( ! is_wp_error( $response ) ) {
                // Desativar modo degradado se conexão foi bem-sucedida
                delete_transient( 'wc_binance_pix_offline_mode' );
                
                // Processar resposta normalmente
                break;
            }
            
            // Erro de conexão - verificar se é retentável
            $error_code = $response->get_error_code();
            $retryable_errors = array( 'http_request_failed', 'timeout', 'connect_failed', 'ssl_connect_failed' );
            
            if ( ! in_array( $error_code, $retryable_errors, true ) ) {
                // Erro não retentável, retornar imediatamente
                break;
            }
            
            $last_error = $response;
        }
        
        // Se todas as tentativas falharam, verificar modo degradado
        if ( is_wp_error( $response ) && $attempt >= $max_retries ) {
            // Verificar se temos cache válido para modo degradado
            $cached_status = get_transient( 'wc_binance_pix_license_status' );
            $cache_time = get_transient( '_transient_timeout_wc_binance_pix_license_status' );
            
            if ( $cached_status === 'valid' && $cache_time && $cache_time > time() - ( 24 * HOUR_IN_SECONDS ) ) {
                // Ativar modo degradado por 1 hora
                set_transient( 'wc_binance_pix_offline_mode', 'active', HOUR_IN_SECONDS );
                
                if ( function_exists( 'wc_get_logger' ) ) {
                    $logger = wc_get_logger();
                    $logger->warning( 
                        '[Binance Pix] Servidor de licenças offline - Modo degradado ativado. Usando cache válido.',
                        array( 'source' => 'binance-pix-license' )
                    );
                }
                
                return array(
                    'valid' => true,
                    'message' => __( 'Licença válida (modo offline - servidor temporariamente indisponível).', 'wc-binance-pix' )
                );
            }
            
            // Sem cache válido, retornar erro
            if ( function_exists( 'wc_get_logger' ) ) {
                $logger = wc_get_logger();
                $error_message = is_wp_error( $last_error ) ? $last_error->get_error_message() : 'Erro desconhecido';
                $logger->error( 
                    sprintf( 
                        '[Binance Pix] Falha ao validar licença após %d tentativas: %s', 
                        $max_retries,
                        $error_message
                    ),
                    array( 'source' => 'binance-pix-license' )
                );
            }
            
            delete_transient( 'wc_binance_pix_license_status' );
            $error_message = is_wp_error( $last_error ) ? $last_error->get_error_message() : __( 'Erro desconhecido', 'wc-binance-pix' );
            set_transient( 'wc_binance_pix_license_message', $error_message, 1 * HOUR_IN_SECONDS );
            
            return array(
                'valid' => false,
                'message' => __( 'Não foi possível conectar ao servidor de licenças. Verifique sua conexão com a internet.', 'wc-binance-pix' )
            );
        }

        // Processar resposta bem-sucedida
        $response_code = wp_remote_retrieve_response_code( $response );
        $body = json_decode( wp_remote_retrieve_body( $response ), true );

        if ( $response_code !== 200 ) {
            delete_transient( 'wc_binance_pix_license_status' );
            $error_msg = isset( $body['message'] ) ? $body['message'] : __( 'Erro HTTP: ', 'wc-binance-pix' ) . $response_code;
            set_transient( 'wc_binance_pix_license_message', $error_msg, 1 * HOUR_IN_SECONDS );
            
            return array(
                'valid' => false,
                'message' => $error_msg
            );
        }

        if ( isset( $body['success'] ) && $body['success'] === true ) {
            // Licença válida
            // Reduzir cache para 2 horas (ao invés de 24h) para melhor sincronização
            set_transient( 'wc_binance_pix_license_status', 'valid', 2 * HOUR_IN_SECONDS );
            delete_transient( 'wc_binance_pix_license_message' );
            
            // Salvar timestamp da última validação bem-sucedida (para modo degradado)
            update_option( '_wc_binance_pix_license_last_valid', time() );
            
            // Salvar informações adicionais se disponíveis
            if ( isset( $body['data'] ) ) {
                set_transient( 'wc_binance_pix_license_data', $body['data'], 2 * HOUR_IN_SECONDS );
                
                // Log de informações da licença (modo debug)
                if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                    if ( function_exists( 'wc_get_logger' ) ) {
                        $logger = wc_get_logger();
                        $logger->debug( 
                            '[Binance Pix] Licença validada - Plano: ' . ( $body['data']['plan'] ?? 'N/A' ) . 
                            ', Expira em: ' . ( isset( $body['data']['planExpiresAt'] ) ? date( 'd/m/Y', strtotime( $body['data']['planExpiresAt'] ) ) : 
                                ( isset( $body['data']['trialExpiresAt'] ) ? date( 'd/m/Y', strtotime( $body['data']['trialExpiresAt'] ) ) : 'N/A' ) ),
                            array( 'source' => 'binance-pix-license' )
                        );
                    }
                }
            }
            
            return array(
                'valid' => true,
                'message' => __( 'Licença válida e ativa.', 'wc-binance-pix' )
            );
        } else {
            // Licença inválida ou expirada
            delete_transient( 'wc_binance_pix_license_status' );
            $error_msg = isset( $body['message'] ) ? $body['message'] : __( 'Licença inválida ou expirada.', 'wc-binance-pix' );
            set_transient( 'wc_binance_pix_license_message', $error_msg, 1 * HOUR_IN_SECONDS );
            
            // Log de erro (modo debug)
            if ( function_exists( 'wc_get_logger' ) ) {
                $logger = wc_get_logger();
                $logger->warning( 
                    '[Binance Pix] Validação de licença falhou: ' . $error_msg,
                    array( 'source' => 'binance-pix-license' )
                );
            }
            
            return array(
                'valid' => false,
                'message' => $error_msg
            );
        }
    }

    /**
     * Validação periódica de licença (executada diariamente)
     */
    public function validate_license_periodic() {
        $email = $this->license_email;
        $key = $this->license_key;
        $server_url = $this->license_server_url;

        if ( empty( $email ) || empty( $key ) ) {
            delete_transient( 'wc_binance_pix_license_status' );
            
            if ( function_exists( 'wc_get_logger' ) ) {
                $logger = wc_get_logger();
                $logger->warning( 
                    '[Binance Pix] Validação periódica ignorada: Email ou chave de licença não configurados.',
                    array( 'source' => 'binance-pix-license' )
                );
            }
            return;
        }

        // Log início da validação
        if ( function_exists( 'wc_get_logger' ) ) {
            $logger = wc_get_logger();
            $logger->info( 
                sprintf( 
                    '[Binance Pix] Iniciando validação periódica de licença - Email: %s, Servidor: %s',
                    $email,
                    $server_url
                ),
                array( 'source' => 'binance-pix-license' )
            );
        }
        
        $start_time = microtime( true );
        $result = $this->validate_license( $email, $key, $server_url );
        $duration = round( ( microtime( true ) - $start_time ) * 1000, 2 ); // em milissegundos
        
        // Log do resultado com métricas
        if ( function_exists( 'wc_get_logger' ) ) {
            $logger = wc_get_logger();
            if ( $result['valid'] ) {
                $logger->info( 
                    sprintf(
                        '[Binance Pix] Licença validada com sucesso na verificação periódica (tempo: %sms).',
                        $duration
                    ),
                    array( 
                        'source' => 'binance-pix-license',
                        'duration_ms' => $duration,
                        'email' => $email
                    )
                );
            } else {
                $logger->warning( 
                    sprintf(
                        '[Binance Pix] Falha na validação periódica da licença (tempo: %sms): %s',
                        $duration,
                        $result['message']
                    ),
                    array( 
                        'source' => 'binance-pix-license',
                        'duration_ms' => $duration,
                        'email' => $email,
                        'error' => $result['message']
                    )
                );
            }
        }
    }

	public function process_payment( $order_id ) {
		$order = wc_get_order( $order_id );

        if ( ! $this->is_license_active() ) {
             wc_add_notice( 'Erro: O sistema de pagamento não está licenciado.', 'error' );
             return;
        }

        $binance_api = new WC_Binance_API_Helper( $this->binance_api_key, $this->binance_secret_key, $this->testmode );

        $order_data = array(
            'merchantTradeNo' => (string) $order->get_id(),
            'orderAmount'     => number_format( $order->get_total(), 2, '.', '' ),
            'currency'        => $order->get_currency(),
            'goods'           => array(
                'goodsType' => '02', 
                'goodsCategory' => 'D000',
                'referenceGoodsId' => (string) $order->get_id(),
                'goodsName' => 'Pedido #' . $order->get_id()
            ),
            'returnUrl' => $this->custom_success_url ?: $this->get_return_url( $order ), // Usar URL custom se existir
            'cancelUrl' => $order->get_cancel_order_url(),
            'webhookUrl' => WC()->api_request_url( 'wc_binance_pix_gateway' )
        );

        $response = $binance_api->create_order( $order_data );

        if ( is_wp_error( $response ) ) {
            // Retornar erro estruturado para o JavaScript
            return array(
                'result' => 'error',
                'binance_error' => true,
                'error_title' => __( 'Erro ao Processar Pagamento', 'wc-binance-pix' ),
                'error_message' => __( 'Não foi possível conectar com o serviço de pagamento.', 'wc-binance-pix' ),
                'error_details' => $response->get_error_message()
            );
        }

        // Verificar se a resposta tem erro
        if ( isset( $response['status'] ) && $response['status'] !== 'SUCCESS' ) {
            $error_code = isset( $response['code'] ) ? $response['code'] : 'UNKNOWN';
            $error_msg = isset( $response['errorMessage'] ) ? $response['errorMessage'] : __( 'Erro desconhecido na API Binance.', 'wc-binance-pix' );
            
            return array(
                'result' => 'error',
                'binance_error' => true,
                'error_title' => __( 'Erro na API Binance', 'wc-binance-pix' ),
                'error_message' => $error_msg,
                'error_details' => __( 'Código de erro: ', 'wc-binance-pix' ) . $error_code
            );
        }

        if ( isset( $response['status'] ) && $response['status'] === 'SUCCESS' ) {
            
            // Sucesso! Retornar dados para o JS abrir o Modal
            
            $order->update_status( 'on-hold', __( 'Aguardando pagamento Binance Pix.', 'wc-binance-pix' ) );
            $order->reduce_order_stock();
            WC()->cart->empty_cart();

            // Verificar se temos link de QRCode ou apenas checkoutUrl
            $qr_code = isset($response['data']['qrcodeLink']) ? $response['data']['qrcodeLink'] : null;
            $checkout_url = isset($response['data']['checkoutUrl']) ? $response['data']['checkoutUrl'] : null;
            
            // Salvar dados no pedido para uso posterior
            if ($checkout_url) {
                $order->update_meta_data('_binance_checkout_url', $checkout_url);
            }
            
            /**
             * Capturar código Pix em diferentes formatos
             * A Binance pode retornar:
             * - prepayId
             * - pixCode
             * - qrCode (string do código, não URL)
             * - qrContent / qrCodeText / code (variações comuns)
             */
            $pix_code = null;

            $candidate_fields = array(
                'pixCode',
                'prepayId',
                'qrContent',
                'qrCodeText',
                'code',
                'qrCode', // pode ser string ou URL
            );

            foreach ( $candidate_fields as $field ) {
                if ( isset( $response['data'][ $field ] ) && is_string( $response['data'][ $field ] ) ) {
                    $value = $response['data'][ $field ];

                    // Se não começa com http, consideramos que é o payload do Pix
                    if ( strpos( $value, 'http' ) !== 0 ) {
                        $pix_code = $value;
                        break;
                    }
                }
            }

            // Salvar código Pix nos metadados do pedido
            if ( $pix_code ) {
                $order->update_meta_data( '_binance_pix_code', $pix_code );
            }
            
            // Salvar timestamp de criação e tempo de expiração para verificação automática
            $order->update_meta_data( '_binance_pix_created_at', time() );
            $order->update_meta_data( '_binance_pix_timeout_minutes', $this->payment_timeout_minutes );
            
            $order->save();

            // Retornar JSON especial que nosso JS vai interceptar
            return array(
                'result' => 'success',
                'binance_modal' => true, // Flag para nosso JS
                'qr_code' => $qr_code,
                'checkout_url' => $checkout_url,
                'pix_code' => $pix_code, // Código Pix para copiar
                'order_id' => $order->get_id()
            );

        } else {
            // Resposta inválida ou sem status
            return array(
                'result' => 'error',
                'binance_error' => true,
                'error_title' => __( 'Resposta Inválida', 'wc-binance-pix' ),
                'error_message' => __( 'A resposta do serviço de pagamento não foi reconhecida.', 'wc-binance-pix' ),
                'error_details' => __( 'Por favor, tente novamente ou entre em contato com o suporte.', 'wc-binance-pix' )
            );
        }
	}
    
    // Polling Endpoint
    public function check_order_status() {
        // Validar nonce para proteção CSRF
        $nonce = isset($_GET['nonce']) ? sanitize_text_field($_GET['nonce']) : '';
        if (!wp_verify_nonce($nonce, 'wc_binance_pix_nonce')) {
            wp_send_json_error(['message' => 'Requisição inválida. Por favor, recarregue a página e tente novamente.']);
            return;
        }
        
        $order_id = isset($_GET['order_id']) ? intval($_GET['order_id']) : 0;
        if (!$order_id) {
            wp_send_json_error(['message' => 'Order ID não fornecido']);
            return;
        }

        $order = wc_get_order($order_id);
        
        if (!$order) {
            wp_send_json_error(['message' => 'Pedido não encontrado']);
            return;
        }
        
        // Verificação adicional de segurança: validar que o pedido pertence ao usuário atual ou é um pedido público
        // Para pedidos públicos (guest checkout), permitir acesso apenas se o pedido estiver em status pendente/on-hold
        if (is_user_logged_in()) {
            // Se estiver logado, verificar se é o dono do pedido ou admin
            $order_user_id = $order->get_user_id();
            $current_user_id = get_current_user_id();
            if ($order_user_id && $order_user_id !== $current_user_id && !current_user_can('manage_woocommerce')) {
                wp_send_json_error(['message' => 'Acesso negado.']);
                return;
            }
        } else {
            // Para usuários não logados (guest checkout), permitir acesso apenas se:
            // 1. O pedido não tem usuário associado (é realmente um pedido guest)
            // 2. OU o pedido está em status pendente/on-hold (ainda não foi finalizado)
            $order_user_id = $order->get_user_id();
            $order_status = $order->get_status();
            
            if ($order_user_id) {
                // Se o pedido tem usuário associado, negar acesso para usuários não logados
                wp_send_json_error(['message' => 'Acesso negado. Faça login para acessar este pedido.']);
                return;
            }
            
            // Permitir acesso apenas se o pedido estiver pendente ou on-hold
            if (!in_array($order_status, array('pending', 'on-hold'))) {
                wp_send_json_error(['message' => 'Acesso negado.']);
                return;
            }
        }

        // Verificar status do pedido
        $status = $order->get_status();
        
        if ($order->is_paid() || in_array($status, array('processing', 'completed'))) {
            wp_send_json_success(['paid' => true, 'status' => $status]);
            return;
        }
        
        // Verificar se foi cancelado ou falhou
        if (in_array($status, array('cancelled', 'failed', 'refunded'))) {
            $status_messages = array(
                'cancelled' => 'O pagamento foi cancelado.',
                'failed' => 'O pagamento falhou.',
                'refunded' => 'O pagamento foi reembolsado.'
            );
            
            wp_send_json_success([
                'paid' => false,
                'status' => $status,
                'message' => isset($status_messages[$status]) ? $status_messages[$status] : 'O pagamento não foi confirmado.'
            ]);
            return;
        }
        
        // Ainda aguardando pagamento
        wp_send_json_success(['paid' => false, 'status' => $status]);
    }

    // Endpoint para obter código Pix (decodificar QR Code se necessário)
    public function get_pix_code() {
        // Validar nonce para proteção CSRF
        $nonce = isset($_GET['nonce']) ? sanitize_text_field($_GET['nonce']) : '';
        if (!wp_verify_nonce($nonce, 'wc_binance_pix_nonce')) {
            wp_send_json_error(['message' => 'Requisição inválida. Por favor, recarregue a página e tente novamente.']);
            return;
        }
        
        $order_id = isset($_GET['order_id']) ? intval($_GET['order_id']) : 0;
        if (!$order_id) {
            wp_send_json_error(['message' => 'Order ID não fornecido']);
            return;
        }

        $order = wc_get_order($order_id);
        if (!$order) {
            wp_send_json_error(['message' => 'Pedido não encontrado']);
            return;
        }
        
        // Verificação adicional de segurança: validar que o pedido pertence ao usuário atual ou é um pedido público
        // Para pedidos públicos (guest checkout), permitir acesso apenas se o pedido estiver em status pendente/on-hold
        if (is_user_logged_in()) {
            // Se estiver logado, verificar se é o dono do pedido ou admin
            $order_user_id = $order->get_user_id();
            $current_user_id = get_current_user_id();
            if ($order_user_id && $order_user_id !== $current_user_id && !current_user_can('manage_woocommerce')) {
                wp_send_json_error(['message' => 'Acesso negado.']);
                return;
            }
        } else {
            // Para usuários não logados (guest checkout), permitir acesso apenas se:
            // 1. O pedido não tem usuário associado (é realmente um pedido guest)
            // 2. OU o pedido está em status pendente/on-hold (ainda não foi finalizado)
            $order_user_id = $order->get_user_id();
            $order_status = $order->get_status();
            
            if ($order_user_id) {
                // Se o pedido tem usuário associado, negar acesso para usuários não logados
                wp_send_json_error(['message' => 'Acesso negado. Faça login para acessar este pedido.']);
                return;
            }
            
            // Permitir acesso apenas se o pedido estiver pendente ou on-hold
            if (!in_array($order_status, array('pending', 'on-hold'))) {
                wp_send_json_error(['message' => 'Acesso negado.']);
                return;
            }
        }

        // Tentar obter código Pix dos metadados do pedido
        $pix_code = $order->get_meta('_binance_pix_code');
        
        if ($pix_code) {
            wp_send_json_success(['pix_code' => $pix_code]);
            return;
        }

        // Se não tiver, retornar checkout_url como fallback
        $checkout_url = $order->get_meta('_binance_checkout_url');
        if ($checkout_url) {
            wp_send_json_success(['pix_code' => $checkout_url, 'is_url' => true]);
            return;
        }

        wp_send_json_error(['message' => 'Código Pix não disponível']);
    }

    /**
     * Verifica se a licença está ativa
     * 
     * @return bool True se a licença estiver válida
     */
    private function is_license_active() {
        // Verificar cache primeiro
        $status = get_transient( 'wc_binance_pix_license_status' );
        
        if ( $status === 'valid' ) {
            return true;
        }
        
        // Modo degradado: se servidor estiver offline e tiver cache válido recente, permitir uso
        $offline_mode = get_transient( 'wc_binance_pix_offline_mode' );
        if ( $offline_mode === 'active' ) {
            // Verificar se cache ainda é recente (últimas 24 horas)
            $cache_time = get_transient( '_transient_timeout_wc_binance_pix_license_status' );
            if ( $cache_time && $cache_time > time() - ( 24 * HOUR_IN_SECONDS ) ) {
                if ( function_exists( 'wc_get_logger' ) ) {
                    $logger = wc_get_logger();
                    $logger->info( 
                        '[Binance Pix] Modo degradado ativo - usando cache de licença válida',
                        array( 'source' => 'binance-pix-license' )
                    );
                }
                return true;
            }
        }
        
        // Se não houver status, tentar validar uma vez
        if ( $status === false && ! empty( $this->license_email ) && ! empty( $this->license_key ) ) {
            $result = $this->validate_license( $this->license_email, $this->license_key, $this->license_server_url );
            return $result['valid'];
        }
        
        return $status === 'valid';
    }

    /**
     * Obtém mensagem de status da licença para exibição no admin
     * 
     * @return string HTML com status da licença
     */
    private function get_license_status_display() {
        $status = get_transient( 'wc_binance_pix_license_status' );
        
        if ( $status === 'valid' ) {
            return '<span style="color: #28a745; font-weight: bold;">✅ ' . __( 'Licença ativa e válida', 'wc-binance-pix' ) . '</span>';
        }
        
        $message = get_transient( 'wc_binance_pix_license_message' );
        if ( $message ) {
            return '<span style="color: #dc3545; font-weight: bold;">❌ ' . esc_html( $message ) . '</span>';
        }
        
        return '<span style="color: #ffc107; font-weight: bold;">⚠️ ' . __( 'Licença não validada. Configure suas credenciais.', 'wc-binance-pix' ) . '</span>';
    }

    /**
     * Obtém mensagem de status da licença
     * 
     * @return string Mensagem de status
     */
    public function get_license_status_message() {
        if ( $this->is_license_active() ) {
            return __( '✅ Licença ativa e válida', 'wc-binance-pix' );
        }
        
        $message = get_transient( 'wc_binance_pix_license_message' );
        if ( $message ) {
            return __( '❌ ', 'wc-binance-pix' ) . $message;
        }
        
        return __( '⚠️ Licença não validada. Configure suas credenciais.', 'wc-binance-pix' );
    }

    /**
     * Obtém aviso sobre modo de teste
     * 
     * @return string HTML com aviso
     */
    private function get_testmode_warning() {
        if ( $this->testmode ) {
            return '<div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 10px 0; border-radius: 4px;">
                        <strong>⚠️ MODO DE TESTE ATIVO</strong><br>
                        <small>' . __( 'Certifique-se de estar usando chaves de TESTE do Binance Merchant. Pagamentos serão processados com valores de teste.', 'wc-binance-pix' ) . '</small>
                    </div>';
        }
        return '<div style="background: #d1ecf1; border-left: 4px solid #0c5460; padding: 10px; margin: 10px 0; border-radius: 4px;">
                    <strong>ℹ️ MODO DE PRODUÇÃO</strong><br>
                    <small>' . __( 'Usando chaves de produção. Todos os pagamentos serão reais.', 'wc-binance-pix' ) . '</small>
                </div>';
    }

    public function webhook() {
        // Ler payload bruto (importante: não usar json_decode ainda)
        $payload = file_get_contents('php://input');
        
        // Se não houver payload, retornar 200 para não expor erro
        if ( empty( $payload ) ) {
            header( 'HTTP/1.1 200 OK' );
            exit;
        }

        // Obter headers do webhook
        $headers = $this->get_webhook_headers();
        
        // Validar que todos os headers necessários estão presentes
        $required_headers = array( 'BinancePay-Timestamp', 'BinancePay-Nonce', 'BinancePay-Signature', 'BinancePay-Certificate-SN' );
        foreach ( $required_headers as $header_name ) {
            if ( empty( $headers[ $header_name ] ) ) {
                // Log erro (sem expor informações sensíveis)
                $this->log_webhook_error( 'Header obrigatório ausente: ' . $header_name );
                header( 'HTTP/1.1 200 OK' ); // Retornar 200 para não expor falha
                exit;
            }
        }

        // Validar que o Certificate-SN corresponde à nossa API Key
        if ( $headers['BinancePay-Certificate-SN'] !== $this->binance_api_key ) {
            $this->log_webhook_error( 'Certificate-SN não corresponde à API Key configurada' );
            header( 'HTTP/1.1 200 OK' );
            exit;
        }

        // Validar assinatura usando a classe helper
        $binance_api = new WC_Binance_API_Helper( $this->binance_api_key, $this->binance_secret_key, $this->testmode );
        
        $is_valid = $binance_api->validate_webhook_signature(
            $headers['BinancePay-Timestamp'],
            $headers['BinancePay-Nonce'],
            $payload,
            $headers['BinancePay-Signature']
        );

        if ( ! $is_valid ) {
            // Assinatura inválida - possível tentativa de fraude
            $this->log_webhook_error( 'Assinatura do webhook inválida - possível tentativa de fraude' );
            header( 'HTTP/1.1 200 OK' ); // Retornar 200 para não expor falha
            exit;
        }

        // Assinatura válida! Processar webhook
        $data = json_decode( $payload, true );
        
        // Validar que o JSON foi decodificado corretamente
        if ( json_last_error() !== JSON_ERROR_NONE ) {
            $this->log_webhook_error( 'Erro ao decodificar JSON do webhook: ' . json_last_error_msg() );
            header( 'HTTP/1.1 200 OK' );
            exit;
        }

        // Processar apenas eventos de pagamento
        if ( isset( $data['bizType'] ) && $data['bizType'] === 'PAY' && isset( $data['bizStatus'] ) ) {
            $merchant_trade_no = isset( $data['merchantTradeNo'] ) ? $data['merchantTradeNo'] : '';
            
            if ( empty( $merchant_trade_no ) ) {
                $this->log_webhook_error( 'merchantTradeNo não encontrado no payload' );
                header( 'HTTP/1.1 200 OK' );
                exit;
            }

            $order = wc_get_order( $merchant_trade_no );

            if ( ! $order ) {
                $this->log_webhook_error( 'Pedido não encontrado: ' . $merchant_trade_no );
                header( 'HTTP/1.1 200 OK' );
                exit;
            }

            $status = $data['bizStatus'];

            // Processar diferentes status de pagamento
            if ( $status === 'PAY_SUCCESS' ) {
                // Pagamento confirmado
                if ( ! $order->is_paid() ) {
                    $order->payment_complete();
                    
                    // Salvar informações adicionais do webhook
                    $order->update_meta_data( '_binance_webhook_data', $data );
                    $order->add_order_note( __( 'Pagamento confirmado via webhook Binance Pay.', 'wc-binance-pix' ) );
                    $order->save();
                    
                    $this->log_webhook_success( 'Pagamento confirmado para pedido: ' . $merchant_trade_no );
                } else {
                    $this->log_webhook_info( 'Pedido já estava pago: ' . $merchant_trade_no );
                }
            } elseif ( $status === 'PAY_CLOSED' || $status === 'PAY_CANCEL' ) {
                // Pagamento cancelado/fechado
                if ( ! $order->has_status( 'cancelled' ) ) {
                    $order->update_status( 'cancelled', __( 'Pagamento cancelado via Binance Pay.', 'wc-binance-pix' ) );
                    $this->log_webhook_info( 'Pagamento cancelado para pedido: ' . $merchant_trade_no );
                }
            } else {
                // Outros status (ex: PAY_PENDING)
                $this->log_webhook_info( 'Status recebido: ' . $status . ' para pedido: ' . $merchant_trade_no );
            }
        } else {
            // Tipo de evento não é PAY, apenas logar
            $biz_type = isset( $data['bizType'] ) ? $data['bizType'] : 'desconhecido';
            $this->log_webhook_info( 'Tipo de evento ignorado: ' . $biz_type );
        }

        // Sempre retornar 200 OK para a Binance
        header( 'HTTP/1.1 200 OK' );
        exit;
    }

    /**
     * Obtém headers do webhook de forma segura
     * 
     * @return array Headers do webhook
     */
    private function get_webhook_headers() {
        $headers = array();
        
        // WordPress pode usar diferentes formas de acessar headers
        if ( function_exists( 'getallheaders' ) ) {
            $all_headers = getallheaders();
            if ( $all_headers ) {
                foreach ( $all_headers as $key => $value ) {
                    $headers[ $key ] = $value;
                }
            }
        }
        
        // Fallback: verificar $_SERVER
        foreach ( $_SERVER as $key => $value ) {
            if ( strpos( $key, 'HTTP_' ) === 0 ) {
                $header_name = str_replace( ' ', '-', ucwords( str_replace( '_', ' ', strtolower( substr( $key, 5 ) ) ) ) );
                $headers[ $header_name ] = $value;
            }
        }
        
        // Normalizar nomes dos headers (alguns servidores podem usar diferentes casos)
        $normalized = array();
        foreach ( $headers as $key => $value ) {
            $normalized[ str_replace( ' ', '-', ucwords( strtolower( str_replace( '-', ' ', $key ) ) ) ) ] = $value;
        }
        
        return $normalized;
    }

    /**
     * Log de erro do webhook (sem expor informações sensíveis)
     * 
     * @param string $message Mensagem de erro
     */
    private function log_webhook_error( $message ) {
        if ( function_exists( 'wc_get_logger' ) ) {
            $logger = wc_get_logger();
            $logger->error( '[Binance Pay Webhook] ' . $message, array( 'source' => 'binance-pix-webhook' ) );
        } else {
            // Fallback para error_log se WooCommerce logger não estiver disponível
            error_log( '[Binance Pay Webhook] ' . $message );
        }
    }

    /**
     * Log de sucesso do webhook
     * 
     * @param string $message Mensagem de sucesso
     */
    private function log_webhook_success( $message ) {
        if ( function_exists( 'wc_get_logger' ) ) {
            $logger = wc_get_logger();
            $logger->info( '[Binance Pay Webhook] ' . $message, array( 'source' => 'binance-pix-webhook' ) );
        }
    }

    /**
     * Log de informação do webhook
     * 
     * @param string $message Mensagem informativa
     */
    private function log_webhook_info( $message ) {
        if ( function_exists( 'wc_get_logger' ) ) {
            $logger = wc_get_logger();
            $logger->info( '[Binance Pay Webhook] ' . $message, array( 'source' => 'binance-pix-webhook' ) );
        }
    }


    /**
     * Verifica e cancela pedidos expirados
     */
    public function check_and_expire_orders() {
        // Buscar pedidos pendentes/on-hold com pagamento Binance Pix
        $args = array(
            'status' => array( 'on-hold', 'pending' ),
            'payment_method' => 'binance_pix',
            'limit' => -1, // Buscar todos
            'meta_key' => '_binance_pix_created_at',
            'orderby' => 'date',
            'order' => 'ASC',
        );

        $orders = wc_get_orders( $args );
        
        if ( empty( $orders ) ) {
            return;
        }

        $current_time = time();
        $expired_count = 0;

        foreach ( $orders as $order ) {
            // Verificar se o pedido já foi pago
            if ( $order->is_paid() ) {
                continue;
            }

            // Obter timestamp de criação e timeout
            $created_at = $order->get_meta( '_binance_pix_created_at' );
            $timeout_minutes = $order->get_meta( '_binance_pix_timeout_minutes' );
            
            // Se não tiver metadados, usar valores padrão
            if ( ! $created_at ) {
                $created_at = strtotime( $order->get_date_created()->date( 'Y-m-d H:i:s' ) );
            }
            
            if ( ! $timeout_minutes || $timeout_minutes < 5 ) {
                $timeout_minutes = $this->payment_timeout_minutes;
            }

            // Calcular tempo de expiração
            $expiration_time = $created_at + ( $timeout_minutes * 60 );
            
            // Verificar se expirou
            if ( $current_time >= $expiration_time ) {
                // Verificar novamente se não foi pago (evitar race condition)
                $order = wc_get_order( $order->get_id() );
                
                if ( $order && ! $order->is_paid() && in_array( $order->get_status(), array( 'on-hold', 'pending' ) ) ) {
                    // Cancelar pedido
                    $order->update_status( 
                        'cancelled', 
                        __( 'Pedido cancelado automaticamente: tempo de pagamento expirado.', 'wc-binance-pix' ) 
                    );
                    
                    // Adicionar nota
                    $order->add_order_note( 
                        sprintf( 
                            __( 'Pedido expirado automaticamente após %d minutos sem pagamento.', 'wc-binance-pix' ),
                            $timeout_minutes
                        )
                    );
                    
                    // Restaurar estoque se necessário
                    if ( function_exists( 'wc_maybe_increase_stock_levels' ) ) {
                        wc_maybe_increase_stock_levels( $order );
                    }
                    
                    $expired_count++;
                    
                    // Log
                    if ( function_exists( 'wc_get_logger' ) ) {
                        $logger = wc_get_logger();
                        $logger->info( 
                            sprintf( 
                                '[Binance Pix] Pedido #%d expirado e cancelado automaticamente.',
                                $order->get_id()
                            ),
                            array( 'source' => 'binance-pix-expiration' )
                        );
                    }
                }
            }
        }

        // Log resumo se houver pedidos expirados
        if ( $expired_count > 0 && function_exists( 'wc_get_logger' ) ) {
            $logger = wc_get_logger();
            $logger->info( 
                sprintf( 
                    '[Binance Pix] Verificação de expiração: %d pedido(s) cancelado(s) automaticamente.',
                    $expired_count
                ),
                array( 'source' => 'binance-pix-expiration' )
            );
        }
    }
}

