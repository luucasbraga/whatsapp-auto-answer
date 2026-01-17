import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import { handleMessage } from './handlers/messageHandler.js';
import { logger } from './utils/logger.js';
import { cleanLockfile, cleanSessionFolder } from './utils/lockfileHelper.js';

let clientInstance = null;
let ioInstance = null;
let connectionStatus = 'disconnected';
let connectedPhone = null;
let currentQrCode = null;

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
            currentQrCode = qrDataURL;
            emitStatus({ qrCode: qrDataURL });
        } catch (err) {
            logger.error('Erro ao gerar QR Code:', err);
        }
    });

    // Evento: Cliente pronto
    client.on('ready', async () => {
        logger.info('✅ WhatsApp conectado e pronto!');
        connectionStatus = 'connected';
        currentQrCode = null; // Limpar QR code após conexão

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
        currentQrCode = null; // Limpar QR code após autenticação
        emitStatus();
    });

    // Evento: Falha na autenticação
    client.on('auth_failure', (message) => {
        logger.error('❌ Falha na autenticação:', message);
        connectionStatus = 'auth_failure';
        emitStatus({ error: message });
    });

    // Evento: Desconectado
    client.on('disconnected', async (reason) => {
        logger.warn('⚠️ Cliente desconectado:', reason);
        connectionStatus = 'disconnected';
        connectedPhone = null;
        currentQrCode = null;

        // Se for um LOGOUT, tentar limpar o lockfile
        if (reason === 'LOGOUT') {
            try {
                const sessionName = process.env.SESSION_NAME || 'whatsapp-session';
                logger.info('Tentando limpar lockfile após logout...');
                await cleanLockfile(sessionName);
            } catch (error) {
                logger.error('Erro ao limpar lockfile:', error);
            }
        }

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
    const statusObj = {
        status: connectionStatus,
        phone: connectedPhone
    };

    // Incluir QR code se disponível
    if (currentQrCode) {
        statusObj.qrCode = currentQrCode;
    }

    return statusObj;
}

export async function disconnectClient() {
    if (clientInstance) {
        logger.info('Desconectando cliente WhatsApp...');
        const sessionName = process.env.SESSION_NAME || 'whatsapp-session';

        try {
            await clientInstance.logout();
        } catch (error) {
            logger.error('Erro durante logout:', error);

            // Tentar limpar o lockfile manualmente
            if (error.message && error.message.includes('EBUSY')) {
                logger.info('Tentando limpar lockfile manualmente...');
                await cleanLockfile(sessionName);
            }
        }

        connectionStatus = 'disconnected';
        connectedPhone = null;
        emitStatus();
        return true;
    }
    return false;
}

export async function resetSession() {
    if (clientInstance) {
        logger.info('Resetando sessão WhatsApp...');
        const sessionName = process.env.SESSION_NAME || 'whatsapp-session';

        try {
            // Tentar desconectar primeiro
            await clientInstance.destroy();
        } catch (error) {
            logger.error('Erro ao destruir cliente:', error);
        }

        // Limpar a pasta de sessão completamente
        await cleanSessionFolder(sessionName);

        connectionStatus = 'disconnected';
        connectedPhone = null;
        currentQrCode = null;
        clientInstance = null;
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
