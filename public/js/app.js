document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    // Elementos DOM
    const elements = {
        statusIndicator: document.getElementById('statusIndicator'),
        statusText: document.getElementById('statusText'),
        statusDot: document.querySelector('.status-dot'),
        phoneNumber: document.getElementById('phoneNumber'),
        lastUpdate: document.getElementById('lastUpdate'),
        qrCard: document.getElementById('qrCard'),
        qrImage: document.getElementById('qrImage'),
        qrPlaceholder: document.getElementById('qrPlaceholder'),
        connectedCard: document.getElementById('connectedCard'),
        connectedPhone: document.getElementById('connectedPhone'),
        disconnectBtn: document.getElementById('disconnectBtn'),
        loadingCard: document.getElementById('loadingCard'),
        loadingTitle: document.getElementById('loadingTitle'),
        loadingMessage: document.getElementById('loadingMessage'),
        progressFill: document.getElementById('progressFill'),
        errorCard: document.getElementById('errorCard'),
        errorMessage: document.getElementById('errorMessage')
    };

    // Mapeamento de status para textos
    const statusMessages = {
        disconnected: 'Desconectado',
        awaiting_scan: 'Aguardando escaneamento',
        authenticated: 'Autenticado',
        connected: 'Conectado',
        loading: 'Carregando...',
        auth_failure: 'Falha na autenticação'
    };

    // Atualizar interface baseado no status
    function updateUI(data) {
        const { status, phone, qrCode, loadingPercent, loadingMessage, error, reason } = data;

        // Atualizar indicador de status
        elements.statusText.textContent = statusMessages[status] || status;
        elements.statusDot.className = 'status-dot';

        if (status === 'connected') {
            elements.statusDot.classList.add('connected');
        } else if (status === 'disconnected' || status === 'auth_failure') {
            elements.statusDot.classList.add('disconnected');
        } else {
            elements.statusDot.classList.add('loading');
        }

        // Atualizar número do telefone
        if (phone) {
            elements.phoneNumber.textContent = formatPhoneNumber(phone);
        } else {
            elements.phoneNumber.textContent = '';
        }

        // Atualizar timestamp
        elements.lastUpdate.textContent = `Última atualização: ${new Date().toLocaleTimeString()}`;

        // Esconder todos os cards
        elements.qrCard.style.display = 'none';
        elements.connectedCard.style.display = 'none';
        elements.loadingCard.style.display = 'none';
        elements.errorCard.style.display = 'none';

        // Mostrar card apropriado
        switch (status) {
            case 'disconnected':
            case 'awaiting_scan':
                elements.qrCard.style.display = 'block';
                if (qrCode) {
                    elements.qrImage.src = qrCode;
                    elements.qrImage.style.display = 'block';
                    elements.qrPlaceholder.style.display = 'none';
                } else {
                    elements.qrImage.style.display = 'none';
                    elements.qrPlaceholder.style.display = 'block';
                }
                break;

            case 'loading':
            case 'authenticated':
                elements.loadingCard.style.display = 'block';
                if (loadingPercent !== undefined) {
                    elements.progressFill.style.width = `${loadingPercent}%`;
                }
                if (loadingMessage) {
                    elements.loadingMessage.textContent = loadingMessage;
                }
                break;

            case 'connected':
                elements.connectedCard.style.display = 'block';
                elements.connectedPhone.textContent = phone ? formatPhoneNumber(phone) : 'Número não identificado';
                break;

            case 'auth_failure':
                elements.errorCard.style.display = 'block';
                elements.errorMessage.textContent = error || 'Falha na autenticação. Por favor, tente novamente.';
                break;
        }
    }

    // Formatar número de telefone
    function formatPhoneNumber(phone) {
        if (!phone) return '';
        // Formato brasileiro: +55 (11) 99999-9999
        if (phone.length === 13 && phone.startsWith('55')) {
            return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
        }
        return `+${phone}`;
    }

    // Evento de status do Socket.IO
    socket.on('status', (data) => {
        console.log('Status recebido:', data);
        updateUI(data);
    });

    // Evento de erro
    socket.on('error', (data) => {
        console.error('Erro:', data);
        elements.errorCard.style.display = 'block';
        elements.errorMessage.textContent = data.message || 'Ocorreu um erro inesperado.';
    });

    // Evento de conexão/desconexão do socket
    socket.on('connect', () => {
        console.log('Conectado ao servidor');
    });

    socket.on('disconnect', () => {
        console.log('Desconectado do servidor');
        elements.statusText.textContent = 'Servidor desconectado';
        elements.statusDot.className = 'status-dot disconnected';
    });

    // Botão de desconectar
    elements.disconnectBtn.addEventListener('click', async () => {
        if (!confirm('Tem certeza que deseja desconectar o WhatsApp?')) {
            return;
        }

        elements.disconnectBtn.disabled = true;
        elements.disconnectBtn.innerHTML = '<span class="spinner" style="width:20px;height:20px;margin:0;"></span> Desconectando...';

        try {
            const response = await fetch('/api/disconnect', {
                method: 'POST'
            });
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Erro ao desconectar:', error);
            alert('Erro ao desconectar: ' + error.message);
        } finally {
            elements.disconnectBtn.disabled = false;
            elements.disconnectBtn.innerHTML = '<span class="btn-icon">🔌</span> Desconectar';
        }
    });

    // Buscar status inicial via API (fallback)
    fetch('/api/status')
        .then(res => res.json())
        .then(data => {
            if (data.status) {
                updateUI(data);
            }
        })
        .catch(err => console.error('Erro ao buscar status:', err));
});
