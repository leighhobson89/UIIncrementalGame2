import { 
    getScore, 
    setScore, 
    getScoreIncrementValue, 
    setScoreIncrementValue,
    getLanguage
} from './constantsAndGlobalVars.js';
import { updateScoreDisplay } from './game.js';
import { localize } from './localization.js';
import { formatNumber } from './utils/numberFormatter.js';
import { updatePriceColors } from './ui.js';
import AutoClicker from './AutoClicker.js';


class Upgrade {
    constructor(id, baseCost, costMultiplier, description, onPurchase) {
        this.id = id;
        this.baseCost = baseCost;
        this.costMultiplier = costMultiplier;
        this.description = description;
        this.onPurchase = onPurchase;
        this.count = 0;
        this.currentCost = baseCost;
        this.button = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        
        this.button = document.getElementById(`${this.id}Btn`);
        if (!this.button) {
            console.error(`Button with ID ${this.id}Btn not found!`);
            return;
        }

        this.button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.purchase();
        });

        this.updateButtonState();
        this.initialized = true;
    }

    purchase() {
        const currentScore = getScore();
        if (currentScore >= this.currentCost) {
            setScore(currentScore - this.currentCost);
            this.count++;
            this.currentCost = Math.floor(this.baseCost * Math.pow(this.costMultiplier, this.count));
            
            if (typeof this.onPurchase === 'function') {
                this.onPurchase(this);
            }
            
            this.updateButtonState();
            updateScoreDisplay();
            return true;
        }
        return false;
    }

    updateButtonState() {
        if (!this.button) return;
        
        const canAfford = getScore() >= this.currentCost;
        this.button.disabled = !canAfford;
        this.button.classList.toggle('disabled', !canAfford);
        
        // Get localized name and description
        const nameKey = this.id === 'betterClicks' ? 'betterClicks' : 'autoClicker';
        const name = localize(nameKey, getLanguage());
        const description = localize(`${nameKey}Desc`, getLanguage());
        
        // Format numbers
        const countText = formatNumber(this.count);
        const costText = formatNumber(this.currentCost);
        
        // Update button text with just name and count
        this.button.textContent = `${name} (${countText})`;
        
        // Update header to include cost and keep description clean
        const upgradeItem = this.button.closest('.upgrade-item');
        if (upgradeItem) {
            const headerElement = upgradeItem.querySelector('.upgrade-info h4');
            const descriptionElement = upgradeItem.querySelector('.upgrade-info p');
            
            if (headerElement) {
                headerElement.textContent = `${name} - ${costText}`;
            }
            if (descriptionElement) {
                descriptionElement.textContent = description;
            }
        }
        
        // Update price colors for all upgrades
        updatePriceColors([betterClicks, autoClicker]);
    }
    
    reset() {
        this.count = 0;
        this.currentCost = this.baseCost;
        this.updateButtonState();
    }
}

// Create better clicks upgrade
const betterClicks = new Upgrade(
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
const autoClicker = new AutoClicker();

// Expose instances globally for reset functionality
if (typeof window !== 'undefined') {
    window.betterClicks = betterClicks;
    window.autoClicker = autoClicker;
}

// Function to update all autoclicker timers (called from game loop)
function updateAutoclickers(deltaTime) {
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
}

export { betterClicks, autoClicker, updateAutoclickers };
