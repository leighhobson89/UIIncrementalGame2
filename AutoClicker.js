import { 
    getScore, 
    setScore, 
    getLanguage, 
    getAutoClickerUpgradeRate,
    getAutoClickerMultiplierRate
} from './constantsAndGlobalVars.js';
import { updateScoreDisplay, getManualClickRate } from './game.js';
import { localize } from './localization.js';
import { formatNumber } from './utils/numberFormatter.js';
import { audioManager } from './AudioManager.js';

/**
 * Auto-clicker implementation with delta time
 */
export default class AutoClicker {
    constructor() {
        this.id = 'autoClicker';
        this.baseCost = 15;
        this.costMultiplier = 1.13;
        this.description = 'Auto-Clicker';
        this.count = 0;
        this.currentCost = this.baseCost;
        this.initialized = false;
        this.button = null;
        
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
        this.baseRate = 1.0;           // Points per second per autoclicker
        this.minUpdateInterval = 0.02;  // 50 updates per second max (20ms)
        this.batchThreshold = 50;       // Start batching after 50 autoclickers
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
                const currentScore = getScore();
                setScore(currentScore + pointsThisFrame);
                this.lastPointsAdded += pointsThisFrame;
                updateScoreDisplay();
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
        const ppsElement = document.getElementById('pointsPerSecond');
        if (ppsElement) {
            // Get manual click rate from global state
            const manualRate = getManualClickRate();
            const totalRate = this.pointsPerSecond + manualRate;
            
            // Format the numbers
            const formattedTotal = formatNumber(totalRate);
            let displayText = `${formattedTotal}/sec`;
            
            if (this.pointsPerSecond > 0 && manualRate > 0) {
                const formattedAuto = formatNumber(this.pointsPerSecond);
                const formattedManual = formatNumber(manualRate);
                displayText += ` (${formattedAuto} auto + ${formattedManual} click)`;
            }
            ppsElement.textContent = displayText;
        }
    }
    
    reset() {
        this.count = 0;
        this.currentCost = this.baseCost;
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
        const currentScore = getScore();
        const multiplier = Math.max(1, getAutoClickerMultiplierRate());
        const purchaseCost = this.calculatePurchaseCost(multiplier);
        
        if (currentScore >= purchaseCost) {
            setScore(currentScore - purchaseCost);
            
            // Add the multiplier number of auto-clickers
            this.count += multiplier;
            
            // Update the cost for the next purchase
            this.currentCost = Math.floor(this.baseCost * Math.pow(this.costMultiplier, this.count));
            
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
    
    // Calculate the total cost for purchasing 'count' auto-clickers
    calculatePurchaseCost(count) {
        // Calculate the sum of costs for each auto-clicker in the batch
        let totalCost = 0;
        for (let i = 0; i < count; i++) {
            totalCost += Math.floor(this.baseCost * Math.pow(this.costMultiplier, this.count + i));
        }
        return totalCost;
    }

    updateButtonState() {
        if (!this.button) return;
        
        const multiplier = Math.max(1, getAutoClickerMultiplierRate());
        const purchaseCost = this.calculatePurchaseCost(multiplier);
        const canAfford = getScore() >= purchaseCost;
        
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
            }
            if (descriptionElement) {
                descriptionElement.textContent = description;
            }
        }
    }
}
