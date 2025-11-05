import { 
    getScoreIncrementValue, 
    setScoreIncrementValue,
    getBetterClicksMultiplierRate,
    setBetterClicksMultiplierRate,
    getAutoClickerMultiplierRate,
    setAutoClickerMultiplierRate
} from './constantsAndGlobalVars.js';
import { updatePriceColors } from './ui.js';
import AutoClicker from './AutoClicker.js';
import Upgrade from './Upgrade.js';

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

// Create auto-clicker instance
export const autoClicker = new AutoClicker();

// Create auto-clicker multiplier upgrade
export const autoClickerMultiplier = new Upgrade(
    'autoClickerMultiplier',
    100,    // base cost
    1.2,    // cost multiplier
    'Auto-Clicker Multiplier',
    () => {
        const currentRate = getAutoClickerMultiplierRate();
        setAutoClickerMultiplierRate(currentRate + 1);
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
    updatePriceColors([betterClicks, betterClicksMultiplier, autoClicker, autoClickerMultiplier]);
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
}

// Function to update all autoclicker timers (called from game loop)
export function updateAutoclickers(deltaTime) {
    autoClicker.update(deltaTime);
}

// Export a function to get current PPS
export function getPointsPerSecond() {
    return autoClicker.pointsPerSecond;
}

// Export a function to refresh all upgrade UI texts (useful after language changes)
export function refreshUpgradeUI() {
    try {
        betterClicks.updateButtonState();
        betterClicksMultiplier.updateButtonState();
        autoClicker.updateButtonState();
        autoClickerMultiplier.updateButtonState();
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
    betterClicks.init();
    autoClicker.init();
    updateAllPriceColors(); // Initial price color update
}