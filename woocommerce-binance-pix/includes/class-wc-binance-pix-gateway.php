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
		$this->icon               = ''; 
		$this->has_fields         = false; 
		$this->method_title       = __( 'Binance Pix / USDT', 'wc-binance-pix' );
		$this->method_description = __( 'Aceite pagamentos via Pix convertidos em USDT via Binance Pay.', 'wc-binance-pix' );

		// Load the settings
		$this->init_form_fields();
		$this->init_settings();

		// Define user set variables
		$this->title        = $this->get_option( 'title' );
		$this->description  = $this->get_option( 'description' );
		$this->enabled      = $this->get_option( 'enabled' );
		$this->testmode     = 'yes' === $this->get_option( 'testmode' );
        $this->custom_success_url = $this->get_option( 'custom_success_url' ); // URL personalizada
        
        // License Keys
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
	}

    public function enqueue_payment_scripts() {
        if ( is_checkout() ) {
            wp_enqueue_script( 'wc-binance-modal', WC_BINANCE_PIX_URL . 'assets/js/checkout.js', array( 'jquery' ), '1.0', true );
            wp_enqueue_style( 'wc-binance-modal-css', WC_BINANCE_PIX_URL . 'assets/css/checkout.css' );
            
            wp_localize_script( 'wc-binance-modal', 'wc_binance_params', array(
                'check_status_url' => WC()->api_request_url( 'wc_binance_check_status' ),
                'custom_success_url' => $this->custom_success_url
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
				'title'       => __( 'Título', 'wc-binance-pix' ),
				'type'        => 'text',
				'default'     => __( 'Pix (via Binance)', 'wc-binance-pix' ),
			),
			'description' => array(
				'title'       => __( 'Descrição', 'wc-binance-pix' ),
				'type'        => 'textarea',
				'default'     => __( 'Pague com Pix e processaremos via Binance USDT.', 'wc-binance-pix' ),
			),
            'custom_success_url' => array(
				'title'       => __( 'URL de Sucesso Personalizada', 'wc-binance-pix' ),
				'type'        => 'text',
				'description' => __( 'Para onde o cliente vai após o pagamento ser confirmado? Deixe em branco para usar a padrão do WooCommerce.', 'wc-binance-pix' ),
				'placeholder' => 'https://seusite.com/obrigado',
			),
			'testmode' => array(
				'title'       => __( 'Modo de Teste', 'wc-binance-pix' ),
				'type'        => 'checkbox',
				'label'       => __( 'Ativar modo de teste (Binance Sandbox)', 'wc-binance-pix' ),
				'default'     => 'yes',
			),
            'section_license' => array(
				'title'       => __( 'Licença do Plugin', 'wc-binance-pix' ),
				'type'        => 'title',
                'description' => __( 'Insira suas credenciais para ativar o plugin. <a href="http://localhost:3000/comprar" target="_blank">Não tem licença? Compre aqui.</a>', 'wc-binance-pix' ),
			),
            'license_email' => array(
				'title'       => __( 'Email de Licença', 'wc-binance-pix' ),
				'type'        => 'email',
			),
            'license_key' => array(
				'title'       => __( 'Chave de Ativação', 'wc-binance-pix' ),
				'type'        => 'password',
			),
             'section_api' => array(
				'title'       => __( 'Credenciais Binance Pay', 'wc-binance-pix' ),
				'type'        => 'title',
                'description' => __( 'Obtenha essas chaves no portal Binance Merchant. <a href="https://merchant.binance.com/en/dashboard/developers" target="_blank">Clique aqui para acessar.</a>', 'wc-binance-pix' ),
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

    public function validate_license_on_save() {
        // ... (Mantendo lógica de validação existente)
        $this->init_settings();
        $email = $this->settings['license_email'] ?? '';
        $key   = $this->settings['license_key'] ?? '';

        if ( empty( $email ) || empty( $key ) ) return;

        $api_url = 'http://localhost:3000/api/validate';

        $response = wp_remote_post( $api_url, array(
            'body'    => json_encode( array( 'email' => $email, 'license_key' => $key, 'domain' => $_SERVER['HTTP_HOST'] ?? 'unknown' ) ),
            'headers' => array( 'Content-Type' => 'application/json' ),
            'timeout' => 15,
        ) );

        if ( !is_wp_error( $response ) ) {
            $body = json_decode( wp_remote_retrieve_body( $response ), true );
            if ( isset( $body['success'] ) && $body['success'] ) {
                set_transient( 'wc_binance_pix_license_status', 'valid', 24 * HOUR_IN_SECONDS );
            } else {
                delete_transient( 'wc_binance_pix_license_status' );
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
            wc_add_notice( 'Erro Binance: ' . $response->get_error_message(), 'error' );
            return;
        }

        if ( isset( $response['status'] ) && $response['status'] === 'SUCCESS' ) {
            
            // Sucesso! Retornar dados para o JS abrir o Modal
            
            $order->update_status( 'on-hold', __( 'Aguardando pagamento Binance Pix.', 'wc-binance-pix' ) );
            $order->reduce_order_stock();
            WC()->cart->empty_cart();

            // Verificar se temos link de QRCode ou apenas checkoutUrl
            $qr_code = isset($response['data']['qrcodeLink']) ? $response['data']['qrcodeLink'] : null;
            $checkout_url = $response['data']['checkoutUrl'];

            // Retornar JSON especial que nosso JS vai interceptar
            return array(
                'result' => 'success',
                'binance_modal' => true, // Flag para nosso JS
                'qr_code' => $qr_code,
                'checkout_url' => $checkout_url,
                'order_id' => $order->get_id()
            );

        } else {
            wc_add_notice( 'Erro na API Binance.', 'error' );
            return;
        }
	}
    
    // Polling Endpoint
    public function check_order_status() {
        $order_id = isset($_GET['order_id']) ? intval($_GET['order_id']) : 0;
        if (!$order_id) exit;

        $order = wc_get_order($order_id);
        if ($order && ($order->has_status('processing') || $order->has_status('completed'))) {
            echo json_encode(['paid' => true]);
        } else {
            echo json_encode(['paid' => false]);
        }
        exit;
    }

    private function is_license_active() {
        return get_transient( 'wc_binance_pix_license_status' ) === 'valid';
    }

    public function webhook() {
        // ... (Mantendo webhook original)
        $payload = file_get_contents('php://input');
        if ( empty( $payload ) ) exit;
        $data = json_decode( $payload, true );
        
        if ( isset( $data['bizType'] ) && $data['bizType'] === 'PAY' && isset( $data['bizStatus'] ) ) {
            $merchant_trade_no = $data['merchantTradeNo'];
            $status = $data['bizStatus'];
            $order = wc_get_order( $merchant_trade_no );

            if ( $order && $status === 'PAY_SUCCESS' ) {
                $order->payment_complete();
            }
        }
        header( 'HTTP/1.1 200 OK' );
        exit;
    }
}

