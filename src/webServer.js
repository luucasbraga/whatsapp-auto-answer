import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getConnectionStatus, disconnectClient, resetSession } from './whatsappClient.js';
import { logger } from './utils/logger.js';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Armazenar tokens de sessão em memória (para produção, use Redis ou banco de dados)
const sessions = new Map();

// Gerar token de sessão
function generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Middleware de autenticação
function requireAuth(req, res, next) {
    const token = req.headers.cookie?.split('session_token=')[1]?.split(';')[0];

    if (token && sessions.has(token)) {
        req.user = sessions.get(token);
        next();
    } else {
        res.status(401).json({ success: false, message: 'Não autenticado' });
    }
}

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

    // Middleware para parsear JSON
    app.use(express.json());

    // API: Login
    app.post('/api/login', (req, res) => {
        const { email, password } = req.body;
        const adminEmail = process.env.ADMIN_EMAIL || 'marianamara@admin.com';
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminPassword) {
            logger.error('ADMIN_PASSWORD não configurada no .env');
            return res.status(500).json({
                success: false,
                message: 'Servidor não configurado corretamente'
            });
        }

        if (email === adminEmail && password === adminPassword) {
            const token = generateSessionToken();
            sessions.set(token, { email, loginTime: new Date() });

            // Definir cookie com o token
            res.setHeader('Set-Cookie', `session_token=${token}; HttpOnly; Path=/; Max-Age=86400`);

            logger.info(`Login bem-sucedido: ${email}`);
            res.json({ success: true, message: 'Login bem-sucedido' });
        } else {
            logger.warn(`Tentativa de login falhou: ${email}`);
            res.status(401).json({ success: false, message: 'E-mail ou senha incorretos' });
        }
    });

    // API: Logout
    app.post('/api/logout', (req, res) => {
        const token = req.headers.cookie?.split('session_token=')[1]?.split(';')[0];

        if (token) {
            sessions.delete(token);
        }

        res.setHeader('Set-Cookie', 'session_token=; HttpOnly; Path=/; Max-Age=0');
        res.json({ success: true, message: 'Logout bem-sucedido' });
    });

    // Servir página de login sem autenticação
    app.get('/login', (req, res) => {
        res.sendFile(join(__dirname, '..', 'public', 'login.html'));
    });

    // Middleware para verificar autenticação em rotas protegidas
    app.use((req, res, next) => {
        // Permitir acesso aos arquivos CSS/JS e à rota de login
        if (req.path.startsWith('/css/') ||
            req.path.startsWith('/js/') ||
            req.path === '/login' ||
            req.path === '/api/login') {
            return next();
        }

        // Verificar autenticação
        const token = req.headers.cookie?.split('session_token=')[1]?.split(';')[0];

        if (!token || !sessions.has(token)) {
            // Se for uma requisição de API, retornar 401
            if (req.path.startsWith('/api/')) {
                return res.status(401).json({ success: false, message: 'Não autenticado' });
            }
            // Se for uma página, redirecionar para login
            return res.redirect('/login');
        }

        next();
    });

    // Servir arquivos estáticos (depois do middleware de autenticação)
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

    // API: Resetar sessão (limpa completamente a sessão do WhatsApp)
    app.post('/api/reset-session', async (req, res) => {
        try {
            const result = await resetSession();
            res.json({ success: result, message: result ? 'Sessão resetada com sucesso. Reinicie a aplicação.' : 'Cliente não estava conectado' });
        } catch (error) {
            logger.error('Erro ao resetar sessão:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // Socket.IO: Middleware de autenticação
    io.use((socket, next) => {
        const cookie = socket.handshake.headers.cookie;
        const token = cookie?.split('session_token=')[1]?.split(';')[0];

        if (token && sessions.has(token)) {
            socket.user = sessions.get(token);
            next();
        } else {
            next(new Error('Não autenticado'));
        }
    });

    // Socket.IO: Conexão de clientes da interface
    io.on('connection', (socket) => {
        logger.info(`Dashboard conectado: ${socket.id} (${socket.user.email})`);

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

        // Requisição de reset de sessão via socket
        socket.on('reset-session', async () => {
            try {
                await resetSession();
                socket.emit('session-reset', { message: 'Sessão resetada com sucesso' });
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
