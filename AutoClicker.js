import { 
    getLanguage, 
    getAutoClickerUpgradeRate,
    getAutoClickerMultiplierRate
} from './constantsAndGlobalVars.js';
import { updateScoreDisplay } from './game.js';
import { localize } from './localization.js';
import { formatNumber } from './utils/numberFormatter.js';
import { audioManager } from './AudioManager.js';

/**
 * Auto-clicker implementation with delta time
 */
export default class AutoClicker {
    constructor(resource, options = {}) {
        this.id = options.id || 'autoClicker';
        this.baseCost = options.baseCost ?? 15;
        this.costMultiplier = options.costMultiplier ?? 1.13;
        this.displayName = options.displayName || null; // Overrides localized name
        this.description = options.description || 'Coin Makers';
        this.nameKey = options.nameKey || 'autoClicker';
        this.descriptionKey = options.descriptionKey || 'autoClickerDesc';
        this.count = 0;
        this.currentCost = this.baseCost;
        this.purchasesMade = 0; // advances cost progression once per purchase click
        this.initialized = false;
        this.button = null;
        this.resource = resource; // Resource this autoclicker generates
        this.multiplierGetter = options.multiplierGetter || getAutoClickerMultiplierRate;
        
        // Delta time tracking
        this.accumulatedTime = 0;
        this.lastUpdateTime = 0;
        this.lastCoinsAdded = 0;
        this.lastCoinsTime = 0;
        this.coinsPerSecond = 0;
        
        // Store total coins per second and base coins for the description
        this.cachedTotalCPS = 0;
        this.cachedBaseCoins = 0;
        this.currentMultiplier = 1;
        
        // Timing configuration (in seconds)
        this.baseRate = 1.0;           // Coins per second per coin maker
        this.minUpdateInterval = 0.02;  // 50 updates per second max (20ms)
        this.batchThreshold = 50;       // Start batching after 50 coin makers
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

    update(deltaTime) {
        if (this.count <= 0) {
            this.coinsPerSecond = 0;
            this.updateCPSDisplay();
            return;
        }
        
        // Convert deltaTime to seconds
        const deltaSeconds = deltaTime / 1000;
        this.accumulatedTime += deltaSeconds;
        
        // Calculate generated amount per second based on count
        const coinsPerSecond = this.baseRate * this.count;
        
        // Determine maximum time between updates
        let maxFrameTime = this.minUpdateInterval;
        
        // For low autoclicker counts, update more frequently for smoother display
        if (this.count <= this.batchThreshold) {
            // Scale update frequency with autoclicker count
            maxFrameTime = Math.max(1.0 / (this.count * 2), this.minUpdateInterval);
        }
        
        // Process accumulated time in fixed steps for accuracy
        while (this.accumulatedTime >= maxFrameTime) {
            // Calculate coins for this frame
            // The multiplier is only applied at purchase time, not here
            const coinsThisFrame = coinsPerSecond * maxFrameTime;
            
            // Update resource
            if (coinsThisFrame > 0) {
                // Add to resource
                this.resource.add(coinsThisFrame);
                this.lastCoinsAdded += coinsThisFrame;
                // Update score display for coins resource to keep current UI behavior
                if (this.resource?.id === 'coins') {
                    updateScoreDisplay();
                }
            }
            
            this.accumulatedTime -= maxFrameTime;
        }
        
        // Update CPS (Coins Per Second) every second
        const now = Date.now();
        if (now - this.lastCoinsTime >= 1000) {
            this.coinsPerSecond = this.lastCoinsAdded / ((now - this.lastCoinsTime) / 1000);
            this.lastCoinsAdded = 0;
            this.lastCoinsTime = now;
            this.updateCPSDisplay();
        }
    }
    
    // Update the coins per second display
    updateCPSDisplay() {
        const rateElementId = this.resource?.displayRateElementId || 'pointsPerSecond';
        const cpsElement = document.getElementById(rateElementId);
        if (cpsElement) {
            // Additional rate from resource (e.g., manual clicks for coins)
            const additionalRate = typeof this.resource?.getAdditionalRatePerSecond === 'function'
                ? this.resource.getAdditionalRatePerSecond()
                : 0;
            const totalRate = this.coinsPerSecond + additionalRate;
            
            // Format the number
            const formattedTotal = formatNumber(totalRate);
            
            // Update the display
            cpsElement.textContent = `${formattedTotal}/sec`;
            
            // Show detailed breakdown in tooltip if there are multiple sources of income
            if (this.coinsPerSecond > 0 && additionalRate > 0) {
                const formattedAuto = formatNumber(this.coinsPerSecond);
                const formattedAdditional = formatNumber(additionalRate);
                const fromAuto = this.displayName || localize(this.nameKey, getLanguage());
                cpsElement.title = `${formattedAuto} from ${fromAuto} + ${formattedAdditional} from clicks`;
            } else {
                cpsElement.title = '';
            }
        }
    }
    
    reset() {
        this.count = 0;
        this.currentCost = this.baseCost;
        this.purchasesMade = 0;
        this.accumulatedTime = 0;
        this.lastUpdateTime = 0;
        this.lastCoinsAdded = 0;
        this.lastCoinsTime = 0;
        this.coinsPerSecond = 0;
        this.updateButtonState();
        this.updateCPSDisplay();
    }

    updateCachedValues() {
        this.currentMultiplier = Math.max(1, this.multiplierGetter());
        this.cachedBaseCoins = this.count * this.baseRate;
        // Total CPS is just base coins, as multiplier only affects new purchases
        this.cachedTotalCPS = this.cachedBaseCoins;
    }
    
    purchase() {
        const currentScore = this.resource.get();
        const multiplier = Math.max(1, this.multiplierGetter());
        const purchaseCost = this.calculatePurchaseCost(multiplier);
        
        if (currentScore >= purchaseCost) {
            this.resource.set(currentScore - purchaseCost);
            
            // Add the multiplier number of auto-clickers
            this.count += multiplier;
            
            // Advance cost by a single step regardless of batch size
            this.purchasesMade += 1;
            this.currentCost = Math.floor(this.baseCost * Math.pow(this.costMultiplier, this.purchasesMade));
            
            console.log(`Auto-clicker purchased! Added ${multiplier} auto-clickers. New total: ${this.count}`);
            this.updateCachedValues();
            // Immediately refresh CPS display (important for notes/sec UI)
            this.updateCPSDisplay();
            
            // Play upgrade sound on successful purchase
            if (audioManager && !audioManager.muted) {
                audioManager.playFx('upgrade');
            }
            return true;
        }
        return false;
    }
    
    // Calculate the total cost for purchasing 'count' auto-clickers in one click
    // Cost scales once per purchase (not per unit in the batch)
    calculatePurchaseCost(count) {
        const batchSize = Math.max(1, count | 0);
        return Math.floor(this.currentCost * batchSize);
    }

    updateButtonState() {
        if (!this.button) return;
        
        const multiplier = Math.max(1, this.multiplierGetter());
        const purchaseCost = this.calculatePurchaseCost(multiplier);
        const canAfford = this.resource.get() >= purchaseCost;
        
        this.button.disabled = !canAfford;
        this.button.classList.toggle('disabled', !canAfford);
        
        // Get name (prefer explicit displayName, else localization)
        const name = this.displayName || localize(this.nameKey, getLanguage());
        
        // Build description. Prefer localization when available, otherwise simple fallback.
        const totalCpsInt = Math.round(this.cachedTotalCPS);
        const baseCoinsInt = Math.round(this.count * this.baseRate);
        let description;
        try {
            description = localize(this.descriptionKey, getLanguage(), totalCpsInt, baseCoinsInt, multiplier);
        } catch {
            // Fallback description if no localization exists
            const unit = this.resource?.id === 'notes' ? 'note' : 'coin';
            const unitPlural = unit + 's';
            description = `Generates ${totalCpsInt} ${totalCpsInt === 1 ? unit : unitPlural} per second (${baseCoinsInt} base)`;
        }
        
        // Format numbers
        const countText = formatNumber(this.count);
        const costText = formatNumber(purchaseCost);
        
        // Update button text to show only the multiplier value with /s
        this.button.textContent = `+${multiplier}/s`;
        
        // Update header to include cost and keep description clean
        const upgradeItem = this.button.closest('.upgrade-item');
        if (upgradeItem) {
            const headerElement = upgradeItem.querySelector('.upgrade-info h4');
            const descriptionElement = upgradeItem.querySelector('.upgrade-info p');
            
            if (headerElement) {
                headerElement.textContent = `${name} - ${costText}`;
                // Toggle red price color when unaffordable
                headerElement.classList.toggle('price-unaffordable', !canAfford);
            }
            if (descriptionElement) {
                descriptionElement.textContent = description;
            }
        }
    }
}
