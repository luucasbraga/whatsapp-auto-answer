import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';

/**
 * Tenta remover o lockfile com retry em caso de erro EBUSY
 * @param {string} sessionName - Nome da sessão
 * @param {number} maxRetries - Número máximo de tentativas
 * @param {number} delay - Delay entre tentativas em ms
 * @returns {Promise<boolean>}
 */
export async function cleanLockfile(sessionName, maxRetries = 5, delay = 500) {
    const lockfilePath = path.join(process.cwd(), '.wwebjs_auth', `session-${sessionName}`, 'lockfile');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Verificar se o arquivo existe
            if (fs.existsSync(lockfilePath)) {
                // Tentar remover o lockfile
                fs.unlinkSync(lockfilePath);
                logger.info(`✅ Lockfile removido com sucesso após ${attempt} tentativa(s)`);
                return true;
            } else {
                logger.info('Lockfile não encontrado (já foi removido)');
                return true;
            }
        } catch (error) {
            if (error.code === 'EBUSY' || error.code === 'EPERM') {
                if (attempt < maxRetries) {
                    logger.warn(`⚠️ Lockfile ocupado, tentando novamente em ${delay}ms (tentativa ${attempt}/${maxRetries})`);
                    await sleep(delay);
                    delay *= 2; // Backoff exponencial
                } else {
                    logger.error(`❌ Não foi possível remover lockfile após ${maxRetries} tentativas:`, error.message);
                    return false;
                }
            } else if (error.code === 'ENOENT') {
                // Arquivo não existe, tudo bem
                logger.info('Lockfile não existe (já foi removido)');
                return true;
            } else {
                logger.error('❌ Erro inesperado ao remover lockfile:', error);
                return false;
            }
        }
    }

    return false;
}

/**
 * Limpa completamente a pasta de sessão
 * @param {string} sessionName - Nome da sessão
 * @returns {Promise<boolean>}
 */
export async function cleanSessionFolder(sessionName) {
    const sessionPath = path.join(process.cwd(), '.wwebjs_auth', `session-${sessionName}`);

    try {
        if (fs.existsSync(sessionPath)) {
            // Primeiro tentar limpar o lockfile
            await cleanLockfile(sessionName);

            // Aguardar um pouco
            await sleep(1000);

            // Tentar remover a pasta inteira
            fs.rmSync(sessionPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
            logger.info(`✅ Pasta de sessão removida: ${sessionPath}`);
            return true;
        } else {
            logger.info('Pasta de sessão não encontrada');
            return true;
        }
    } catch (error) {
        logger.error('❌ Erro ao limpar pasta de sessão:', error);
        return false;
    }
}

/**
 * Helper para sleep
 * @param {number} ms - Milissegundos para aguardar
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
