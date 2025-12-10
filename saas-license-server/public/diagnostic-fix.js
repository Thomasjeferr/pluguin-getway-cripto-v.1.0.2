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
    
    // Anexar listener ao formulário
    const form = document.getElementById('newClientForm');
    if (form) {
        console.log('✅ Formulário encontrado');
        form.addEventListener('submit', handleFormSubmit);
    } else {
        console.warn('⚠️ Formulário NÃO encontrado');
    }
}

function handleDiagnosticClick(e) {
    e.preventDefault();
    console.log('🔍 Botão diagnóstico clicado!');
    
    const resultDiv = document.getElementById('diagnosticResult');
    if (resultDiv) {
        resultDiv.style.display = 'block';
        const messageEl = document.getElementById('diagnosticMessage');
        if (messageEl) {
            messageEl.innerHTML = '<strong>✅ FUNCIONOU!</strong> O botão está respondendo. Agora testando criação de cliente...';
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
    console.log('📝 Formulário submetido!');
    
    if (typeof window.submitNewClient === 'function') {
        window.submitNewClient(e);
    } else {
        alert('Função submitNewClient não está definida!');
    }
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
            if (result.success) {
                messageEl.innerHTML = `<strong>✅ SUCESSO!</strong><br>Cliente criado: ${result.license?.email}<br>Chave: ${result.license?.key}`;
            } else {
                messageEl.innerHTML = `<strong>❌ ERRO:</strong> ${result.message}`;
            }
        } else {
            const text = await response.text();
            messageEl.innerHTML = `<strong>❌ ERRO HTTP ${response.status}:</strong><br>${text.substring(0, 200)}`;
        }
    } catch (err) {
        console.error('❌ Erro:', err);
        const messageEl = document.getElementById('diagnosticMessage');
        if (messageEl) {
            messageEl.innerHTML = `<strong>❌ ERRO:</strong> ${err.message}`;
        }
        alert('Erro no diagnóstico: ' + err.message);
    }
}

