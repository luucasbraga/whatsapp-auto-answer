import { menuOptions } from '../config/menuOptions.js';

class MenuService {
    /**
     * Build a dynamic main menu from menuOptions
     * Note: For this implementation, the main menu is static in messages.js
     * This service can be used for more complex menu building if needed
     */
    buildMainMenu() {
        let menu = 'How can we help you today?\n\n';

        menuOptions.main.forEach((option, index) => {
            menu += `*${index + 1}-* ${option.emoji} ${option.title}\n`;
            if (option.subtitle) {
                menu += `_${option.subtitle}_\n`;
            }
            menu += '\n';
        });

        menu += 'To reply, simply send the number corresponding to your chosen option.';

        return menu;
    }

    /**
     * Get option by number
     */
    getOptionByNumber(number) {
        const index = number - 1;
        if (index >= 0 && index < menuOptions.main.length) {
            return menuOptions.main[index];
        }
        return null;
    }

    /**
     * Get total number of options
     */
    getOptionsCount() {
        return menuOptions.main.length;
    }
}

export const menuService = new MenuService();
