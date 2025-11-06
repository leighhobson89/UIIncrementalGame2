import { 
    getCoinsIncrementValue as getScoreIncrementValue, 
    setCoinsIncrementValue as setScoreIncrementValue,
    getBetterClicksMultiplierRate,
    setBetterClicksMultiplierRate,
    getAutoClickerMultiplierRate,
    setAutoClickerMultiplierRate,
    getAutoNotesMultiplierRate,
    setAutoNotesMultiplierRate
} from './constantsAndGlobalVars.js';
import { updatePriceColors } from './ui.js';
import AutoClicker from './AutoClicker.js';
import Upgrade from './Upgrade.js';
import { coinResource } from './resources/CoinResource.js';
import { noteResource } from './resources/NoteResource.js';

// Create better clicks upgrade
export const betterClicks = new Upgrade(
    'betterClicks',
    10,     // base cost
    1.13,   // cost multiplier
    'Better Clicks',
    () => {
        const currentValue = getScoreIncrementValue();
        const increment = getBetterClicksMultiplierRate();
        setScoreIncrementValue(currentValue + increment);
    }
);

// (moved below with other multiplier declarations)

// Create coin auto-clicker instance
export const autoClicker = new AutoClicker(coinResource, {
    id: 'autoClicker',
    nameKey: 'autoClicker',
    descriptionKey: 'autoClickerDesc',
});

// Create note auto-clicker instance
export const noteAutoClicker = new AutoClicker(noteResource, {
    id: 'noteAutoClicker',
    nameKey: 'noteAutoClicker',
    descriptionKey: 'noteAutoClickerDesc',
    multiplierGetter: getAutoNotesMultiplierRate,
});

// Create auto-clicker multiplier upgrade
export const autoClickerMultiplier = new Upgrade(
    'autoClickerMultiplier',
    100,    // base cost
    1.2,    // cost multiplier
    'Auto-Clicker Multiplier',
    () => {
        const currentRate = getAutoClickerMultiplierRate();
        setAutoClickerMultiplierRate(currentRate + 1);
        // After changing multiplier, refresh autoclicker button state using its custom logic
        try { autoClicker.updateButtonState(); } catch {}
    }
);

// Create note auto-clicker multiplier upgrade
export const noteAutoClickerMultiplier = new Upgrade(
    'noteAutoClickerMultiplier',
    150,    // base cost
    1.2,    // cost multiplier
    'Note Maker Machine',
    () => {
        const currentRate = getAutoNotesMultiplierRate();
        setAutoNotesMultiplierRate(currentRate + 1);
        // After changing multiplier, refresh note autoclicker button state
        try { noteAutoClicker.updateButtonState(); } catch {}
    }
);

// Create better clicks multiplier upgrade
export const betterClicksMultiplier = new Upgrade(
    'betterClicksMultiplier',
    150,    // base cost
    1.15,   // cost multiplier
    'Better Clicks Multiplier',
    () => {
        const currentRate = getBetterClicksMultiplierRate();
        setBetterClicksMultiplierRate(currentRate + 1);
    }
);

// Function to update price colors for all upgrades
function updateAllPriceColors() {
    // Exclude autoClicker because its affordability uses batch cost logic
    updatePriceColors([betterClicks, betterClicksMultiplier, autoClickerMultiplier, noteAutoClickerMultiplier]);
}

// Override the updateButtonState method to include price color updates
const originalUpdateButtonState = Upgrade.prototype.updateButtonState;
Upgrade.prototype.updateButtonState = function() {
    originalUpdateButtonState.call(this);
    updateAllPriceColors();
};

// Expose instances globally for reset functionality
if (typeof window !== 'undefined') {
    window.betterClicks = betterClicks;
    window.autoClicker = autoClicker;
    window.noteAutoClicker = noteAutoClicker;
}

// Function to update all autoclicker timers (called from game loop)
export function updateAutoclickers(deltaTime) {
    autoClicker.update(deltaTime);
    noteAutoClicker.update(deltaTime);
}

// Export a function to get current CPS (Coins Per Second)
export function getCoinsPerSecond() {
    return autoClicker.coinsPerSecond;
}

// Export a function to refresh all upgrade UI texts (useful after language changes)
export function refreshUpgradeUI() {
    try {
        betterClicks.updateButtonState();
        betterClicksMultiplier.updateButtonState();
        autoClicker.updateButtonState();
        autoClickerMultiplier.updateButtonState();
        noteAutoClicker.updateButtonState();
        noteAutoClickerMultiplier.updateButtonState();
    } catch (e) {
        console.warn('refreshUpgradeUI: could not update all upgrades', e);
    }
}

// Initialize all upgrades
export function initUpgrades() {
    betterClicks.init();
    betterClicksMultiplier.init();
    autoClicker.init();
    autoClickerMultiplier.init();
    noteAutoClicker.init();
    noteAutoClickerMultiplier.init();
    updateAllPriceColors(); // Initial price color update
}