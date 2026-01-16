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
