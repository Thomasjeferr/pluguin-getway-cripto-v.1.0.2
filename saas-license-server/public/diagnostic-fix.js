// Script de diagnóstico standalone - SEM CSP inline
console.log('🔍 Script de diagnóstico carregado');

// Aguardar DOM carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDiagnostic);
} else {
    initDiagnostic();
}

function initDiagnostic() {
    console.log('✅ Inicializando diagnóstico...');
    
    // Anexar listener ao botão de diagnóstico
    const btnDiag = document.getElementById('btnDiagnostic');
    if (btnDiag) {
        console.log('✅ Botão diagnóstico encontrado');
        btnDiag.addEventListener('click', handleDiagnosticClick);
    } else {
        console.warn('⚠️ Botão diagnóstico NÃO encontrado');
    }
    
    // NÃO anexar listener ao formulário aqui - deixar o script principal fazer isso
    // O listener será anexado quando o modal for aberto pelo script principal
    console.log('ℹ️ [DIAGNOSTIC] Listener do formulário será anexado pelo script principal quando o modal for aberto');
}

function handleDiagnosticClick(e) {
    e.preventDefault();
    console.log('🔍 Botão diagnóstico clicado!');
    
    const resultDiv = document.getElementById('diagnosticResult');
    if (resultDiv) {
        resultDiv.style.display = 'block';
        const messageEl = document.getElementById('diagnosticMessage');
        if (messageEl) {
            // Usar createElement ao invés de innerHTML para segurança
            messageEl.textContent = '';
            const strong = document.createElement('strong');
            strong.textContent = '✅ FUNCIONOU!';
            messageEl.appendChild(strong);
            messageEl.appendChild(document.createTextNode(' O botão está respondendo. Agora testando criação de cliente...'));
        }
        
        // Executar diagnóstico real
        setTimeout(() => {
            runDiagnostic();
        }, 1000);
    } else {
        alert('✅ Botão clicado! Mas div diagnosticResult não encontrada.');
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('📝 [DIAGNOSTIC] Formulário submetido!');
    console.log('🔍 [DIAGNOSTIC] Verificando submitNewClient:', typeof window.submitNewClient);
    
    // Aguardar um pouco para garantir que a função foi definida
    setTimeout(() => {
        if (typeof window.submitNewClient === 'function') {
            console.log('✅ [DIAGNOSTIC] Chamando window.submitNewClient...');
            window.submitNewClient(e);
        } else {
            console.error('❌ [DIAGNOSTIC] Função submitNewClient não está disponível!');
            console.error('❌ [DIAGNOSTIC] Tipo:', typeof window.submitNewClient);
            
            // Tentar novamente após mais um delay
            setTimeout(() => {
                if (typeof window.submitNewClient === 'function') {
                    console.log('✅ [DIAGNOSTIC] Função encontrada no segundo try, chamando...');
                    window.submitNewClient(e);
                } else {
                    console.error('❌ [DIAGNOSTIC] Função ainda não disponível após delay');
                    if (typeof window.showCustomAlert === 'function') {
                        window.showCustomAlert({
                            type: 'error',
                            title: 'Erro',
                            message: 'Função submitNewClient não está disponível! Recarregue a página.'
                        });
                    } else {
                        alert('Função submitNewClient não está definida!');
                    }
                }
            }, 100);
        }
    }, 50);
}

async function runDiagnostic() {
    try {
        const modal = document.getElementById('newClientModal');
        // Tentar pegar token de vários lugares possíveis
        let csrfToken = '';
        const inputCsrf = modal?.querySelector('input[name="_csrf"]');
        const metaCsrf = document.querySelector('meta[name="csrf-token"]');
        const formCsrf = document.querySelector('form input[name="_csrf"]');
        
        if (inputCsrf) csrfToken = inputCsrf.value;
        else if (metaCsrf) csrfToken = metaCsrf.getAttribute('content');
        else if (formCsrf) csrfToken = formCsrf.value;
        
        console.log('🔑 CSRF Token encontrado:', csrfToken ? 'Sim' : 'Não');
        
        // Usar e-mail padrão simples para garantir aprovação na validação
        const timestamp = Date.now().toString().slice(-4);
        const testEmail = `cliente${timestamp}@teste.com`; 
        
        const formData = new FormData();
        formData.append('email', testEmail);
        formData.append('plan', 'trial');
        formData.append('password', 'SenhaForte123!'); 
        formData.append('domain', 'teste.com.br');
        formData.append('notes', 'Cliente de diagnóstico automático');
        // Enviar no body também por garantia
        if (csrfToken) formData.append('_csrf', csrfToken);
        
        console.log('📤 Enviando requisição (JSON)...');
        
        // Headers base
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Enviar no header também (padrão comum)
        if (csrfToken) {
            headers['CSRF-Token'] = csrfToken;
            headers['X-CSRF-Token'] = csrfToken;
        }

        const response = await fetch('/admin/create-client', {
            method: 'POST',
            body: JSON.stringify({
                email: testEmail,
                plan: 'trial',
                password: 'SenhaForte123!',
                domain: 'teste.com.br',
                notes: 'Diagnóstico automático',
                _csrf: csrfToken
            }),
            headers: headers, 
            credentials: 'same-origin'
        });
        
        console.log('📥 Resposta:', response.status);
        
        const messageEl = document.getElementById('diagnosticMessage');
        if (response.ok) {
            const result = await response.json();
            if (messageEl) {
                messageEl.textContent = ''; // Limpar
                if (result.success) {
                    // Construir mensagem de sucesso de forma segura
                    const strong = document.createElement('strong');
                    strong.textContent = '✅ SUCESSO!';
                    messageEl.appendChild(strong);
                    const br1 = document.createElement('br');
                    messageEl.appendChild(br1);
                    messageEl.appendChild(document.createTextNode('Cliente criado: ' + (result.license?.email || 'N/A')));
                    const br2 = document.createElement('br');
                    messageEl.appendChild(br2);
                    messageEl.appendChild(document.createTextNode('Chave: ' + (result.license?.key || 'N/A')));
                } else {
                    // Construir mensagem de erro de forma segura
                    const strong = document.createElement('strong');
                    strong.textContent = '❌ ERRO:';
                    messageEl.appendChild(strong);
                    messageEl.appendChild(document.createTextNode(' ' + (result.message || 'Erro desconhecido')));
                }
            }
        } else {
            const text = await response.text();
            if (messageEl) {
                messageEl.textContent = ''; // Limpar
                const strong = document.createElement('strong');
                strong.textContent = '❌ ERRO HTTP ' + response.status + ':';
                messageEl.appendChild(strong);
                const br = document.createElement('br');
                messageEl.appendChild(br);
                // Escapar texto da resposta (pode conter HTML malicioso)
                const textNode = document.createTextNode(text.substring(0, 200));
                messageEl.appendChild(textNode);
            }
        }
    } catch (err) {
        console.error('❌ Erro:', err);
        const messageEl = document.getElementById('diagnosticMessage');
        if (messageEl) {
            // Construir mensagem de erro de forma segura
            messageEl.textContent = '';
            const strong = document.createElement('strong');
            strong.textContent = '❌ ERRO:';
            messageEl.appendChild(strong);
            messageEl.appendChild(document.createTextNode(' ' + (err.message || 'Erro desconhecido')));
        }
        alert('Erro no diagnóstico: ' + err.message);
    }
}

