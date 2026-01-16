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

    // Send welcome message
    await message.reply(welcomeText);

    // Small delay before menu
    await delay(parseInt(process.env.WELCOME_DELAY_MS) || 1000);

    // Send menu options
    await message.reply(messages.mainMenu);
}

async function processUserResponse(client, message, session, userMessage, originalMessage) {
    const userId = message.from;

    // Option to return to main menu from any state
    if (userMessage === '0' || userMessage === 'back' || userMessage === 'menu') {
        sessionService.updateState(userId, 'MAIN_MENU');
        await message.reply(messages.mainMenu);
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
            await message.reply(messages.waitingForHuman);
            break;

        default:
            await message.reply(messages.invalidOption);
            await message.reply(messages.mainMenu);
            sessionService.updateState(userId, 'MAIN_MENU');
    }
}

async function handleMainMenuSelection(client, message, session, userMessage) {
    const userId = message.from;
    const option = parseInt(userMessage);

    if (isNaN(option) || option < 1 || option > menuOptions.main.length) {
        await message.reply(messages.invalidOption);
        await message.reply(messages.mainMenu);
        return;
    }

    const selectedOption = menuOptions.main[option - 1];
    logger.info(`📌 User selected: ${selectedOption.title}`);

    // Execute action based on option type
    await executeAction(client, message, session, selectedOption);
}

async function handleUserInput(client, message, session, originalMessage) {
    const userId = message.from;
    const { inputType } = session.context;

    // Log the guest's message for the team to review
    logger.info(`📝 Guest input (${inputType}): ${originalMessage}`);

    // Send confirmation message
    await message.reply(messages.messageReceived);

    await delay(500);

    // Ask if they need anything else
    await message.reply(messages.anythingElse);
    await message.reply(messages.mainMenu);

    // Return to main menu
    sessionService.updateState(userId, 'MAIN_MENU');
}

async function executeAction(client, message, session, option) {
    const userId = message.from;

    switch (option.action) {
        case 'SHOW_INFO':
            // Get the response message from the messages object
            const responseKey = option.response;
            const responseText = messages[responseKey] || messages.infoNotFound;

            await message.reply(responseText);
            await delay(500);
            await message.reply(messages.anythingElse);
            await message.reply(messages.mainMenu);
            sessionService.updateState(userId, 'MAIN_MENU');
            break;

        case 'REQUEST_INPUT':
            // Send the specific message for this option
            const promptKey = option.response;
            const promptText = messages[promptKey] || messages.requestDetails;

            await message.reply(promptText);
            await message.reply(messages.backToMenu);

            sessionService.updateState(userId, 'AWAITING_INPUT', {
                inputType: option.inputType,
                selectedOption: option.id
            });
            break;

        case 'TRANSFER_TO_HUMAN':
            await message.reply(messages.transferToHuman);
            sessionService.updateState(userId, 'TALK_TO_HUMAN');
            break;

        default:
            await message.reply(messages.featureNotAvailable);
            await message.reply(messages.mainMenu);
            sessionService.updateState(userId, 'MAIN_MENU');
    }
}

// Utilities
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
