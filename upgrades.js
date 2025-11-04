import { getScore, setScore, getScoreIncrementValue, setScoreIncrementValue, updateScoreDisplay } from './constantsAndGlobalVars.js';
import TimerManager from './timerManager.js';

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
        this.button.textContent = `${this.description} (${this.count}) - ${this.currentCost} points`;
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

// Create auto-clicker upgrade
const autoClicker = new Upgrade(
    'autoClicker',
    15,     // base cost
    1.13,   // cost multiplier
    'Auto-Clicker',
    (upgrade) => {
        // Each autoclicker generates 1 point per second
        const clickInterval = 1000; // 1 second
        
        // Create a unique ID for this autoclicker's timer
        const timerId = `autoclicker_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        // Add a new timer that generates points
        timerManager.createTimer(
            timerId,
            clickInterval,
            () => {
                // This callback runs every second for each autoclicker
                const currentScore = getScore();
                setScore(currentScore + 1);
                updateScoreDisplay();
            },
            {
                autoStart: true,
                loop: true
            }
        );
        
        console.log(`Auto-clicker purchased! Total: ${upgrade.count}`);
        
        // Store the timer ID on the upgrade instance for potential future reference
        if (!upgrade.timerIds) {
            upgrade.timerIds = [];
        }
        upgrade.timerIds.push(timerId);
    }
);

// Function to update all autoclicker timers (called from game loop)
function updateAutoclickers(deltaTime) {
    if (autoClicker.count > 0) {
        timerManager.update(deltaTime);
    }
}

// Initialize all upgrades
export function initUpgrades() {
    betterClicks.init();
    autoClicker.init();
}

export { betterClicks, autoClicker, updateAutoclickers };
