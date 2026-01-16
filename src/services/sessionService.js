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
