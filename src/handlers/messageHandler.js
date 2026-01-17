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

    try {
        // Send welcome message with sendSeen option disabled to avoid markedUnread error
        await client.sendMessage(message.from, welcomeText, { sendSeen: false });

        // Small delay before menu
        await delay(parseInt(process.env.WELCOME_DELAY_MS) || 1000);

        // Send menu options
        await client.sendMessage(message.from, messages.mainMenu, { sendSeen: false });
    } catch (error) {
        logger.error('Erro ao enviar mensagem de boas-vindas:', error);
        // Don't rethrow - log and continue to prevent app crash
        return;
    }
}

async function processUserResponse(client, message, session, userMessage, originalMessage) {
    const userId = message.from;

    try {
        // Option to return to main menu from any state
        if (userMessage === '0' || userMessage === 'back' || userMessage === 'menu') {
            sessionService.updateState(userId, 'MAIN_MENU');
            await client.sendMessage(userId, messages.mainMenu, { sendSeen: false });
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
                await client.sendMessage(userId, messages.waitingForHuman, { sendSeen: false });
                break;

            default:
                await client.sendMessage(userId, messages.invalidOption, { sendSeen: false });
                await client.sendMessage(userId, messages.mainMenu, { sendSeen: false });
                sessionService.updateState(userId, 'MAIN_MENU');
        }
    } catch (error) {
        logger.error('Erro ao processar resposta do usuário:', error);
        // Don't rethrow - prevent app crash
        return;
    }
}

async function handleMainMenuSelection(client, message, session, userMessage) {
    const userId = message.from;
    const option = parseInt(userMessage);

    try {
        if (isNaN(option) || option < 1 || option > menuOptions.main.length) {
            await client.sendMessage(userId, messages.invalidOption, { sendSeen: false });
            await client.sendMessage(userId, messages.mainMenu, { sendSeen: false });
            return;
        }

        const selectedOption = menuOptions.main[option - 1];
        logger.info(`📌 User selected: ${selectedOption.title}`);

        // Execute action based on option type
        await executeAction(client, message, session, selectedOption);
    } catch (error) {
        logger.error('Erro ao processar seleção do menu:', error);
        // Don't rethrow - prevent app crash
        return;
    }
}

async function handleUserInput(client, message, session, originalMessage) {
    const userId = message.from;
    const { inputType } = session.context;

    try {
        // Log the guest's message for the team to review
        logger.info(`📝 Guest input (${inputType}): ${originalMessage}`);

        // Send confirmation message
        await client.sendMessage(userId, messages.messageReceived, { sendSeen: false });

        await delay(500);

        // Ask if they need anything else
        await client.sendMessage(userId, messages.anythingElse, { sendSeen: false });

        // Change state to wait for human
        sessionService.updateState(userId, 'TALK_TO_HUMAN');
    } catch (error) {
        logger.error('Erro ao processar input do usuário:', error);
        // Don't rethrow - prevent app crash
        return;
    }
}

async function executeAction(client, message, session, option) {
    const userId = message.from;

    try {
        switch (option.action) {
            case 'SHOW_INFO':
                // Get the response message from the messages object
                const responseKey = option.response;
                const responseText = messages[responseKey] || messages.infoNotFound;

                await client.sendMessage(userId, responseText, { sendSeen: false });
                await delay(500);
                await client.sendMessage(userId, messages.anythingElse, { sendSeen: false });
                sessionService.updateState(userId, 'TALK_TO_HUMAN');
                break;

            case 'REQUEST_INPUT':
                // Send the specific message for this option
                const promptKey = option.response;
                const promptText = messages[promptKey] || messages.requestDetails;

                await client.sendMessage(userId, promptText, { sendSeen: false });
                await client.sendMessage(userId, messages.backToMenu, { sendSeen: false });

                sessionService.updateState(userId, 'AWAITING_INPUT', {
                    inputType: option.inputType,
                    selectedOption: option.id
                });
                break;

            case 'TRANSFER_TO_HUMAN':
                await client.sendMessage(userId, messages.transferToHuman, { sendSeen: false });
                sessionService.updateState(userId, 'TALK_TO_HUMAN');
                break;

            default:
                await client.sendMessage(userId, messages.featureNotAvailable, { sendSeen: false });
                await client.sendMessage(userId, messages.mainMenu, { sendSeen: false });
                sessionService.updateState(userId, 'MAIN_MENU');
        }
    } catch (error) {
        logger.error('Erro ao executar ação:', error);
        // Don't rethrow - prevent app crash
        return;
    }
}

// Utilities
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
