jQuery(function($) {
    
    // HTML do Modal
    $('body').append(`
        <div id="binance-modal" class="binance-modal-overlay">
            <div class="binance-modal-content">
                <h3>Pague com Pix / Binance</h3>
                <p>Escaneie o QR Code abaixo com seu App da Binance ou Banco.</p>
                
                <div id="binance-qr-container">
                    <!-- QR Code vai aqui -->
                </div>

                <div class="binance-spinner"></div>
                <p>Aguardando confirmação do pagamento...</p>

                <a href="#" id="binance-pay-btn" target="_blank" class="binance-btn">Abrir App Binance</a>
            </div>
        </div>
    `);

    var checkInterval;

    // Interceptar Checkout do WooCommerce
    $('form.checkout').on('checkout_place_order_success', function(event, result) {
        
        if (result.binance_modal) {
            // É um pagamento Binance! Mostrar Modal
            
            // 1. Mostrar QR Code
            if (result.qr_code) {
                // Se a API retornou URL da imagem do QR
                // Nota: A API V2 as vezes retorna string, as vezes URL. 
                // Assumindo URL de imagem ou usando biblioteca JS para gerar se for string
                $('#binance-qr-container').html('<img src="' + result.qr_code + '" class="binance-qr-code">');
            } else {
                $('#binance-qr-container').html('<p>Use o botão abaixo para pagar.</p>');
            }

            // 2. Link do Botão
            $('#binance-pay-btn').attr('href', result.checkout_url);

            // 3. Abrir Modal
            $('#binance-modal').css('display', 'flex');

            // 4. Iniciar Polling (Verificação de Status)
            startPolling(result.order_id);

            // Impedir redirecionamento padrão do WooCommerce
            return false; 
        }
        
        return true;
    });

    function startPolling(orderId) {
        checkInterval = setInterval(function() {
            $.ajax({
                url: wc_binance_params.check_status_url,
                data: { order_id: orderId },
                success: function(response) {
                    var data = JSON.parse(response);
                    if (data.paid) {
                        clearInterval(checkInterval);
                        
                        // Sucesso! Redirecionar
                        if (wc_binance_params.custom_success_url) {
                            window.location.href = wc_binance_params.custom_success_url;
                        } else {
                            window.location.href = '/checkout/order-received/' + orderId;
                        }
                    }
                }
            });
        }, 3000); // Checar a cada 3 segundos
    }

});

