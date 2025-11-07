import { 
    getCoins as getScore, 
    setCoins as setScore, 
    getLanguage, 
    getCoinsIncrementValue as getScoreIncrementValue, 
    getManualCoinPressMultiplierRate,
    getCoinAutoClickerMultiplierRate,
    getAutoNotesMultiplierRate
} from './constantsAndGlobalVars.js';
import { audioManager } from './AudioManager.js';
import { updateScoreDisplay } from './game.js';
import { localize } from './localization.js';
import { formatNumber } from './utils/numberFormatter.js';

export default class Upgrade {
    constructor(id, baseCost, costMultiplier, description, onPurchase, repeatable = true, nameKey = null) {
        // Store the original ID without 'Btn' suffix for data attributes
        this.id = id.endsWith('Btn') ? id.replace('Btn', '') : id;
        this.baseCost = baseCost;
        this.costMultiplier = costMultiplier;
        this.description = description;
        this.onPurchase = onPurchase;
        this.repeatable = repeatable;
        this.nameKey = nameKey || this.id; // Use provided nameKey or fallback to id for upgrades that are non repeatable currently
        this.count = 0;
        this.currentCost = baseCost;
        this.button = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        
        // Check if the ID already ends with 'Btn' to avoid duplicating it
        const buttonId = this.id.endsWith('Btn') ? this.id : `${this.id}Btn`;
        this.button = document.getElementById(buttonId);
        if (!this.button) {
            console.error(`Button with ID ${buttonId} not found!`);
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
        const isMaxed = !this.repeatable && this.count > 0;
        const upgradeContainer = this.button.closest('.upgrade-item');
        
        if (isMaxed && upgradeContainer) {
            // For non-repeatable upgrades that have been purchased
            this.button.style.display = 'none';
            upgradeContainer.classList.add('purchased');
            
            // Add checkmark icon
            let checkmark = upgradeContainer.querySelector('.purchased-checkmark');
            if (!checkmark) {
                checkmark = document.createElement('span');
                checkmark.className = 'purchased-checkmark';
                checkmark.textContent = '✓';
                upgradeContainer.appendChild(checkmark); // Append to container instead of upgrade-info
            }
            
            // Set up the fade out animation and removal
            setTimeout(() => {
                upgradeContainer.style.animation = 'fadeOutUpgrade 1s forwards';
                
                // Remove the element after the animation completes
                upgradeContainer.addEventListener('animationend', function onAnimationEnd() {
                    upgradeContainer.remove();
                }, { once: true });
            }, 4000); // Start fade out after 4 seconds
            
            // Update header to show "(bought)" instead of price
            const headerElement = upgradeContainer.querySelector('.upgrade-info h4');
            const priceElement = upgradeContainer.querySelector('.upgrade-price');
            
            if (headerElement) {
                const name = this.displayName || localize(this.nameKey, getLanguage());
                // Always use the localized name directly to avoid undefined
                headerElement.innerHTML = `${name} - <span class="bought-text">${localize('bought', getLanguage())}</span>`;
                headerElement.style.color = ''; // Let CSS handle the color
            }
            
            // Hide the separate price element if it exists
            if (priceElement) {
                priceElement.style.display = 'none';
            }
            
            return; // Skip the rest of the function for purchased non-repeatable upgrades
        } else if (upgradeContainer) {
            // Reset to default state if not purchased
            upgradeContainer.classList.remove('purchased');
            this.button.style.display = '';
        }
        
        // For repeatable upgrades or unpurchased non-repeatable ones
        this.button.disabled = !canAfford;
        this.button.classList.toggle('disabled', !canAfford);
        
        // Get the correct name key and value based on upgrade type
        let nameKey = this.id;
        let value = 1;
        
        // Set the appropriate value for each upgrade type
        if (this.id === 'betterClicks') {
            value = getScoreIncrementValue();
        } else if (this.id === 'betterClicksMultiplier') {
            value = getManualCoinPressMultiplierRate();
            nameKey = 'betterClicksMultiplier';
        } else if (this.id === 'autoClickerMultiplier') {
            value = getCoinAutoClickerMultiplierRate();
            nameKey = 'autoClickerMultiplier';
        } else if (this.id === 'noteAutoClickerMultiplier') {
            value = getAutoNotesMultiplierRate();
            nameKey = 'noteAutoClickerMultiplier';
        } else if (this.id === 'autoClicker') {
            value = 1; // Auto-clicker value is handled in its own class
        }
        
        // Get localized name and description
        const name = localize(nameKey, getLanguage());
        // For multiplier upgrades, include the current multiplier rate in the description
        let description;
        if (this.id === 'betterClicksMultiplier') {
            const multiplier = getManualCoinPressMultiplierRate();
            description = localize(`${nameKey}Desc`, getLanguage(), multiplier);
        } else if (this.id === 'autoClickerMultiplier') {
            const multiplier = getCoinAutoClickerMultiplierRate();
            description = localize(`${nameKey}Desc`, getLanguage(), multiplier);
        } else if (this.id === 'noteAutoClickerMultiplier') {
            const multiplier = getAutoNotesMultiplierRate();
            description = localize(`${nameKey}Desc`, getLanguage(), multiplier);
        } else {
            description = localize(`${nameKey}Desc`, getLanguage(), value);
        }
        
        // Format numbers
        const countText = formatNumber(this.count);
        const costText = formatNumber(this.currentCost);
        
        // Update button text based on upgrade type
        if (this.id === 'betterClicks') {
            const multiplier = getManualCoinPressMultiplierRate();
            this.button.textContent = `+ ${multiplier}`;
        } else if (this.id === 'betterClicksMultiplier' || this.id === 'autoClickerMultiplier' || this.id === 'noteAutoClickerMultiplier') {
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
