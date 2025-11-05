import { localize } from './localization.js';
import { 
    setGameStateVariable, 
    getMenuState, 
    getGameActive,
    getElements, 
    getLanguage, 
    getGameInProgress, 
    gameState,
    getScore,
    setScore,
    getScoreIncrementValue,
    getClickTimestamps,
    setClickTimestamps,
    getClickRateWindow,
    setLastClickTime
} from './constantsAndGlobalVars.js';
import { testNumberFormatter, formatNumber } from './utils/numberFormatter.js'; //call in console
import { 
    initUpgrades, 
    betterClicks, 
    autoClicker, 
    betterClicksMultiplier, 
    autoClickerMultiplier 
} from './upgrades.js';
import { audioManager } from './AudioManager.js';

// Game timing
let lastTime = 0;
const fixedTimeStep = 1000 / 60; // 60 FPS

//--------------------------------------------------------------------------------------------------------

export function startGame() {
    // Initialize all upgrades
    initUpgrades();
    
    // Initialize new upgrade buttons
    document.getElementById('betterClicksMultiplierBtn')?.addEventListener('click', () => betterClicksMultiplier.purchase());
    document.getElementById('autoClickerMultiplierBtn')?.addEventListener('click', () => autoClickerMultiplier.purchase());
    
    // Store the click handler reference and main clicker element at module level
let clickHandler = null;
let mainClicker = null;

// Create a single click handler function
function createClickHandler() {
    return function(event) {
        const currentScore = getScore();
        const increment = getScoreIncrementValue();
        setScore(currentScore + increment);
        
        // Track the click and get current click rate
        trackManualClick();
        
        // Play coin jingle sound
        audioManager.playFx('coinJingle');
        
        // Add click animation
        this.classList.add('clicked');
        setTimeout(() => {
            this.classList.remove('clicked');
        }, 100);

        // Create multiple coins based on the score increment (max 8 per click)
        const coinCount = Math.min(8, Math.max(1, Math.floor(getScoreIncrementValue())));
        const coinOverlay = document.getElementById('coinOverlay');
        
        for (let i = 0; i < coinCount; i++) {
            const coin = document.createElement('img');
            coin.src = 'assets/images/coin.png';
            coin.className = 'coin-animation';
            
            // Position the coin at the click location (relative to viewport)
            // Add some randomness to the position
            const offsetX = (Math.random() - 0.5) * 40;
            const offsetY = (Math.random() - 0.5) * 40;
            coin.style.left = `${event.clientX + offsetX}px`;
            coin.style.top = `${event.clientY + offsetY}px`;
            
            // Randomly choose left or right direction with some variation
            const direction = Math.random() > 0.5 ? 'Right' : 'Left';
            coin.style.animationName = `coinFly${direction}`;
            
            // Randomize animation duration slightly for more natural look
            const duration = 1 + Math.random() * 0.5; // 1s to 1.5s
            coin.style.animationDuration = `${duration}s`;
            
            // Add the coin to the overlay
            coinOverlay.appendChild(coin);
            
            // Remove the coin after animation completes
            setTimeout(() => {
                if (coin.parentNode === coinOverlay) {
                    coinOverlay.removeChild(coin);
                }
            }, duration * 1000);
        }
    };
}

// Set up the click handler with proper cleanup
function setupClickHandler() {
    // Clean up any existing handler first
    cleanupClickHandler();
    
    // Get the clicker element
    mainClicker = document.getElementById('mainClicker');
    if (!mainClicker) return;
    
    // Create and store the new click handler
    clickHandler = createClickHandler();
    
    // Add the event listener
    mainClicker.addEventListener('click', clickHandler);
}

// Clean up the click handler
function cleanupClickHandler() {
    if (mainClicker && clickHandler) {
        // Remove the event listener
        mainClicker.removeEventListener('click', clickHandler);
        
        // Clean up references
        clickHandler = null;
        mainClicker = null;
    }
}

// Export the cleanup function for use in reset
window.cleanupClickHandler = cleanupClickHandler;

// Set up the initial click handler
setupClickHandler();
    
    gameLoop();
}

function updateButtonStates() {
    // Update button states for all upgrades
    if (betterClicks) betterClicks.updateButtonState();
    if (autoClicker) autoClicker.updateButtonState();
}

export function trackManualClick() {
    const now = Date.now();
    const windowMs = getClickRateWindow();
    
    // Get current timestamps and filter out old ones
    const currentTimestamps = getClickTimestamps()
        .filter(timestamp => now - timestamp < windowMs);
    
    // Add the new click timestamp
    const updatedTimestamps = [...currentTimestamps, now];
    setClickTimestamps(updatedTimestamps);
    
    // Update the last click time
    setLastClickTime(now);
    
    // Calculate clicks per second (over the last second)
    const recentClicks = updatedTimestamps.filter(ts => now - ts <= 1000);
    return recentClicks.length * getScoreIncrementValue(); // Return points per second from manual clicks
}

export function getManualClickRate() {
    const now = Date.now();
    // Only count clicks within the last second for current rate
    const recentClicks = getClickTimestamps().filter(ts => now - ts <= 1000);
    return recentClicks.length * getScoreIncrementValue(); // Points per second from manual clicks
}

export function updateScoreDisplay() {
    const scoreElement = document.getElementById('points');
    if (scoreElement) {
        scoreElement.textContent = formatNumber(Math.floor(getScore()), 10000);
    }
}

export function gameLoop(timestamp) {
    // Calculate delta time
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    // Update autoclicker with delta time
    if (autoClicker) autoClicker.update(deltaTime);
    
    // Update button states
    updateButtonStates();
    
    if (gameState === getGameActive()) {
        // Game logic for active state
    }

    requestAnimationFrame(gameLoop);
}

export function setGameState(newState) {
    console.log("Setting game state to " + newState);
    setGameStateVariable(newState);
    const elements = getElements();

    // Hide all main containers first
    if (elements.menu) elements.menu.classList.add('d-none');
    if (elements.canvasContainer) elements.canvasContainer.classList.add('d-none');
    if (elements.gameContainer) elements.gameContainer.classList.add('d-none');
    
    // Remove flex display from all containers
    if (elements.menu) elements.menu.classList.remove('d-flex');
    if (elements.canvasContainer) elements.canvasContainer.classList.remove('d-flex');
    if (elements.gameContainer) elements.gameContainer.classList.remove('d-flex');

    if (newState === getMenuState()) {
        // Show menu
        if (elements.menu) {
            elements.menu.classList.remove('d-none');
            elements.menu.classList.add('d-flex');
        }
        
        // Update active language button
        const languageButtons = [
            elements.btnEnglish, 
            elements.btnSpanish, 
            elements.btnGerman, 
            elements.btnItalian, 
            elements.btnFrench
        ];
        
        languageButtons.forEach(button => {
            if (button) button.classList.remove('active');
        });

        const currentLanguage = getLanguage();
        console.log("Language is " + currentLanguage);
        
        // Set active state for current language button
        const languageButtonMap = {
            'en': elements.btnEnglish,
            'es': elements.btnSpanish,
            'de': elements.btnGerman,
            'it': elements.btnItalian,
            'fr': elements.btnFrench
        };
        
        if (languageButtonMap[currentLanguage]) {
            languageButtonMap[currentLanguage].classList.add('active');
        }

        if (getGameInProgress() && elements.copyButtonSavePopup && elements.closeButtonSavePopup) {
            elements.copyButtonSavePopup.innerHTML = `${localize('copyButton', currentLanguage)}`;
            elements.closeButtonSavePopup.innerHTML = `${localize('closeButton', currentLanguage)}`;
        }
    } else if (newState === getGameActive()) {
        // Show game container
        if (elements.gameContainer) {
            elements.gameContainer.classList.remove('d-none');
            elements.gameContainer.classList.add('d-flex');
        }
    }
}
