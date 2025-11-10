import {
    getLocalization,
    setLanguage,
    setLocalization,
    setLanguageChangedFlag,
    getLanguageSelected
} from './constantsAndGlobalVars.js';
import { getManualCoinPressMultiplierRate, getCoinAutoClickerMultiplierRate } from './constantsAndGlobalVars.js';

async function fetchLocalization() {
    try {
        const response = await fetch('localization.json');
        if (response.ok) {
            return await response.json();
        }
        throw new Error('Failed to load localization file');
    } catch (error) {
        console.error('Error loading localization:', error);
        return {};
    }
}

export function updateAllElements(language) {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        let translation;
        if (key === 'betterClicksMultiplierDesc') {
            translation = localize(key, language, getManualCoinPressMultiplierRate());
        } else if (key === 'autoClickerMultiplierDesc') {
            translation = localize(key, language, getCoinAutoClickerMultiplierRate());
        } else if (key === 'betterClicksDesc') {
            translation = localize(key, language, 1);
        } else {
            translation = localize(key, language);
        }
        if (translation !== undefined && translation !== null) {
            element.textContent = translation;
        }
    });

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
    console.log('initLocalization called with:', language);
    const localization = await fetchLocalization();
    console.log('Fetched localization data, setting language to:', language);
    setLocalization(localization);
    setLanguage(language);
    setLanguageChangedFlag(true);
    console.log('Before updateAllElements, current language:', getLanguageSelected());
    await updateAllElements(language);
    console.log('After updateAllElements, current language:', getLanguageSelected());
}

export async function changeLanguage(language) {
    setLanguage(language);
    setLanguageChangedFlag(true);
    updateAllElements(language);
}

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
    
    if (localizedString === undefined && language !== 'en' && localization['en']) {
        localizedString = localization['en'][key];
    }

    if (localizedString === undefined) {
        console.warn(`Translation missing for key: ${key}`);
        return key;
    }

    if (typeof localizedString === 'string' && localizedString.includes('${')) {
        try {
            localizedString = interpolateTemplateLiteral(localizedString);
        } catch (e) {
            console.error(`Error evaluating template literal in localized string for key '${key}':`, e);
        }
    }
    
    if (values && values.length > 0) {
        return localizedString.replace(/\{(\d+)\}/g, (match, index) => {
            const valueIndex = parseInt(index, 10);
            return valueIndex < values.length ? values[valueIndex] : match;
        });
    }
    
    return localizedString;
}

function interpolateTemplateLiteral(template) {
    return template.replace(/\$\{(.*?)\}/g, (match, expression) => {
        try {
            const context = {
                count: 0,
                points: 0
            };
            
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