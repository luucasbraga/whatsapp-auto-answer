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

export async function initializeWhatsAppClient(io, retryAttempt = 0) {
    ioInstance = io;

    // Se for uma retry após falha, tentar limpar sessão corrompida
    if (retryAttempt > 0) {
        logger.info('Verificando sessão após falha...');
        const sessionName = process.env.SESSION_NAME || 'whatsapp-session';
        try {
            // Pequeno delay para garantir que recursos foram liberados
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            logger.warn('Erro ao verificar sessão:', error.message);
        }
    }

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
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-blink-features=AutomationControlled',
                '--disable-extensions',
                '--disable-software-rasterizer',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-ipc-flooding-protection',
                '--enable-features=NetworkService,NetworkServiceInProcess'
            ],
            handleSIGINT: false,
            handleSIGTERM: false,
            handleSIGHUP: false,
            timeout: 60000
        },
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
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

    // Evento: Erro de mudança de estado
    client.on('change_state', (state) => {
        logger.info(`Mudança de estado: ${state}`);
    });

    // Capturar erros não tratados do cliente
    client.on('error', (error) => {
        logger.error('Erro no cliente WhatsApp:', error);
        // Não mudar o status aqui para não interferir com outros eventos
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

    // Evento: Erro remoto de sessão
    client.on('remote_session_saved', () => {
        logger.info('Sessão remota salva com sucesso');
    });

    // Iniciar cliente com retry logic
    const maxRetries = 3;

    try {
        logger.info(`Tentativa ${retryAttempt + 1} de ${maxRetries} de inicializar cliente...`);
        await client.initialize();
        logger.info('✅ Cliente inicializado com sucesso');
        clientInstance = client;
        return client;
    } catch (error) {
        logger.error(`❌ Erro ao inicializar cliente (tentativa ${retryAttempt + 1}/${maxRetries}):`, error.message);

        // Se ainda temos tentativas restantes, fazer retry
        if (retryAttempt < maxRetries - 1) {
            const delay = Math.pow(2, retryAttempt + 1) * 1000; // Exponential backoff: 2s, 4s, 8s
            logger.info(`⏳ Aguardando ${delay / 1000}s antes de tentar novamente...`);

            // Tentar limpar recursos antes de retry
            try {
                await client.destroy();
                logger.info('Cliente anterior destruído');
            } catch (destroyError) {
                logger.warn('Aviso ao destruir cliente:', destroyError.message);
            }

            await new Promise(resolve => setTimeout(resolve, delay));

            // Recriar o cliente para a próxima tentativa
            logger.info('🔄 Recriando cliente para nova tentativa...');
            return initializeWhatsAppClient(io, retryAttempt + 1);
        } else {
            // Esgotamos todas as tentativas
            logger.error('💥 Falha ao inicializar cliente após todas as tentativas');
            logger.error('Possíveis soluções:');
            logger.error('1. Verificar se há processos Chrome/Chromium travados');
            logger.error('2. Limpar a pasta .wwebjs_auth manualmente');
            logger.error('3. Reiniciar o sistema');
            throw error;
        }
    }
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
