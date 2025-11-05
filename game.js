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
    getLastClickTime,
    setLastClickTime
} from './constantsAndGlobalVars.js';
import { testNumberFormatter, formatNumber } from './utils/numberFormatter.js'; //call in console
import { initUpgrades, betterClicks, autoClicker } from './upgrades.js';

// Game timing
let lastTime = 0;
const fixedTimeStep = 1000 / 60; // 60 FPS

//--------------------------------------------------------------------------------------------------------

export function startGame() {
    // Initialize all upgrades
    initUpgrades();
    
    // Set up main clicker button
    const mainClicker = document.getElementById('mainClicker');
    if (mainClicker) {
        mainClicker.addEventListener('click', () => {
            const currentScore = getScore();
            const increment = getScoreIncrementValue();
            setScore(currentScore + increment);
            
            // Track the click and get current click rate
            trackManualClick();
            
            // Add click animation
            mainClicker.classList.add('clicked');
            setTimeout(() => {
                mainClicker.classList.remove('clicked');
            }, 100);
        });
    }
    
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
