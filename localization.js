import {
    getLanguage,
    getLocalization,
    setLanguage,
    setLocalization,
    setLanguageChangedFlag,
    getLanguageChangedFlag
} from './constantsAndGlobalVars.js';
import { getBetterClicksMultiplierRate, getAutoClickerMultiplierRate } from './constantsAndGlobalVars.js';

let localizationData = {};

// Default translations in case the JSON file fails to load
const defaultTranslations = {
    en: {
        gameTitle: "Wealth Inc.",
        newGame: "New Game",
        resumeGame: "Resume Game",
        loadGame: "Load Game",
        saveGame: "Save Game",
        copyStringToFile: "Copy String To A Text File:",
        load: "Load",
        copy: "Copy",
        close: "Close",
        points: "Coins:",
        pointsPerSecond: "Coins Per Second:",
        selectTheme: "Select theme",
        clickMe: "Click Me!",
        upgrades: "Upgrades",
        autoClickers: "Auto Clickers",
        autoClicker: "Coin Makers",
        autoClickerDesc: "Generates 1 coin per second",
        betterClicks: "Better Clicks",
        betterClicksDesc: "+1 coin per click",
        buy: "Buy",
        points: "coins",
        autoClickerMultiplier: "Coin Maker Machine",
        autoClickerMultiplierDesc: "Machines",
        english: "English",
        spanish: "Español",
        german: "Deutsch",
        italian: "Italiano",
        french: "Français"
    },
    // Other languages will be loaded from the JSON file
};

async function fetchLocalization() {
    try {
        const response = await fetch('localization.json');
        if (response.ok) {
            const data = await response.json();
            // Merge with default translations to ensure all keys exist
            Object.keys(defaultTranslations.en).forEach(key => {
                if (!data.en) data.en = {};
                if (!data.en[key]) {
                    data.en[key] = defaultTranslations.en[key];
                }
            });
            return data;
        }
        throw new Error('Failed to load localization file');
    } catch (error) {
        console.error('Error loading localization:', error);
        return defaultTranslations;
    }
}

// Update all elements with data-i18n attributes
export function updateAllElements(language) {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        // Inject dynamic values for specific keys that require placeholders
        let translation;
        if (key === 'betterClicksMultiplierDesc') {
            translation = localize(key, language, getBetterClicksMultiplierRate());
        } else if (key === 'autoClickerMultiplierDesc') {
            translation = localize(key, language, getAutoClickerMultiplierRate());
        } else if (key === 'betterClicksDesc') {
            // better clicks uses increment value
            // Value is substituted elsewhere too, but keep consistent on language refresh
            // avoid importing setter chain; fallback to existing content if needed
            translation = localize(key, language, 1);
        } else {
            translation = localize(key, language);
        }
        if (translation !== undefined && translation !== null) {
            element.textContent = translation;
        }
    });

    // Update title attributes
    const titleElements = document.querySelectorAll('[data-i18n-title]');
    titleElements.forEach(element => {
        const key = element.getAttribute('data-i18n-title');
        const translation = localize(key, language);
        if (translation) {
            element.setAttribute('title', translation);
        }
    });
}

export async function initLocalization(language = 'en') {
    const localization = await fetchLocalization();
    setLocalization(localization);
    setLanguage(language);
    updateAllElements(language);
}

// Change language and update all elements
export function changeLanguage(language) {
    setLanguage(language);
    setLanguageChangedFlag(true);
    updateAllElements(language);
}

/**
 * Localize a string with optional placeholder values
 * @param {string} key - The localization key
 * @param {string} [language='en'] - The language code
 * @param {...*} values - Values to replace {0}, {1}, etc. placeholders
 * @returns {string} The localized string with placeholders replaced
 */
function localize(key, language = 'en', ...values) {
    const localization = getLocalization();
    if (!localization) {
        console.warn('Localization data not loaded yet');
        return key;
    }

    const langData = localization[language] || localization['en'];
    if (!langData) {
        console.warn(`No localization data for language: ${language}`);
        return key;
    }

    let localizedString = langData[key];
    
    // Fallback to English if the key is missing in the current language
    if (localizedString === undefined && language !== 'en' && localization['en']) {
        localizedString = localization['en'][key];
    }

    // If still not found, use the key itself
    if (localizedString === undefined) {
        console.warn(`Translation missing for key: ${key}`);
        return key;
    }

    // Handle template literals if present
    if (typeof localizedString === 'string' && localizedString.includes('${')) {
        try {
            localizedString = interpolateTemplateLiteral(localizedString);
        } catch (e) {
            console.error(`Error evaluating template literal in localized string for key '${key}':`, e);
        }
    }
    
    // Replace {0}, {1}, etc. with provided values
    if (values && values.length > 0) {
        return localizedString.replace(/\{(\d+)\}/g, (match, index) => {
            const valueIndex = parseInt(index, 10);
            return valueIndex < values.length ? values[valueIndex] : match;
        });
    }
    
    return localizedString;
}

function interpolateTemplateLiteral(template) {
    return template.replace(/\${(.*?)}/g, (match, expression) => {
        try {
            // Create a context with common variables that might be used in templates
            const context = {
                count: 0, // Could be set based on the context
                points: 0,
                // Add more context variables as needed
            };
            
            // Evaluate the expression in the context
            const value = new Function(...Object.keys(context), `return ${expression}`)(...Object.values(context));
            return String(value);
        } catch (e) {
            console.error(`Error evaluating expression '${expression}' in template literal:`, e);
            return match;
        }
    });
}

export {
    localize
};