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
