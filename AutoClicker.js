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
    constructor(resource) {
        this.id = 'autoClicker';
        this.baseCost = 15;
        this.costMultiplier = 1.13;
        this.description = 'Coin Makers';
        this.count = 0;
        this.currentCost = this.baseCost;
        this.purchasesMade = 0; // advances cost progression once per purchase click
        this.initialized = false;
        this.button = null;
        this.resource = resource; // Resource this autoclicker generates
        
        // Delta time tracking
        this.accumulatedTime = 0;
        this.lastUpdateTime = 0;
        this.lastPointsAdded = 0;
        this.lastPointsTime = 0;
        this.pointsPerSecond = 0;
        
        // Store total points per second and base points for the description
        this.cachedTotalPPS = 0;
        this.cachedBasePoints = 0;
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
            this.pointsPerSecond = 0;
            this.updatePPSDisplay();
            return;
        }
        
        // Convert deltaTime to seconds
        const deltaSeconds = deltaTime / 1000;
        this.accumulatedTime += deltaSeconds;
        
        // Calculate points per second based on count
        // Each auto-clicker generates baseRate points per second
        const pointsPerSecond = this.baseRate * this.count;
        
        // Determine maximum time between updates
        let maxFrameTime = this.minUpdateInterval;
        
        // For low autoclicker counts, update more frequently for smoother display
        if (this.count <= this.batchThreshold) {
            // Scale update frequency with autoclicker count
            maxFrameTime = Math.max(1.0 / (this.count * 2), this.minUpdateInterval);
        }
        
        // Process accumulated time in fixed steps for accuracy
        while (this.accumulatedTime >= maxFrameTime) {
            // Calculate points for this frame
            // The multiplier is only applied at purchase time, not here
            const pointsThisFrame = pointsPerSecond * maxFrameTime;
            
            // Update score
            if (pointsThisFrame > 0) {
                // Add to resource
                this.resource.add(pointsThisFrame);
                this.lastPointsAdded += pointsThisFrame;
                // Update score display for points resource to keep current UI behavior
                if (this.resource?.id === 'points') {
                    updateScoreDisplay();
                }
            }
            
            this.accumulatedTime -= maxFrameTime;
        }
        
        // Update PPS every second
        const now = Date.now();
        if (now - this.lastPointsTime >= 1000) {
            this.pointsPerSecond = this.lastPointsAdded / ((now - this.lastPointsTime) / 1000);
            this.lastPointsAdded = 0;
            this.lastPointsTime = now;
            this.updatePPSDisplay();
        }
    }
    
    // Update the points per second display
    updatePPSDisplay() {
        const rateElementId = this.resource?.displayRateElementId || 'pointsPerSecond';
        const ppsElement = document.getElementById(rateElementId);
        if (ppsElement) {
            // Additional rate from resource (e.g., manual clicks for points)
            const additionalRate = typeof this.resource?.getAdditionalRatePerSecond === 'function'
                ? this.resource.getAdditionalRatePerSecond()
                : 0;
            const totalRate = this.pointsPerSecond + additionalRate;
            
            // Format the number
            const formattedTotal = formatNumber(totalRate);
            
            // Update only the numeric part of the content
            const perSecondSpan = ppsElement.querySelector('.per-second');
            if (perSecondSpan) {
                ppsElement.textContent = formattedTotal;
                ppsElement.appendChild(perSecondSpan);
            } else {
                ppsElement.textContent = formattedTotal;
            }
            
            // Show detailed breakdown in tooltip if there are multiple sources of income
            if (this.pointsPerSecond > 0 && additionalRate > 0) {
                const formattedAuto = formatNumber(this.pointsPerSecond);
                const formattedAdditional = formatNumber(additionalRate);
                ppsElement.title = `${formattedAuto} from Coin Makers + ${formattedAdditional} from clicks`;
            } else {
                ppsElement.removeAttribute('title');
            }
        }
    }
    
    reset() {
        this.count = 0;
        this.currentCost = this.baseCost;
        this.purchasesMade = 0;
        this.accumulatedTime = 0;
        this.lastUpdateTime = 0;
        this.lastPointsAdded = 0;
        this.lastPointsTime = 0;
        this.pointsPerSecond = 0;
        this.updateButtonState();
        this.updatePPSDisplay();
    }

    updateCachedValues() {
        this.currentMultiplier = getAutoClickerMultiplierRate();
        this.cachedBasePoints = this.count * this.baseRate;
        // Total PPS is just base points, as multiplier only affects new purchases
        this.cachedTotalPPS = this.cachedBasePoints;
    }
    
    purchase() {
        const currentScore = this.resource.get();
        const multiplier = Math.max(1, getAutoClickerMultiplierRate());
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
        
        const multiplier = Math.max(1, getAutoClickerMultiplierRate());
        const purchaseCost = this.calculatePurchaseCost(multiplier);
        const canAfford = this.resource.get() >= purchaseCost;
        
        this.button.disabled = !canAfford;
        this.button.classList.toggle('disabled', !canAfford);
        
        // Get localized name and description
        const name = localize('autoClicker', getLanguage());
        
        // Get localized description
        const totalPpsInt = Math.round(this.cachedTotalPPS);
        const basePointsInt = Math.round(this.count * this.baseRate);
        const description = localize('autoClickerDesc', getLanguage(), 
            totalPpsInt,          // {0} - Total points per second (integer)
            basePointsInt,        // {1} - Base points (integer)
            multiplier            // {2} - Current purchase multiplier
        );
        
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
