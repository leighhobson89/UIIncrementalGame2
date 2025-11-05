import { getScoreIncrementValue, setScoreIncrementValue } from './constantsAndGlobalVars.js';
import { updatePriceColors } from './ui.js';
import AutoClicker from './AutoClicker.js';
import Upgrade from './Upgrade.js';

// Create better clicks upgrade
export const betterClicks = new Upgrade(
    'betterClicks',
    10,     // base cost
    1.13,   // cost multiplier
    'Better Clicks',
    (upgrade) => {
        const increment = getScoreIncrementValue() + 1;
        setScoreIncrementValue(increment);
        
        // Update description to show new click value
        const upgradeInfo = upgrade.button.closest('.upgrade-item')?.querySelector('.upgrade-info p');
        if (upgradeInfo) {
            upgradeInfo.textContent = `+${increment} points per click`;
        }
    }
);

// Create auto-clicker instance
export const autoClicker = new AutoClicker();

// Function to update price colors for all upgrades
function updateAllPriceColors() {
    updatePriceColors([betterClicks, autoClicker]);
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

// Initialize all upgrades
export function initUpgrades() {
    betterClicks.init();
    autoClicker.init();
    updateAllPriceColors(); // Initial price color update
}