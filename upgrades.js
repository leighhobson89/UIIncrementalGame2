import { 
    getScore, 
    setScore, 
    getScoreIncrementValue, 
    setScoreIncrementValue, 
    updateScoreDisplay,
    getManualClickRate,
    getLanguage
} from './constantsAndGlobalVars.js';
import TimerManager from './timerManager.js';
import { localize } from './localization.js';

// Create a single TimerManager instance for all timers
const timerManager = new TimerManager();

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
        
        // Get localized description
        const descriptionKey = this.id === 'betterClicks' ? 'betterClicks' : 'autoClicker';
        const description = localize(descriptionKey, getLanguage());
        
        // Get localized points text
        const pointsText = localize('points', getLanguage());
        
        this.button.textContent = `${description} (${this.count}) - ${this.currentCost} ${pointsText}`;
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

// Auto-clicker implementation with delta time
class AutoClicker {
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
            
            let displayText = `${totalRate.toFixed(1)}/sec`;
            if (this.pointsPerSecond > 0 && manualRate > 0) {
                displayText += ` (${this.pointsPerSecond.toFixed(1)} auto + ${manualRate.toFixed(1)} click)`;
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
        
        const currentScore = getScore();
        const canAfford = currentScore >= this.currentCost;
        
        // Get localized description
        const description = localize('autoClicker', getLanguage());
        
        // Get localized points text
        const pointsText = localize('points', getLanguage());
        
        this.button.textContent = `${description} (${this.count}) - ${this.currentCost} ${pointsText}`;
        this.button.disabled = !canAfford;
        this.button.classList.toggle('disabled', !canAfford);
    }
}

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
    
    // Update timer manager if needed for other timers
    if (autoClicker.count > 0) {
        timerManager.update(deltaTime);
    }
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
