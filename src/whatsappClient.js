import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import { handleMessage } from './handlers/messageHandler.js';
import { logger } from './utils/logger.js';
import { cleanLockfile, cleanSessionFolder, waitForFileRelease } from './utils/lockfileHelper.js';

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

        // Se for um LOGOUT, aguardar e limpar arquivos de sessão
        if (reason === 'LOGOUT') {
            try {
                const sessionName = process.env.SESSION_NAME || 'whatsapp-session';
                logger.info('Logout detectado, aguardando liberação de arquivos...');

                // Aguardar processos liberarem os arquivos
                await waitForFileRelease(3000);

                // Tentar limpar a sessão completamente
                await cleanSessionFolder(sessionName);
            } catch (error) {
                logger.error('Erro ao limpar sessão após logout:', error);
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
            // Primeiro, destruir o cliente para fechar o Chromium/Puppeteer
            logger.info('Destruindo cliente para liberar recursos...');
            await clientInstance.destroy();

            // Aguardar para que todos os processos liberem os arquivos
            logger.info('Aguardando liberação de locks de arquivo...');
            await waitForFileRelease(5000);

            // Agora limpar manualmente a pasta de sessão
            logger.info('Limpando pasta de sessão...');
            await cleanSessionFolder(sessionName);

            logger.info('✅ Logout concluído com sucesso');
        } catch (error) {
            logger.error('Erro durante logout:', error);

            // Tentar limpar de qualquer forma
            try {
                await waitForFileRelease(3000);
                await cleanSessionFolder(sessionName);
            } catch (cleanupError) {
                logger.error('Erro ao limpar sessão:', cleanupError);
            }
        }

        connectionStatus = 'disconnected';
        connectedPhone = null;
        clientInstance = null;
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
