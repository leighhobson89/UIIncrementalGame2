import { 
    getScore, 
    setScore, 
    getLanguage, 
    getScoreIncrementValue, 
    getBetterClicksMultiplierRate,
    getAutoClickerMultiplierRate
} from './constantsAndGlobalVars.js';
import { audioManager } from './AudioManager.js';
import { updateScoreDisplay } from './game.js';
import { localize } from './localization.js';
import { formatNumber } from './utils/numberFormatter.js';

export default class Upgrade {
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
            this.updateButtonState();
            updateScoreDisplay();
        });

        this.updateButtonState();
        this.initialized = true;
    }

    canAfford() {
        return getScore() >= this.currentCost;
    }

    purchase() {
        if (this.canAfford()) {
            const currentScore = getScore();
            setScore(currentScore - this.currentCost);
            this.count++;
            this.currentCost = Math.floor(this.baseCost * Math.pow(this.costMultiplier, this.count));
            if (typeof this.onPurchase === 'function') {
                this.onPurchase(this);
            }
            this.updateButtonState();
            
            // Play upgrade sound
            audioManager.playFx('upgrade');
            return true;
        }
        return false;
    }

    updateButtonState() {
        if (!this.button) return;
        
        const canAfford = getScore() >= this.currentCost;
        this.button.disabled = !canAfford;
        this.button.classList.toggle('disabled', !canAfford);
        
        // Get the correct name key and value based on upgrade type
        let nameKey = this.id;
        let value = 1;
        
        // Set the appropriate value for each upgrade type
        if (this.id === 'betterClicks') {
            value = getScoreIncrementValue();
        } else if (this.id === 'betterClicksMultiplier') {
            value = getBetterClicksMultiplierRate();
            nameKey = 'betterClicksMultiplier';
        } else if (this.id === 'autoClickerMultiplier') {
            value = getAutoClickerMultiplierRate();
            nameKey = 'autoClickerMultiplier';
        } else if (this.id === 'autoClicker') {
            value = 1; // Auto-clicker value is handled in its own class
        }
        
        // Get localized name and description
        const name = localize(nameKey, getLanguage());
        // For multiplier upgrades, include the current multiplier rate in the description
        let description;
        if (this.id === 'betterClicksMultiplier') {
            const multiplier = getBetterClicksMultiplierRate();
            description = localize(`${nameKey}Desc`, getLanguage()).replace('value shown', multiplier);
        } else if (this.id === 'autoClickerMultiplier') {
            const multiplier = getAutoClickerMultiplierRate();
            description = localize(`${nameKey}Desc`, getLanguage()).replace('value shown', multiplier);
        } else {
            description = localize(`${nameKey}Desc`, getLanguage(), value);
        }
        
        // Format numbers
        const countText = formatNumber(this.count);
        const costText = formatNumber(this.currentCost);
        
        // Update button text based on upgrade type
        if (this.id === 'betterClicks') {
            const multiplier = getBetterClicksMultiplierRate();
            this.button.textContent = `+ ${multiplier}`;
        } else if (this.id === 'betterClicksMultiplier' || this.id === 'autoClickerMultiplier') {
            this.button.textContent = `× ${value}`;
        } else {
            this.button.textContent = `${name} (${countText})`;
        }
        
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
    }
    
    reset() {
        this.count = 0;
        this.currentCost = this.baseCost;
        this.updateButtonState();
    }
}
