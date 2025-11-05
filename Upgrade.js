import { getScore, setScore, getLanguage, getScoreIncrementValue, getBetterClicksUpgradeRate } from './constantsAndGlobalVars.js';
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

    purchase() {
        const currentScore = getScore();
        if (currentScore >= this.currentCost) {
            setScore(currentScore - this.currentCost);
            this.count++;
            this.currentCost = Math.floor(this.baseCost * Math.pow(this.costMultiplier, this.count));
            
            if (typeof this.onPurchase === 'function') {
                this.onPurchase(this);
            }
            
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
        
        // Get the appropriate value for the description
        let value = 1;
        if (nameKey === 'betterClicks') {
            value = getScoreIncrementValue();
        } else if (nameKey === 'autoClicker') {
            value = 1; // This will be updated when we implement auto-clicker upgrades
        }
        
        // Get localized description with dynamic value
        const description = localize(`${nameKey}Desc`, getLanguage(), value);
        
        // Format numbers
        const countText = formatNumber(this.count);
        const costText = formatNumber(this.currentCost);
        
        // Update button text based on upgrade type
        if (this.id === 'betterClicks') {
            const upgradeRate = getBetterClicksUpgradeRate();
            this.button.textContent = `+ ${upgradeRate}`;
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
