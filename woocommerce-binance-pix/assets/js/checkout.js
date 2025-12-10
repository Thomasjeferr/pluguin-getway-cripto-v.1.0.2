jQuery(function($) {
    
    // HTML do Modal com Acessibilidade (ARIA)
    $('body').append(`
        <div id="binance-modal" 
             class="binance-modal-overlay" 
             role="dialog" 
             aria-modal="true" 
             aria-labelledby="modal-title" 
             aria-describedby="modal-description"
             tabindex="-1">
            <div class="binance-modal-content">
                <button class="modal-close" 
                        id="modal-close-btn"
                        aria-label="Fechar modal de pagamento"
                        onclick="jQuery('#binance-modal').hide()">×</button>
                
                <!-- Região para anúncios de status (leitores de tela) -->
                <div id="aria-live-status" 
                     class="sr-only" 
                     role="status" 
                     aria-live="polite" 
                     aria-atomic="true"></div>
                
                <div id="modal-loading" role="status" aria-live="polite">
                    <div class="binance-logo" aria-hidden="true">B</div>
                    <div class="binance-spinner" aria-hidden="true"></div>
                    <h3 id="loading-title">Processando Pagamento</h3>
                    <p id="loading-description">Aguarde enquanto geramos seu QR Code...</p>
                </div>

                <div id="modal-qr" style="display: none;" role="region" aria-labelledby="modal-title">
                    <div class="binance-logo" aria-hidden="true">B</div>
                    <div id="testmode-badge" 
                         style="display: none; background: #ffc107; color: #000; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 10px;"
                         role="status"
                         aria-label="Modo de teste ativo">
                        🧪 MODO DE TESTE
                    </div>
                    <h3 id="modal-title">Pague com Pix / Binance</h3>
                    <p id="modal-description">Escaneie o QR Code ou copie o código Pix</p>
                    
                    <div id="binance-qr-container" 
                         role="img" 
                         aria-label="QR Code para pagamento Pix">
                        <!-- QR Code vai aqui -->
                    </div>

                    <div class="qr-status checking" 
                         id="qr-status" 
                         role="status" 
                         aria-live="polite" 
                         aria-atomic="true">
                        ⏳ Aguardando confirmação do pagamento...
                    </div>
                    
                    <div class="payment-timer" 
                         id="payment-timer" 
                         style="display: none;"
                         role="timer" 
                         aria-live="polite" 
                         aria-atomic="true"
                         aria-label="Tempo restante para realizar o pagamento">
                        <div class="timer-icon" aria-hidden="true">⏱️</div>
                        <div class="timer-text">
                            <span id="timer-label">Tempo restante:</span>
                            <span id="timer-display" 
                                  class="timer-countdown" 
                                  aria-label="Tempo restante em minutos e segundos">--:--</span>
                        </div>
                    </div>

                    <button id="copy-pix-btn" 
                            class="binance-copy-btn"
                            aria-label="Copiar código Pix para área de transferência"
                            aria-describedby="copy-instructions">
                        📋 Copiar Código Pix
                    </button>
                    
                    <div id="copy-instructions" class="sr-only">
                        Use este botão para copiar o código Pix e colar no aplicativo do seu banco
                    </div>
                    
                    <div id="copy-success" 
                         style="display: none; margin-top: 10px; color: #28a745; font-weight: 500; font-size: 14px;"
                         role="status" 
                         aria-live="polite" 
                         aria-atomic="true">
                        ✅ Código Pix copiado para a área de transferência!
                    </div>

                    <div class="payment-instructions">
                        <h4>Como pagar:</h4>
                        <ol>
                            <li>Escaneie o QR Code com o app do seu banco</li>
                            <li>OU copie o código Pix e cole no app do banco</li>
                            <li>Confirme o pagamento no app</li>
                            <li>Aguarde a confirmação automática (5-30 segundos)</li>
                        </ol>
                        <div style="margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 5px; font-size: 12px; color: #856404;">
                            💡 <strong>Dica:</strong> O pagamento será convertido automaticamente para USDT na sua carteira Binance.
                        </div>
                    </div>
                </div>

                <div id="modal-error" 
                     style="display: none;" 
                     role="alertdialog" 
                     aria-labelledby="error-title" 
                     aria-describedby="error-message">
                    <div class="error-icon" aria-hidden="true">⚠️</div>
                    <h3 id="error-title">Erro no Pagamento</h3>
                    <p id="error-message">Ocorreu um erro ao processar seu pagamento.</p>
                    
                    <div class="error-details" id="error-details" style="display: none;">
                        <p><strong>Detalhes técnicos:</strong></p>
                        <p id="error-details-text" style="font-size: 12px; color: #666;"></p>
                    </div>

                    <div class="error-actions">
                        <button id="retry-payment-btn" 
                                class="binance-retry-btn"
                                aria-label="Tentar realizar o pagamento novamente">
                            🔄 Tentar Novamente
                        </button>
                        <button id="close-error-btn" 
                                class="binance-close-btn"
                                aria-label="Fechar modal de erro">
                            ✕ Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `);

    var checkInterval;
    var timeoutInterval;

    // Variável para armazenar código Pix
    var pixCode = '';
    
    // Tempo de expiração em minutos (vem do PHP)
    var timeoutMinutes = (typeof wc_binance_params !== 'undefined' && wc_binance_params.payment_timeout_minutes) 
        ? parseInt(wc_binance_params.payment_timeout_minutes) 
        : 15;
    if (timeoutMinutes < 5) timeoutMinutes = 15; // Garantir mínimo de 5 minutos

    // Interceptar Checkout do WooCommerce
    $('form.checkout').on('checkout_place_order_success', function(event, result) {
        
        // Verificar se há erro no resultado
        if (result.binance_error) {
            showErrorModal(result.error_title || 'Erro no Pagamento', result.error_message || 'Ocorreu um erro ao processar seu pagamento.', result.error_details);
            return false;
        }
        
        if (result.binance_modal) {
            // É um pagamento Binance! Mostrar Modal
            
            // Mostrar loading primeiro
            $('#modal-loading').show();
            $('#modal-qr').hide();
            $('#modal-error').hide();
            $('#binance-modal').css('display', 'flex');
            
            // Acessibilidade: Anunciar abertura do modal e focar nele
            announceToScreenReader('Modal de pagamento aberto. Aguarde enquanto processamos seu pagamento.');
            focusModal();

            // Aguardar um pouco e mostrar QR Code
            setTimeout(function() {
                // 1. Mostrar QR Code
                if (result.qr_code) {
                    // Se a API retornou URL da imagem do QR
                    $('#binance-qr-container').html('<img src="' + result.qr_code + '" class="binance-qr-code" alt="QR Code Pix">');
                    // Armazenar checkout_url como fallback
                    $('#binance-qr-container').data('checkout-url', result.checkout_url || '');
                } else {
                    $('#binance-qr-container').html('<p style="color: #666;">QR Code não disponível. Use o botão abaixo para copiar o código Pix.</p>');
                }

                // 2. Armazenar código Pix (se disponível) e dados relacionados
                pixCode = result.pix_code || '';
                
                // Armazenar dados no container para uso posterior
                $('#binance-qr-container').data('checkout-url', result.checkout_url || '');
                $('#binance-qr-container').data('order-id', result.order_id || '');
                
                // Se não tiver código Pix mas tiver checkout_url, usar como fallback
                // Nota: O checkout_url da Binance pode ser usado para abrir o pagamento
                if (!pixCode && result.checkout_url) {
                    // Em produção, você pode fazer uma requisição para decodificar o QR Code
                    // e extrair o código Pix, mas por enquanto usamos o checkout_url
                    pixCode = result.checkout_url;
                }
                
                // Se o código Pix não estiver disponível, desabilitar botão temporariamente
                if (!pixCode) {
                    $('#copy-pix-btn').prop('disabled', true).css('opacity', '0.6');
                    $('#copy-pix-btn').text('📋 Código Pix não disponível');
                }

                // 3. Mostrar modal com QR Code
                $('#modal-loading').hide();
                $('#modal-qr').show();
                
                // Acessibilidade: Anunciar que QR Code está disponível
                announceToScreenReader('QR Code gerado. Escaneie com o app do seu banco ou copie o código Pix.');
                
                // Mostrar badge de modo de teste se ativo
                if (typeof wc_binance_params !== 'undefined' && wc_binance_params.testmode) {
                    $('#testmode-badge').show();
                    announceToScreenReader('Atenção: Modo de teste ativo.');
                }
                
                // Focar no botão de copiar código Pix
                $('#copy-pix-btn').focus();

                // 4. Iniciar Timer de Expiração
                startExpirationTimer(timeoutMinutes);

                // 5. Iniciar Polling (Verificação de Status)
                startPolling(result.order_id);
            }, 1500);

            // Impedir redirecionamento padrão do WooCommerce
            return false; 
        }
        
        return true;
    });

    // Interceptar erros do checkout
    $('form.checkout').on('checkout_place_order', function(event, data) {
        // Se houver erros de validação, deixar o WooCommerce lidar normalmente
        return true;
    });

    // Função para copiar código Pix
    function copyPixCode() {
        var codeToCopy = pixCode;
        var orderId = $('#binance-qr-container').data('order-id') || '';
        var btn = $('#copy-pix-btn');
        
        // Se não tiver código Pix direto, tentar obter via AJAX
        if (!codeToCopy && orderId && wc_binance_params.get_pix_code_url) {
            btn.prop('disabled', true).text('⏳ Obtendo código Pix...');
            
            $.ajax({
                url: wc_binance_params.get_pix_code_url,
                data: { 
                    order_id: orderId,
                    nonce: wc_binance_params.nonce // Adicionar nonce para validação de segurança
                },
                success: function(response) {
                    var data = typeof response === 'string' ? JSON.parse(response) : response;
                    if (data.success && data.data.pix_code) {
                        codeToCopy = data.data.pix_code;
                        pixCode = codeToCopy; // Armazenar para próximas tentativas
                        performCopy(codeToCopy);
                    } else {
                        // Fallback para checkout_url
                        var checkoutUrl = $('#binance-qr-container').data('checkout-url') || '';
                        if (checkoutUrl) {
                            codeToCopy = checkoutUrl;
                            performCopy(codeToCopy);
                        } else {
                            alert('Código Pix não disponível no momento. Por favor, escaneie o QR Code com o app do seu banco.');
                            btn.prop('disabled', false).text('📋 Copiar Código Pix');
                        }
                    }
                },
                error: function() {
                    // Fallback para checkout_url em caso de erro
                    var checkoutUrl = $('#binance-qr-container').data('checkout-url') || '';
                    if (checkoutUrl) {
                        codeToCopy = checkoutUrl;
                        performCopy(codeToCopy);
                    } else {
                        alert('Erro ao obter código Pix. Por favor, escaneie o QR Code.');
                        btn.prop('disabled', false).text('📋 Copiar Código Pix');
                    }
                }
            });
            return;
        }
        
        // Se já tiver código, copiar diretamente
        if (codeToCopy) {
            performCopy(codeToCopy);
        } else {
            alert('Código Pix não disponível. Por favor, escaneie o QR Code.');
        }
    }
    
    function performCopy(codeToCopy) {
        var btn = $('#copy-pix-btn');

        // Usar Clipboard API moderna se disponível
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(codeToCopy).then(function() {
                showCopySuccess();
            }).catch(function(err) {
                console.error('Erro ao copiar:', err);
                fallbackCopy(codeToCopy);
            });
        } else {
            // Fallback para navegadores antigos
            fallbackCopy(codeToCopy);
        }
    }

    function fallbackCopy(text) {
        // Criar elemento temporário para copiar
        var tempInput = $('<input>');
        $('body').append(tempInput);
        tempInput.val(text).select();
        
        try {
            document.execCommand('copy');
            tempInput.remove();
            showCopySuccess();
        } catch (err) {
            console.error('Erro ao copiar:', err);
            // Último fallback: mostrar em prompt
            prompt('Copie o código Pix abaixo:', text);
        }
    }

    function showCopySuccess() {
        var btn = $('#copy-pix-btn');
        var successMsg = $('#copy-success');
        
        btn.prop('disabled', false);
        btn.text('✅ Código Copiado!');
        btn.addClass('copied');
        successMsg.show();
        
        // Acessibilidade: Anunciar sucesso para leitores de tela
        announceToScreenReader('Código Pix copiado para a área de transferência com sucesso.');
        
        // Resetar após 3 segundos
        setTimeout(function() {
            btn.text('📋 Copiar Código Pix');
            btn.removeClass('copied');
            successMsg.hide();
        }, 3000);
    }

    // Event listener para botão de copiar
    $(document).on('click', '#copy-pix-btn', function(e) {
        e.preventDefault();
        copyPixCode();
    });

    function startExpirationTimer(minutes) {
        var totalSeconds = minutes * 60;
        var remainingSeconds = totalSeconds;
        
        // Mostrar timer
        $('#payment-timer').show();
        
        function updateTimer() {
            var mins = Math.floor(remainingSeconds / 60);
            var secs = remainingSeconds % 60;
            
            // Formatar com zero à esquerda
            var display = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
            $('#timer-display').text(display);
            
            // Acessibilidade: Atualizar aria-label do timer
            updateTimerAriaLabel(remainingSeconds);
            
            // Anunciar quando restar menos de 1 minuto (apenas uma vez)
            if (remainingSeconds === 60) {
                announceToScreenReader('Atenção: Resta menos de 1 minuto para realizar o pagamento.');
            }
            
            // Mudar cor quando restar menos de 1 minuto
            if (remainingSeconds <= 60) {
                $('#timer-display').addClass('timer-warning');
            } else {
                $('#timer-display').removeClass('timer-warning');
            }
            
            if (remainingSeconds <= 0) {
                // Tempo esgotado!
                clearInterval(timeoutInterval);
                clearInterval(checkInterval);
                
                // Atualizar status
                $('#qr-status').html('⏰ <strong>Tempo esgotado!</strong> O pagamento expirou.');
                $('#qr-status').removeClass('checking').addClass('expired');
                
                // Desabilitar botão de copiar
                $('#copy-pix-btn').prop('disabled', true)
                    .text('⏰ Pagamento Expirado')
                    .attr('aria-disabled', 'true');
                
                // Acessibilidade: Anunciar expiração
                announceToScreenReader('Atenção: O tempo para realizar o pagamento expirou. O pedido foi cancelado.');
                
                // Mostrar mensagem e opção de fechar
                setTimeout(function() {
                    if (confirm('O tempo para realizar o pagamento expirou. Deseja fechar esta janela e tentar novamente?')) {
                        $('#binance-modal').hide();
                        // Recarregar página para permitir novo pedido
                        window.location.reload();
                    }
                }, 2000);
                
                return;
            }
            
            remainingSeconds--;
        }
        
        // Atualizar imediatamente
        updateTimer();
        
        // Atualizar a cada segundo
        timeoutInterval = setInterval(updateTimer, 1000);
    }

    function startPolling(orderId) {
        checkInterval = setInterval(function() {
            $.ajax({
                url: wc_binance_params.check_status_url,
                data: { 
                    order_id: orderId,
                    nonce: wc_binance_params.nonce // Adicionar nonce para validação de segurança
                },
                dataType: 'json',
                success: function(response) {
                    try {
                        // WordPress wp_send_json_success retorna {success: true, data: {...}}
                        // WordPress wp_send_json_error retorna {success: false, data: {...}}
                        var data = response.success !== undefined ? response.data : response;
                        
                        if (data && data.paid) {
                            // Parar todos os timers
                            clearInterval(checkInterval);
                            clearInterval(timeoutInterval);
                            
                            // Atualizar status
                            $('#qr-status').html('✅ <strong>Pagamento confirmado!</strong> Redirecionando...');
                            $('#qr-status').removeClass('checking expired cancelled').addClass('paid');
                            $('#payment-timer').hide();
                            
                            // Acessibilidade: Anunciar confirmação de pagamento
                            announceToScreenReader('Pagamento confirmado com sucesso! Redirecionando para página de confirmação.');
                            
                            // Sucesso! Redirecionar após 1 segundo
                            setTimeout(function() {
                                if (wc_binance_params.custom_success_url) {
                                    window.location.href = wc_binance_params.custom_success_url;
                                } else {
                                    window.location.href = '/checkout/order-received/' + orderId;
                                }
                            }, 1000);
                        } else if (data && (data.status === 'cancelled' || data.status === 'failed' || data.status === 'refunded')) {
                            // Pagamento cancelado, falhou ou foi reembolsado
                            clearInterval(checkInterval);
                            clearInterval(timeoutInterval);
                            
                            var errorMessage = data.message || 'O pagamento foi cancelado ou recusado.';
                            var statusMessages = {
                                'cancelled': 'O pagamento foi cancelado.',
                                'failed': 'O pagamento falhou.',
                                'refunded': 'O pagamento foi reembolsado.'
                            };
                            
                            showErrorModal(
                                'Pagamento Não Confirmado',
                                statusMessages[data.status] || errorMessage,
                                'Erro ao verificar status do pagamento. Verifique sua conexão e tente novamente.'
                            );
                        } else if (response.success === false) {
                            // Erro na verificação
                            clearInterval(checkInterval);
                            clearInterval(timeoutInterval);
                            
                            var errorMsg = data.message || 'Não foi possível verificar o status do pagamento.';
                            showErrorModal(
                                'Erro ao Verificar Pagamento',
                                errorMsg,
                                'Por favor, entre em contato com o suporte se o problema persistir.'
                            );
                        }
                        // Se data.paid === false mas status não é erro, continuar aguardando
                    } catch (e) {
                        console.error('Erro ao processar resposta do polling:', e);
                        // Continuar tentando mesmo com erro de parsing
                    }
                },
                error: function(xhr, status, error) {
                    // Erro na requisição - não parar o polling imediatamente
                    // Só parar após várias tentativas falhadas
                    console.error('Erro ao verificar status do pagamento:', error);
                    // Continuar tentando - pode ser erro temporário de rede
                }
            });
        }, 3000); // Checar a cada 3 segundos
    }

    /**
     * Mostra modal de erro
     */
    function showErrorModal(title, message, details) {
        // Parar todos os timers
        if (checkInterval) clearInterval(checkInterval);
        if (timeoutInterval) clearInterval(timeoutInterval);
        
        // Esconder outros estados
        $('#modal-loading').hide();
        $('#modal-qr').hide();
        
        // Mostrar modal de erro
        $('#error-title').text(title);
        $('#error-message').text(message);
        
        if (details) {
            $('#error-details-text').text(details);
            $('#error-details').show();
        } else {
            $('#error-details').hide();
        }
        
        $('#modal-error').show();
        $('#binance-modal').css('display', 'flex');
        
        // Acessibilidade: Anunciar erro e focar no botão de tentar novamente
        announceToScreenReader('Erro no pagamento: ' + title + '. ' + message);
        $('#retry-payment-btn').focus();
    }

    // Event listeners para botões de erro
    $(document).on('click', '#retry-payment-btn', function(e) {
        e.preventDefault();
        // Fechar modal e recarregar página para tentar novamente
        $('#binance-modal').hide();
        // Acessibilidade: Anunciar que está tentando novamente
        announceToScreenReader('Tentando realizar o pagamento novamente.');
        window.location.reload();
    });

    $(document).on('click', '#close-error-btn', function(e) {
        e.preventDefault();
        $('#binance-modal').hide();
        restoreFocus();
        // Acessibilidade: Anunciar fechamento
        announceToScreenReader('Modal de erro fechado.');
        // Opcional: redirecionar para página de checkout ou home
        // window.location.href = '/checkout/';
    });
    
    // ============================================
    // FUNÇÕES DE ACESSIBILIDADE
    // ============================================
    
    /**
     * Anuncia mensagem para leitores de tela
     * @param {string} message Mensagem a ser anunciada
     */
    function announceToScreenReader(message) {
        var $announcer = $('#aria-live-status');
        if ($announcer.length === 0) {
            // Criar elemento se não existir
            $('body').append('<div id="aria-live-status" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>');
            $announcer = $('#aria-live-status');
        }
        
        // Limpar e definir nova mensagem
        $announcer.text('');
        setTimeout(function() {
            $announcer.text(message);
            // Limpar após 1 segundo para permitir novo anúncio
            setTimeout(function() {
                $announcer.text('');
            }, 1000);
        }, 100);
    }
    
    /**
     * Foca no modal quando aberto
     */
    function focusModal() {
        // Focar no modal (para navegação por teclado)
        var $modal = $('#binance-modal');
        $modal.attr('tabindex', '-1');
        $modal.focus();
        
        // Se o modal tiver conteúdo visível, focar no primeiro elemento interativo
        setTimeout(function() {
            var $firstFocusable = $modal.find('button:visible, input:visible, select:visible, textarea:visible, [tabindex]:visible').first();
            if ($firstFocusable.length > 0) {
                $firstFocusable.focus();
            } else {
                $modal.focus();
            }
        }, 100);
    }
    
    /**
     * Gerencia foco quando modal fecha
     */
    function restoreFocus() {
        // Retornar foco para o botão de finalizar pedido
        var $placeOrderBtn = $('button[name="woocommerce_checkout_place_order"]');
        if ($placeOrderBtn.length > 0) {
            $placeOrderBtn.focus();
        }
    }
    
    /**
     * Atualiza aria-label do timer dinamicamente
     */
    function updateTimerAriaLabel(remainingSeconds) {
        var mins = Math.floor(remainingSeconds / 60);
        var secs = remainingSeconds % 60;
        var ariaLabel = 'Tempo restante: ' + mins + ' minuto' + (mins !== 1 ? 's' : '') + 
                       ' e ' + secs + ' segundo' + (secs !== 1 ? 's' : '');
        $('#payment-timer').attr('aria-label', ariaLabel);
    }
    
    // ============================================
    // NAVEGAÇÃO POR TECLADO
    // ============================================
    
    // Fechar modal com ESC
    $(document).on('keydown', '#binance-modal', function(e) {
        // ESC fecha o modal
        if (e.key === 'Escape' || e.keyCode === 27) {
            e.preventDefault();
            $('#binance-modal').hide();
            restoreFocus();
            announceToScreenReader('Modal fechado.');
        }
        
        // Prevenir Tab de sair do modal quando aberto
        if (e.key === 'Tab' || e.keyCode === 9) {
            var $modal = $('#binance-modal');
            if ($modal.is(':visible')) {
                var $focusableElements = $modal.find('button:visible, input:visible, select:visible, textarea:visible, [tabindex]:not([tabindex="-1"]):visible');
                var $firstElement = $focusableElements.first();
                var $lastElement = $focusableElements.last();
                
                // Se Tab no último elemento, voltar para o primeiro
                if (e.shiftKey && document.activeElement === $firstElement[0]) {
                    e.preventDefault();
                    $lastElement.focus();
                }
                // Se Tab no último elemento, ir para o primeiro
                else if (!e.shiftKey && document.activeElement === $lastElement[0]) {
                    e.preventDefault();
                    $firstElement.focus();
                }
            }
        }
    });
    
    // Fechar modal ao clicar no overlay (fora do conteúdo)
    $(document).on('click', '#binance-modal', function(e) {
        if (e.target === this) {
            $('#binance-modal').hide();
            restoreFocus();
            announceToScreenReader('Modal fechado.');
        }
    });

});

