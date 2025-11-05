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
        let pointsPerSecond = this.baseRate * this.count;
        
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
            const multiplier = getAutoClickerMultiplierRate();
            const pointsThisFrame = pointsPerSecond * multiplier * maxFrameTime;
            
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

    purchase() {
        const currentScore = getScore();
        if (currentScore >= this.currentCost) {
            setScore(currentScore - this.currentCost);
            this.count++;
            this.currentCost = Math.floor(this.baseCost * Math.pow(this.costMultiplier, this.count));
            console.log(`Auto-clicker purchased! Total: ${this.count}`);
            // No need to update timer with delta time approach
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
        const name = localize('autoClicker', getLanguage());
        
        // Calculate points per second for the description
        const multiplier = getAutoClickerMultiplierRate();
        const basePoints = this.count * this.baseRate;
        const pointsPerSecond = basePoints * multiplier;
        
        // Get localized description with dynamic value
        const description = localize('autoClickerDesc', getLanguage(), 
            pointsPerSecond,  // {0} - Total points per second
            basePoints,      // {1} - Base points before multiplier
            multiplier       // {2} - Multiplier value
        );
        
        // Format numbers
        const countText = formatNumber(this.count);
        const costText = formatNumber(this.currentCost);
        
        // Update button text to show rate per second
        const upgradeRate = getAutoClickerUpgradeRate();
        this.button.textContent = `+ ${upgradeRate}/s`;
        
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
