import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
 * Limpa completamente a pasta de sessão com retry para arquivos bloqueados
 * @param {string} sessionName - Nome da sessão
 * @param {number} maxRetries - Número máximo de tentativas
 * @returns {Promise<boolean>}
 */
export async function cleanSessionFolder(sessionName, maxRetries = 10) {
    const sessionPath = path.join(process.cwd(), '.wwebjs_auth', `session-${sessionName}`);

    if (!fs.existsSync(sessionPath)) {
        logger.info('Pasta de sessão não encontrada');
        return true;
    }

    // Primeiro tentar limpar o lockfile
    await cleanLockfile(sessionName);

    // Aguardar para que processos soltem os arquivos
    await sleep(1000);

    // Tentar remover a pasta com retry robusto
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Tentar remover todos os arquivos recursivamente
            fs.rmSync(sessionPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 1000 });
            logger.info(`✅ Pasta de sessão removida: ${sessionPath}`);
            return true;
        } catch (error) {
            if ((error.code === 'EBUSY' || error.code === 'EPERM') && attempt < maxRetries) {
                const delay = Math.min(1000 * attempt, 5000); // Delay crescente até 5s
                logger.warn(`⚠️ Pasta de sessão ocupada, tentando novamente em ${delay}ms (tentativa ${attempt}/${maxRetries})`);
                await sleep(delay);
            } else if (error.code === 'ENOENT') {
                logger.info('Pasta de sessão já foi removida');
                return true;
            } else if (attempt === maxRetries) {
                logger.error(`❌ Não foi possível remover pasta de sessão após ${maxRetries} tentativas:`, error.message);
                return false;
            }
        }
    }

    return false;
}

/**
 * Aguarda que todos os processos soltem os arquivos da sessão
 * @param {number} maxWaitMs - Tempo máximo de espera em ms
 * @returns {Promise<void>}
 */
export async function waitForFileRelease(maxWaitMs = 10000) {
    logger.info(`Aguardando ${maxWaitMs}ms para processos liberarem arquivos...`);
    await sleep(maxWaitMs);
}

