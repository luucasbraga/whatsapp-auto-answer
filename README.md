# whatsapp-auto-answer

## Documentação Técnica para Desenvolvimento

---

## 1. Visão Geral

Este documento descreve a implementação do **whatsapp-auto-answer**, um software em Node.js para responder mensagens automaticamente no WhatsApp. O sistema conecta-se ao WhatsApp Web, monitora mensagens recebidas e responde automaticamente com uma mensagem de boas-vindas seguida de um menu interativo de opções.

O software inclui uma **interface web administrativa** para gerenciamento da conexão, permitindo visualizar o QR Code, monitorar o status e desconectar remotamente.

### 1.1 Funcionalidades Principais

- **Interface Web de Administração** com QR Code e controle de conexão
- Conexão com WhatsApp via QR Code (terminal e web)
- Detecção automática de novas mensagens
- Envio de mensagem de boas-vindas para novos contatos
- Menu interativo com opções selecionáveis
- Gerenciamento de sessão do usuário
- Fluxo de conversação baseado em estados
- Monitoramento de status em tempo real via WebSocket

---

## 2. Stack Tecnológica

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| Node.js | >= 18.x | Runtime JavaScript |
| whatsapp-web.js | 1.23.x | Biblioteca de integração com WhatsApp Web |
| Express | 4.x | Servidor HTTP para interface web |
| Socket.IO | 4.x | Comunicação em tempo real (WebSocket) |
| qrcode | 1.5.x | Geração de QR Code em base64 |
| qrcode-terminal | 0.12.x | Exibição do QR Code no terminal |
| dotenv | 16.x | Gerenciamento de variáveis de ambiente |

### 2.1 Por que whatsapp-web.js?

A biblioteca `whatsapp-web.js` é a opção mais robusta e mantida para integração não-oficial com WhatsApp. Ela utiliza Puppeteer para automatizar o WhatsApp Web, oferecendo:

- API estável e bem documentada
- Suporte a múltiplos tipos de mensagem
- Persistência de sessão
- Comunidade ativa

> **Nota Legal**: Esta é uma API não-oficial. Para uso comercial em larga escala, considere a API oficial do WhatsApp Business.

---

## 3. Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          whatsapp-auto-answer                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         Interface Web (Admin)                          │ │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐ │ │
│  │  │   Express    │───▶│  Socket.IO   │───▶│   Dashboard (Frontend)   │ │ │
│  │  │   Server     │    │   (Real-time)│    │   - QR Code Display      │ │ │
│  │  └──────────────┘    └──────────────┘    │   - Status Monitor       │ │ │
│  │                                           │   - Disconnect Button    │ │ │
│  │                                           └──────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│                                    ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         WhatsApp Bot Core                              │ │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐ │ │
│  │  │   WhatsApp   │───▶│   Message    │───▶│   Conversation           │ │ │
│  │  │   Client     │    │   Handler    │    │   Manager                │ │ │
│  │  └──────────────┘    └──────────────┘    └──────────────────────────┘ │ │
│  │         │                   │                     │                    │ │
│  │         ▼                   ▼                     ▼                    │ │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐ │ │
│  │  │   Session    │    │   Menu       │    │   User Session           │ │ │
│  │  │   Storage    │    │   Builder    │    │   Store                  │ │ │
│  │  └──────────────┘    └──────────────┘    └──────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Componentes

| Componente | Responsabilidade |
|------------|------------------|
| Express Server | Servidor HTTP para interface administrativa |
| Socket.IO | Comunicação em tempo real entre servidor e dashboard |
| Dashboard Frontend | Interface web para QR Code e controle de conexão |
| WhatsApp Client | Conexão e comunicação com WhatsApp Web |
| Message Handler | Processamento e roteamento de mensagens |
| Conversation Manager | Controle do fluxo de conversação |
| Session Storage | Persistência da sessão do WhatsApp |
| Menu Builder | Construção de menus dinâmicos |
| User Session Store | Estado da conversa por usuário |

---

## 4. Estrutura do Projeto

```
whatsapp-auto-answer/
├── src/
│   ├── index.js                 # Ponto de entrada
│   ├── whatsappClient.js        # Configuração do cliente WhatsApp
│   ├── webServer.js             # Servidor Express + Socket.IO
│   ├── handlers/
│   │   └── messageHandler.js    # Processamento de mensagens
│   ├── services/
│   │   ├── menuService.js       # Serviço de menus
│   │   └── sessionService.js    # Gerenciamento de sessões
│   ├── config/
│   │   ├── messages.js          # Mensagens do bot
│   │   └── menuOptions.js       # Opções do menu
│   └── utils/
│       └── logger.js            # Utilitário de logs
├── public/
│   ├── index.html               # Dashboard administrativo
│   ├── css/
│   │   └── style.css            # Estilos da interface
│   └── js/
│       └── app.js               # Lógica do frontend
├── .wwebjs_auth/                # Dados de sessão (gitignore)
├── .env                         # Variáveis de ambiente
├── .env.example                 # Template de variáveis
├── .gitignore
├── package.json
└── README.md
```

---

## 5. Instalação e Configuração

### 5.1 Pré-requisitos

```bash
# Verificar versão do Node.js (requer >= 18)
node --version

# Verificar npm
npm --version
```

### 5.2 Inicialização do Projeto

```bash
# Criar diretório do projeto
mkdir whatsapp-auto-answer
cd whatsapp-auto-answer

# Inicializar projeto Node.js
npm init -y

# Instalar dependências
npm install whatsapp-web.js qrcode qrcode-terminal express socket.io dotenv

# Dependências de desenvolvimento (opcional)
npm install -D nodemon
```

### 5.3 Configuração do package.json

```json
{
  "name": "whatsapp-auto-answer",
  "version": "1.0.0",
  "description": "WhatsApp Auto-Responder Bot with Web Interface",
  "main": "src/index.js",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 5.4 Variáveis de Ambiente (.env)

```env
# Configurações do Bot
BOT_NAME=Assistente Virtual
WELCOME_DELAY_MS=1000

# Configurações do Servidor Web
PORT=3000
HOST=0.0.0.0

# Configurações de Log
LOG_LEVEL=info

# Sessão
SESSION_NAME=whatsapp-session
```

### 5.5 Arquivo .gitignore

```gitignore
# Dependências
node_modules/

# Sessão do WhatsApp
.wwebjs_auth/
.wwebjs_cache/

# Variáveis de ambiente
.env

# Logs
*.log
logs/

# Sistema
.DS_Store
Thumbs.db
```

---

## 6. Implementação

### 6.1 Arquivo Principal (src/index.js)

```javascript
import dotenv from 'dotenv';
import { initializeWhatsAppClient } from './whatsappClient.js';
import { startWebServer } from './webServer.js';
import { logger } from './utils/logger.js';

dotenv.config();

async function main() {
    logger.info('🚀 Iniciando whatsapp-auto-answer...');

    // Iniciar servidor web primeiro
    const { server, io } = await startWebServer();

    // Inicializar cliente WhatsApp passando o Socket.IO
    const client = await initializeWhatsAppClient(io);

    // Graceful shutdown
    const shutdown = async () => {
        logger.info('Encerrando aplicação...');
        await client.destroy();
        server.close();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

main().catch((error) => {
    logger.error('Erro fatal:', error);
    process.exit(1);
});
```

### 6.2 Cliente WhatsApp (src/whatsappClient.js)

```javascript
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import { handleMessage } from './handlers/messageHandler.js';
import { logger } from './utils/logger.js';

let clientInstance = null;
let ioInstance = null;
let connectionStatus = 'disconnected';
let connectedPhone = null;

export async function initializeWhatsAppClient(io) {
    ioInstance = io;

    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: process.env.SESSION_NAME || 'whatsapp-session'
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        }
    });

    // Evento: QR Code gerado
    client.on('qr', async (qr) => {
        logger.info('QR Code gerado');
        connectionStatus = 'awaiting_scan';

        // Exibir no terminal
        qrcode.generate(qr, { small: true });

        // Gerar QR Code em base64 para a interface web
        try {
            const qrDataURL = await QRCode.toDataURL(qr, {
                width: 256,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });
            emitStatus({ qrCode: qrDataURL });
        } catch (err) {
            logger.error('Erro ao gerar QR Code:', err);
        }
    });

    // Evento: Cliente pronto
    client.on('ready', async () => {
        logger.info('✅ WhatsApp conectado e pronto!');
        connectionStatus = 'connected';

        try {
            const info = client.info;
            connectedPhone = info.wid.user;
            logger.info(`📱 Número conectado: ${connectedPhone}`);
            emitStatus({ phone: connectedPhone });
        } catch (err) {
            logger.warn('Não foi possível obter info do telefone');
            emitStatus();
        }
    });

    // Evento: Autenticado
    client.on('authenticated', () => {
        logger.info('🔐 Autenticação bem-sucedida!');
        connectionStatus = 'authenticated';
        emitStatus();
    });

    // Evento: Falha na autenticação
    client.on('auth_failure', (message) => {
        logger.error('❌ Falha na autenticação:', message);
        connectionStatus = 'auth_failure';
        emitStatus({ error: message });
    });

    // Evento: Desconectado
    client.on('disconnected', (reason) => {
        logger.warn('⚠️ Cliente desconectado:', reason);
        connectionStatus = 'disconnected';
        connectedPhone = null;
        emitStatus({ reason });
    });

    // Evento: Carregando
    client.on('loading_screen', (percent, message) => {
        logger.info(`Carregando: ${percent}% - ${message}`);
        connectionStatus = 'loading';
        emitStatus({ loadingPercent: percent, loadingMessage: message });
    });

    // Evento: Mensagem recebida
    client.on('message', async (message) => {
        try {
            await handleMessage(client, message);
        } catch (error) {
            logger.error('Erro ao processar mensagem:', error);
        }
    });

    // Iniciar cliente
    client.initialize();
    clientInstance = client;

    return client;
}

export function getClient() {
    return clientInstance;
}

export function getConnectionStatus() {
    return {
        status: connectionStatus,
        phone: connectedPhone
    };
}

export async function disconnectClient() {
    if (clientInstance) {
        logger.info('Desconectando cliente WhatsApp...');
        await clientInstance.logout();
        connectionStatus = 'disconnected';
        connectedPhone = null;
        emitStatus();
        return true;
    }
    return false;
}

function emitStatus(extra = {}) {
    if (ioInstance) {
        ioInstance.emit('status', {
            status: connectionStatus,
            phone: connectedPhone,
            timestamp: new Date().toISOString(),
            ...extra
        });
    }
}
```

### 6.3 Servidor Web (src/webServer.js)

```javascript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getConnectionStatus, disconnectClient } from './whatsappClient.js';
import { logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function startWebServer() {
    const app = express();
    const server = createServer(app);
    const io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    const PORT = process.env.PORT || 3000;
    const HOST = process.env.HOST || '0.0.0.0';

    // Servir arquivos estáticos
    app.use(express.static(join(__dirname, '..', 'public')));

    // API: Status da conexão
    app.get('/api/status', (req, res) => {
        res.json(getConnectionStatus());
    });

    // API: Desconectar
    app.post('/api/disconnect', async (req, res) => {
        try {
            const result = await disconnectClient();
            res.json({ success: result, message: result ? 'Desconectado com sucesso' : 'Cliente não estava conectado' });
        } catch (error) {
            logger.error('Erro ao desconectar:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // Socket.IO: Conexão de clientes da interface
    io.on('connection', (socket) => {
        logger.info(`Dashboard conectado: ${socket.id}`);

        // Enviar status atual imediatamente
        socket.emit('status', getConnectionStatus());

        // Requisição de desconexão via socket
        socket.on('disconnect-whatsapp', async () => {
            try {
                await disconnectClient();
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        });

        socket.on('disconnect', () => {
            logger.info(`Dashboard desconectado: ${socket.id}`);
        });
    });

    // Iniciar servidor
    return new Promise((resolve) => {
        server.listen(PORT, HOST, () => {
            logger.info(`🌐 Interface web disponível em http://${HOST}:${PORT}`);
            resolve({ server, io });
        });
    });
}
```

### 6.4 Interface Web - HTML (public/index.html)

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>whatsapp-auto-answer | Painel de Controle</title>
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>📱 whatsapp-auto-answer</h1>
            <p class="subtitle">Painel de Controle</p>
        </header>

        <main>
            <!-- Status Card -->
            <div class="card status-card">
                <div class="status-indicator" id="statusIndicator">
                    <span class="status-dot"></span>
                    <span class="status-text" id="statusText">Verificando...</span>
                </div>
                <p class="phone-number" id="phoneNumber"></p>
                <p class="last-update" id="lastUpdate"></p>
            </div>

            <!-- QR Code Card -->
            <div class="card qr-card" id="qrCard">
                <h2>Escaneie o QR Code</h2>
                <p class="qr-instructions">Abra o WhatsApp no seu celular, vá em <strong>Dispositivos Conectados</strong> e escaneie o código abaixo:</p>
                <div class="qr-container" id="qrContainer">
                    <div class="qr-placeholder" id="qrPlaceholder">
                        <div class="spinner"></div>
                        <p>Gerando QR Code...</p>
                    </div>
                    <img id="qrImage" class="qr-image" alt="QR Code" style="display: none;">
                </div>
            </div>

            <!-- Connected Card -->
            <div class="card connected-card" id="connectedCard" style="display: none;">
                <div class="connected-icon">✅</div>
                <h2>WhatsApp Conectado!</h2>
                <p class="connected-phone" id="connectedPhone"></p>
                <p class="connected-info">O bot está ativo e respondendo mensagens automaticamente.</p>
                <button class="btn btn-danger" id="disconnectBtn">
                    <span class="btn-icon">🔌</span>
                    Desconectar
                </button>
            </div>

            <!-- Loading Card -->
            <div class="card loading-card" id="loadingCard" style="display: none;">
                <div class="spinner large"></div>
                <h2 id="loadingTitle">Conectando...</h2>
                <p id="loadingMessage">Aguarde enquanto estabelecemos a conexão</p>
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
            </div>

            <!-- Error Card -->
            <div class="card error-card" id="errorCard" style="display: none;">
                <div class="error-icon">❌</div>
                <h2>Erro de Conexão</h2>
                <p id="errorMessage">Ocorreu um erro durante a conexão.</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    <span class="btn-icon">🔄</span>
                    Tentar Novamente
                </button>
            </div>
        </main>

        <footer>
            <p>whatsapp-auto-answer v1.0.0</p>
        </footer>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script src="/js/app.js"></script>
</body>
</html>
```

### 6.5 Interface Web - CSS (public/css/style.css)

```css
:root {
    --primary-color: #25D366;
    --primary-dark: #128C7E;
    --danger-color: #dc3545;
    --danger-dark: #c82333;
    --background: #f0f2f5;
    --card-bg: #ffffff;
    --text-primary: #1a1a1a;
    --text-secondary: #667781;
    --border-radius: 12px;
    --shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    background: var(--background);
    color: var(--text-primary);
    min-height: 100vh;
    line-height: 1.6;
}

.container {
    max-width: 500px;
    margin: 0 auto;
    padding: 20px;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

header {
    text-align: center;
    padding: 20px 0;
}

header h1 {
    font-size: 1.8rem;
    color: var(--primary-dark);
    margin-bottom: 5px;
}

.subtitle {
    color: var(--text-secondary);
    font-size: 0.95rem;
}

main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.card {
    background: var(--card-bg);
    border-radius: var(--border-radius);
    padding: 24px;
    box-shadow: var(--shadow);
}

/* Status Card */
.status-card {
    text-align: center;
}

.status-indicator {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: #f8f9fa;
    border-radius: 20px;
    margin-bottom: 10px;
}

.status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #6c757d;
    animation: pulse 2s infinite;
}

.status-dot.connected { background: var(--primary-color); }
.status-dot.disconnected { background: #dc3545; }
.status-dot.loading { background: #ffc107; }

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.status-text {
    font-weight: 500;
    font-size: 0.9rem;
}

.phone-number {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--primary-dark);
    margin-top: 5px;
}

.last-update {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin-top: 5px;
}

/* QR Card */
.qr-card {
    text-align: center;
}

.qr-card h2 {
    font-size: 1.2rem;
    margin-bottom: 10px;
}

.qr-instructions {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-bottom: 20px;
}

.qr-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 260px;
    background: #f8f9fa;
    border-radius: 8px;
    padding: 15px;
}

.qr-placeholder {
    text-align: center;
    color: var(--text-secondary);
}

.qr-image {
    max-width: 256px;
    border-radius: 8px;
}

/* Connected Card */
.connected-card {
    text-align: center;
}

.connected-icon {
    font-size: 4rem;
    margin-bottom: 15px;
}

.connected-card h2 {
    color: var(--primary-dark);
    margin-bottom: 10px;
}

.connected-phone {
    font-size: 1.3rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 10px;
}

.connected-info {
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin-bottom: 25px;
}

/* Loading Card */
.loading-card {
    text-align: center;
}

.loading-card h2 {
    margin: 20px 0 10px;
}

.progress-bar {
    width: 100%;
    height: 6px;
    background: #e9ecef;
    border-radius: 3px;
    margin-top: 20px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: var(--primary-color);
    width: 0%;
    transition: width 0.3s ease;
}

/* Error Card */
.error-card {
    text-align: center;
}

.error-icon {
    font-size: 4rem;
    margin-bottom: 15px;
}

.error-card h2 {
    color: var(--danger-color);
    margin-bottom: 10px;
}

/* Spinner */
.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e9ecef;
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 15px;
}

.spinner.large {
    width: 60px;
    height: 60px;
    border-width: 4px;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* Buttons */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 24px;
    font-size: 1rem;
    font-weight: 500;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-primary {
    background: var(--primary-color);
    color: white;
}

.btn-primary:hover {
    background: var(--primary-dark);
}

.btn-danger {
    background: var(--danger-color);
    color: white;
}

.btn-danger:hover {
    background: var(--danger-dark);
}

.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* Footer */
footer {
    text-align: center;
    padding: 20px 0;
    color: var(--text-secondary);
    font-size: 0.85rem;
}

/* Responsive */
@media (max-width: 480px) {
    .container {
        padding: 15px;
    }

    header h1 {
        font-size: 1.5rem;
    }

    .card {
        padding: 20px;
    }
}
```

### 6.6 Interface Web - JavaScript (public/js/app.js)

```javascript
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
```

### 6.2 Handler de Mensagens (src/handlers/messageHandler.js)

```javascript
import { sessionService } from '../services/sessionService.js';
import { menuService } from '../services/menuService.js';
import { messages } from '../config/messages.js';
import { menuOptions } from '../config/menuOptions.js';
import { logger } from '../utils/logger.js';

export async function handleMessage(client, message) {
    // Ignore group messages, status and own messages
    if (message.from.includes('@g.us') || message.from === 'status@broadcast') {
        return;
    }

    // Ignore messages sent by the bot itself
    if (message.fromMe) {
        return;
    }

    const userId = message.from;
    const userMessage = message.body.trim().toLowerCase();
    const originalMessage = message.body.trim();
    const contact = await message.getContact();
    const userName = contact.pushname || 'Guest';

    logger.info(`📩 Message from ${userName} (${userId}): ${message.body}`);

    // Get or create user session
    let session = sessionService.getSession(userId);

    // Check if it's a new user or conversation restart
    if (!session || userMessage === 'menu' || userMessage === 'start' || userMessage === 'hi' || userMessage === 'hello') {
        session = sessionService.createSession(userId, userName);
        await sendWelcomeMessage(client, message, userName);
        return;
    }

    // Process response based on current state
    await processUserResponse(client, message, session, userMessage, originalMessage);
}

async function sendWelcomeMessage(client, message, userName) {
    const welcomeText = messages.welcome(userName);

    // Send welcome message
    await message.reply(welcomeText);

    // Small delay before menu
    await delay(parseInt(process.env.WELCOME_DELAY_MS) || 1000);

    // Send menu options
    await message.reply(messages.mainMenu);
}

async function processUserResponse(client, message, session, userMessage, originalMessage) {
    const userId = message.from;

    // Option to return to main menu from any state
    if (userMessage === '0' || userMessage === 'back' || userMessage === 'menu') {
        sessionService.updateState(userId, 'MAIN_MENU');
        await message.reply(messages.mainMenu);
        return;
    }

    switch (session.state) {
        case 'MAIN_MENU':
            await handleMainMenuSelection(client, message, session, userMessage);
            break;

        case 'AWAITING_INPUT':
            await handleUserInput(client, message, session, originalMessage);
            break;

        case 'TALK_TO_HUMAN':
            // Forward message to human / log for later review
            logger.info(`💬 Guest message (awaiting human): ${originalMessage}`);
            await message.reply(messages.waitingForHuman);
            break;

        default:
            await message.reply(messages.invalidOption);
            await message.reply(messages.mainMenu);
            sessionService.updateState(userId, 'MAIN_MENU');
    }
}

async function handleMainMenuSelection(client, message, session, userMessage) {
    const userId = message.from;
    const option = parseInt(userMessage);

    if (isNaN(option) || option < 1 || option > menuOptions.main.length) {
        await message.reply(messages.invalidOption);
        await message.reply(messages.mainMenu);
        return;
    }

    const selectedOption = menuOptions.main[option - 1];
    logger.info(`📌 User selected: ${selectedOption.title}`);

    // Execute action based on option type
    await executeAction(client, message, session, selectedOption);
}

async function handleUserInput(client, message, session, originalMessage) {
    const userId = message.from;
    const { inputType } = session.context;

    // Log the guest's message for the team to review
    logger.info(`📝 Guest input (${inputType}): ${originalMessage}`);

    // Send confirmation message
    await message.reply(messages.messageReceived);

    await delay(500);

    // Ask if they need anything else
    await message.reply(messages.anythingElse);
    await message.reply(messages.mainMenu);

    // Return to main menu
    sessionService.updateState(userId, 'MAIN_MENU');
}

async function executeAction(client, message, session, option) {
    const userId = message.from;

    switch (option.action) {
        case 'SHOW_INFO':
            // Get the response message from the messages object
            const responseKey = option.response;
            const responseText = messages[responseKey] || messages.infoNotFound;
            
            await message.reply(responseText);
            await delay(500);
            await message.reply(messages.anythingElse);
            await message.reply(messages.mainMenu);
            sessionService.updateState(userId, 'MAIN_MENU');
            break;

        case 'REQUEST_INPUT':
            // Send the specific message for this option
            const promptKey = option.response;
            const promptText = messages[promptKey] || messages.requestDetails;
            
            await message.reply(promptText);
            await message.reply(messages.backToMenu);
            
            sessionService.updateState(userId, 'AWAITING_INPUT', { 
                inputType: option.inputType,
                selectedOption: option.id
            });
            break;

        case 'TRANSFER_TO_HUMAN':
            await message.reply(messages.transferToHuman);
            sessionService.updateState(userId, 'TALK_TO_HUMAN');
            break;

        default:
            await message.reply(messages.featureNotAvailable);
            await message.reply(messages.mainMenu);
            sessionService.updateState(userId, 'MAIN_MENU');
    }
}

// Utilities
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 6.3 Serviço de Sessão (src/services/sessionService.js)

```javascript
class SessionService {
    constructor() {
        this.sessions = new Map();
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutos
    }

    createSession(userId, userName) {
        const session = {
            id: userId,
            userName: userName,
            state: 'MAIN_MENU',
            context: {},
            createdAt: new Date(),
            lastActivity: new Date()
        };

        this.sessions.set(userId, session);
        this.scheduleTimeout(userId);

        return session;
    }

    getSession(userId) {
        const session = this.sessions.get(userId);

        if (session) {
            // Verificar se sessão expirou
            const now = new Date();
            const elapsed = now - session.lastActivity;

            if (elapsed > this.sessionTimeout) {
                this.deleteSession(userId);
                return null;
            }

            // Atualizar última atividade
            session.lastActivity = now;
        }

        return session;
    }

    updateState(userId, newState, context = {}) {
        const session = this.sessions.get(userId);

        if (session) {
            session.state = newState;
            session.context = { ...session.context, ...context };
            session.lastActivity = new Date();
        }

        return session;
    }

    deleteSession(userId) {
        this.sessions.delete(userId);
    }

    scheduleTimeout(userId) {
        setTimeout(() => {
            const session = this.sessions.get(userId);
            if (session) {
                const now = new Date();
                const elapsed = now - session.lastActivity;

                if (elapsed >= this.sessionTimeout) {
                    this.deleteSession(userId);
                }
            }
        }, this.sessionTimeout);
    }

    getAllSessions() {
        return Array.from(this.sessions.values());
    }
}

export const sessionService = new SessionService();
```

### 6.4 Serviço de Menu (src/services/menuService.js)

```javascript
import { menuOptions } from '../config/menuOptions.js';

class MenuService {
    /**
     * Build a dynamic main menu from menuOptions
     * Note: For this implementation, the main menu is static in messages.js
     * This service can be used for more complex menu building if needed
     */
    buildMainMenu() {
        let menu = 'How can we help you today?\n\n';

        menuOptions.main.forEach((option, index) => {
            menu += `*${index + 1}-* ${option.emoji} ${option.title}\n`;
            if (option.subtitle) {
                menu += `_${option.subtitle}_\n`;
            }
            menu += '\n';
        });

        menu += 'To reply, simply send the number corresponding to your chosen option.';

        return menu;
    }

    /**
     * Get option by number
     */
    getOptionByNumber(number) {
        const index = number - 1;
        if (index >= 0 && index < menuOptions.main.length) {
            return menuOptions.main[index];
        }
        return null;
    }

    /**
     * Get total number of options
     */
    getOptionsCount() {
        return menuOptions.main.length;
    }
}

export const menuService = new MenuService();
```

### 6.5 Configuração de Mensagens (src/config/messages.js)

```javascript
export const messages = {
    welcome: (userName) => `
Hello, *${userName}*! 👋

Welcome to our guest support service.

How can we help you today?
    `.trim(),

    mainMenu: `
*1-* 📅 Instant booking
_I want to book now_

*2-* ⏰ Early check-in / Late check-out
_Check availability_

*3-* 🎉 Special occasion
_Let us know if you're celebrating something special_

*4-* 🚗 Parking information
_Parking details and availability_

*5-* ✏️ Change my reservation
_I need to modify my booking_

*6-* ❓ I have a question
_I have another enquiry_

To reply, simply send the number corresponding to your chosen option.
    `.trim(),

    invalidOption: '❌ Invalid option. Please send only the *number* of the option you want.',

    error: '⚠️ An error occurred. Let\'s go back to the main menu.',

    anythingElse: 'Is there anything else I can help you with?',

    infoNotFound: 'ℹ️ Information not available at the moment.',

    featureNotAvailable: '🚧 This feature is still under development.',

    // Option 1: Instant Booking
    instantBooking: `
📅 *Instant Booking*

Your reservation is confirmed automatically.

You will receive all the important information 24h before your check in, including:
• Reservation confirmation
• Check-in and check-out times
• Codes, address and all information needed for check in

Everything is sent automatically to make your experience smooth and easy. ✨
    `.trim(),

    // Option 2: Early Check-in / Late Check-out
    earlyLateCheckout: `
⏰ *Early Check-in or Late Check-out*

The availability of early check-in or late check-out depends on whether we have another guest on the same day.

*Early check-in:*
You're welcome to drop your luggage from 1:00 PM.

*Late check-out:*
This is subject to availability, depending on the next check-in.

📌 Please make sure to check with us *24 hours before* check-in or check-out so we can confirm availability.
    `.trim(),

    // Option 3: Special Occasion
    specialOccasion: `
🎉 *Special Occasion*

Are you celebrating a special occasion?

Let us know the occasion and any special requests.
We will do our best to make your stay even more memorable. ✨

Please type your message below:
    `.trim(),

    // Option 4: Parking Information
    parkingInfo: `
🚗 *Parking Information*

Most of our properties are central and for this reason do not have parking available.

For accurate information, please tell us the name of the property you will be staying at.
We will be happy to assist you.

💡 *Tip:* There is free street parking after 8pm and pay & display during the day in some roads. However, there is an app that you can download called *'Just Park'* - it will tell you the available spaces to rent by the hour or day in your area. Check it out! 😉
    `.trim(),

    // Option 5: Change Reservation
    changeReservation: `
✏️ *I Need to Change My Reservation*

To assist you, we need to understand:
• The reason for the change
• What you would like to modify in your reservation
• Your full name and reservation dates

⚠️ *Important:*
Any changes must be requested at least *7 days in advance*.
Unfortunately, we are unable to make changes within 7 days of check-in.

Please type your request below:
    `.trim(),

    // Option 6: General Question
    generalQuestion: `
❓ *I Have a Question*

Please write your question below.
How can we help you?
    `.trim(),

    // Awaiting guest input
    requestPropertyName: '🏠 Please tell us the *name of the property* you will be staying at:',

    requestDetails: '📝 Please provide the details of your request:',

    messageReceived: '✅ Thank you! Your message has been received. Our team will get back to you shortly.',

    transferToHuman: `
👤 *Connecting you to our team*

Please wait a moment, one of our team members will respond to you shortly.

⏰ *Response time:*
We typically respond within a few hours during business hours.
    `.trim(),

    waitingForHuman: '⏳ You are in the queue. Please wait...',

    goodbye: (userName) => `
👋 Thank you for contacting us, *${userName}*!

We hope you have a wonderful stay.
See you soon!

_Type "menu" at any time to start a new conversation._
    `.trim(),

    backToMenu: '_Type *0* to go back to the main menu._'
};
```

### 6.6 Configuração de Opções do Menu (src/config/menuOptions.js)

```javascript
export const menuOptions = {
    main: [
        {
            id: 'instant_booking',
            title: 'Instant booking',
            subtitle: 'I want to book now',
            emoji: '📅',
            action: 'SHOW_INFO',
            response: 'instantBooking'
        },
        {
            id: 'early_late_checkout',
            title: 'Early check-in / Late check-out',
            subtitle: 'Check availability',
            emoji: '⏰',
            action: 'SHOW_INFO',
            response: 'earlyLateCheckout'
        },
        {
            id: 'special_occasion',
            title: 'Special occasion',
            subtitle: 'Let us know if you\'re celebrating something special',
            emoji: '🎉',
            action: 'REQUEST_INPUT',
            response: 'specialOccasion',
            inputType: 'special_request'
        },
        {
            id: 'parking',
            title: 'Parking information',
            subtitle: 'Parking details and availability',
            emoji: '🚗',
            action: 'SHOW_INFO',
            response: 'parkingInfo'
        },
        {
            id: 'change_reservation',
            title: 'Change my reservation',
            subtitle: 'I need to modify my booking',
            emoji: '✏️',
            action: 'REQUEST_INPUT',
            response: 'changeReservation',
            inputType: 'reservation_change'
        },
        {
            id: 'question',
            title: 'I have a question',
            subtitle: 'I have another enquiry',
            emoji: '❓',
            action: 'REQUEST_INPUT',
            response: 'generalQuestion',
            inputType: 'general_question'
        }
    ]
};
```

### 6.7 Utilitário de Logger (src/utils/logger.js)

```javascript
const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL] ?? LOG_LEVELS.info;

function formatTimestamp() {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

export const logger = {
    error: (...args) => {
        if (currentLevel >= LOG_LEVELS.error) {
            console.error(`[${formatTimestamp()}] [ERROR]`, ...args);
        }
    },

    warn: (...args) => {
        if (currentLevel >= LOG_LEVELS.warn) {
            console.warn(`[${formatTimestamp()}] [WARN]`, ...args);
        }
    },

    info: (...args) => {
        if (currentLevel >= LOG_LEVELS.info) {
            console.log(`[${formatTimestamp()}] [INFO]`, ...args);
        }
    },

    debug: (...args) => {
        if (currentLevel >= LOG_LEVELS.debug) {
            console.log(`[${formatTimestamp()}] [DEBUG]`, ...args);
        }
    }
};
```

---

## 7. Conversation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      CONVERSATION FLOW                           │
└─────────────────────────────────────────────────────────────────┘

        ┌──────────────┐
        │    Guest     │
        │    Sends     │
        │   Message    │
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐     Yes     ┌──────────────┐
        │   Is new     │────────────▶│    Send      │
        │   guest?     │             │   Welcome    │
        └──────┬───────┘             └──────┬───────┘
               │ No                         │
               │                            │
               ▼                            ▼
        ┌──────────────┐             ┌──────────────┐
        │    Check     │             │    Show      │
        │   Session    │             │    Menu      │
        │    State     │             │              │
        └──────┬───────┘             └──────┬───────┘
               │                            │
               ▼                            │
        ┌──────────────┐                    │
        │   Process    │◀───────────────────┘
        │   Response   │
        └──────┬───────┘
               │
       ┌───────┴───────────────┬───────────────┐
       ▼                       ▼               ▼
┌──────────────┐       ┌──────────────┐ ┌──────────────┐
│  Show Info   │       │   Await      │ │   Forward    │
│  (Options    │       │   Guest      │ │   to Human   │
│   1,2,4)     │       │   Input      │ │              │
└──────────────┘       │  (Options    │ └──────────────┘
                       │   3,5,6)     │
                       └──────────────┘
```

### 7.1 Menu Options Flow

| Option | Action | Next State |
|--------|--------|------------|
| 1 - Instant booking | Show info → Return to menu | MAIN_MENU |
| 2 - Early/Late check | Show info → Return to menu | MAIN_MENU |
| 3 - Special occasion | Request input → Wait for message | AWAITING_INPUT |
| 4 - Parking info | Show info → Return to menu | MAIN_MENU |
| 5 - Change reservation | Request input → Wait for message | AWAITING_INPUT |
| 6 - Question | Request input → Wait for message | AWAITING_INPUT |

---

## 8. Session States

| State | Description | Next Possible States |
|-------|-------------|---------------------|
| `MAIN_MENU` | Guest viewing main menu | `AWAITING_INPUT`, `TALK_TO_HUMAN` |
| `AWAITING_INPUT` | Waiting for guest to type a message | `MAIN_MENU` |
| `TALK_TO_HUMAN` | Forwarded to human support | `MAIN_MENU` (manual reset) |

---

## 9. Execução

### 9.1 Primeira Execução

```bash
# Executar o bot
npm start

# Ou em modo desenvolvimento
npm run dev
```

O servidor web iniciará automaticamente. Acesse a interface administrativa:

```
http://localhost:3000
```

Você verá o QR Code na interface web. Escaneie-o com o WhatsApp no seu celular:
1. Abra o WhatsApp
2. Vá em **Configurações > Dispositivos Conectados**
3. Toque em **Conectar um Dispositivo**
4. Escaneie o QR Code exibido na interface

### 9.2 Interface Web

A interface administrativa oferece:

| Funcionalidade | Descrição |
|----------------|-----------|
| **QR Code** | Exibido automaticamente quando não há conexão |
| **Status em Tempo Real** | Indicador visual do estado da conexão |
| **Número Conectado** | Exibe o número do WhatsApp quando conectado |
| **Botão Desconectar** | Permite desconectar remotamente |

### 9.3 Acessando de Outro Dispositivo

Para acessar a interface de outro dispositivo na mesma rede:

1. Descubra o IP do servidor: `hostname -I`
2. Acesse: `http://[IP_DO_SERVIDOR]:3000`

Para acesso externo (internet), configure:
- Port forwarding no roteador
- Ou utilize um túnel como ngrok: `ngrok http 3000`

### 9.4 Execuções Subsequentes

Após a primeira autenticação, a sessão é salva localmente em `.wwebjs_auth/`. O bot reconectará automaticamente sem necessidade de escanear o QR Code novamente.

Se precisar reconectar com outro número:
1. Clique em **Desconectar** na interface
2. Delete a pasta `.wwebjs_auth/`
3. Reinicie o servidor
4. Escaneie o novo QR Code

---

## 10. Testing

### 10.1 Testing the Bot

1. Start the bot and scan the QR Code
2. From another phone or WhatsApp Web, send a message to the connected number
3. The bot should respond with the welcome message and menu

### 10.2 Test Scenarios

| Scenario | Input | Expected Result |
|----------|-------|-----------------|
| New conversation | Any message | Welcome + Menu |
| Valid option | "1" | Instant Booking info + Menu |
| Valid option | "2" | Early/Late checkout info + Menu |
| Input request | "3" | Special occasion prompt |
| Valid option | "4" | Parking info + Menu |
| Input request | "5" | Change reservation prompt |
| Input request | "6" | Question prompt |
| Invalid option | "abc" | Error message + Menu |
| Invalid option | "7" | Error message + Menu |
| Back to menu | "0" | Main menu |
| Restart | "menu" | Welcome + Menu |
| Guest input | (after option 3,5,6) | Confirmation + Menu |

### 10.3 Sample Conversation

```
Guest: Hi
Bot: Hello, *John*! 👋
     Welcome to our guest support service.
     How can we help you today?

Bot: *1-* 📅 Instant booking
     _I want to book now_
     
     *2-* ⏰ Early check-in / Late check-out
     ...

Guest: 2
Bot: ⏰ *Early Check-in or Late Check-out*
     The availability of early check-in or late check-out...
     
Bot: Is there anything else I can help you with?

Bot: *1-* 📅 Instant booking
     ...

Guest: 3
Bot: 🎉 *Special Occasion*
     Are you celebrating a special occasion?
     ...
     
Bot: _Type *0* to go back to the main menu._

Guest: It's my wife's birthday, can you arrange flowers?
Bot: ✅ Thank you! Your message has been received...

Bot: Is there anything else I can help you with?
```

---

## 11. Deploy em Produção

### 11.1 Considerações

- Utilize um VPS ou servidor dedicado (não serverless)
- Configure PM2 ou similar para gerenciamento de processos
- Implemente monitoramento e alertas
- Configure backups da pasta `.wwebjs_auth/`
- Configure HTTPS para a interface web (recomendado)

### 11.2 Exemplo com PM2

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar aplicação
pm2 start src/index.js --name whatsapp-auto-answer

# Configurar início automático
pm2 startup
pm2 save

# Monitorar logs
pm2 logs whatsapp-auto-answer

# Verificar status
pm2 status

# Reiniciar aplicação
pm2 restart whatsapp-auto-answer
```

### 11.3 Configuração do PM2 (ecosystem.config.js)

```javascript
module.exports = {
    apps: [{
        name: 'whatsapp-auto-answer',
        script: 'src/index.js',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '500M',
        env: {
            NODE_ENV: 'production',
            PORT: 3000
        },
        error_file: 'logs/error.log',
        out_file: 'logs/out.log',
        log_file: 'logs/combined.log',
        time: true
    }]
};
```

### 11.4 Nginx como Proxy Reverso (Opcional)

Para servir com HTTPS e domínio próprio:

```nginx
server {
    listen 80;
    server_name whatsapp.seudominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name whatsapp.seudominio.com;

    ssl_certificate /etc/letsencrypt/live/whatsapp.seudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/whatsapp.seudominio.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 11.5 Dockerfile

```dockerfile
FROM node:18-slim

# Instalar dependências do Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Expor porta da interface web
EXPOSE 3000

CMD ["node", "src/index.js"]
```

### 11.6 Docker Compose

```yaml
version: '3.8'

services:
  whatsapp-bot:
    build: .
    container_name: whatsapp-auto-answer
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./.wwebjs_auth:/app/.wwebjs_auth
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOST=0.0.0.0
      - BOT_NAME=Assistente Virtual
      - SESSION_NAME=whatsapp-session
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 11.7 Executar com Docker

```bash
# Build da imagem
docker build -t whatsapp-auto-answer .

# Executar container
docker run -d \
  --name whatsapp-auto-answer \
  -p 3000:3000 \
  -v $(pwd)/.wwebjs_auth:/app/.wwebjs_auth \
  whatsapp-auto-answer

# Ou com Docker Compose
docker-compose up -d

# Verificar logs
docker logs -f whatsapp-auto-answer
```

---

## 12. Troubleshooting

### 12.1 Problemas Comuns

| Problema | Causa Provável | Solução |
|----------|----------------|---------|
| QR Code não aparece | Sessão corrompida | Deletar pasta `.wwebjs_auth/` |
| Bot não responde | Erro de conexão | Verificar logs, reiniciar |
| Mensagens duplicadas | Múltiplas instâncias | Garantir única instância |
| Timeout em produção | Recursos insuficientes | Aumentar memória/CPU |
| Interface web não carrega | Porta ocupada | Verificar se porta 3000 está livre |
| Socket.IO não conecta | Firewall/proxy | Verificar configurações de rede |
| QR Code expira rápido | Conexão lenta | Aumentar timeout, melhorar internet |

### 12.2 Logs de Debug

```bash
# Habilitar logs detalhados
LOG_LEVEL=debug npm start

# Ver logs do PM2
pm2 logs whatsapp-auto-answer --lines 100

# Ver logs do Docker
docker logs -f --tail 100 whatsapp-auto-answer
```

### 12.3 Resetar Sessão Completamente

```bash
# Parar o serviço
pm2 stop whatsapp-auto-answer

# Remover dados de sessão
rm -rf .wwebjs_auth/
rm -rf .wwebjs_cache/

# Reiniciar
pm2 start whatsapp-auto-answer
```

### 12.4 Verificar Conexão WebSocket

Abra o console do navegador (F12) na interface web e verifique:
- Conexão Socket.IO estabelecida
- Eventos de status sendo recebidos
- Erros de CORS ou conexão

---

## 13. Segurança

### 13.1 Recomendações

- **Não exponha** a interface web diretamente na internet sem autenticação
- Utilize **HTTPS** em produção
- Configure um **firewall** para limitar acesso à porta 3000
- Considere adicionar **autenticação básica** na interface:

```javascript
// Exemplo de autenticação básica no Express
import basicAuth from 'express-basic-auth';

app.use(basicAuth({
    users: { 'admin': process.env.ADMIN_PASSWORD },
    challenge: true,
    realm: 'whatsapp-auto-answer'
}));
```

### 13.2 Variáveis Sensíveis

Nunca commite arquivos `.env` ou a pasta `.wwebjs_auth/` no repositório.

---

## 14. Melhorias Futuras

- [ ] Autenticação na interface web
- [ ] Dashboard com estatísticas de mensagens
- [ ] Integração com banco de dados (MongoDB/PostgreSQL)
- [ ] Painel administrativo completo
- [ ] Múltiplos atendentes
- [ ] Integração com CRM
- [ ] Envio de mídia (imagens, documentos)
- [ ] Respostas com botões nativos (requer API Business)
- [ ] Analytics e relatórios
- [ ] Fila de atendimento com priorização
- [ ] Backup automático de sessão
- [ ] Notificações por email/Telegram quando desconectar

---

## 15. Referências

- [whatsapp-web.js Documentation](https://wwebjs.dev/)
- [Socket.IO Documentation](https://socket.io/docs/)
- [Express.js Documentation](https://expressjs.com/)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)

---

*Documentação do whatsapp-auto-answer v1.0.0 | Última atualização: Janeiro 2025*
