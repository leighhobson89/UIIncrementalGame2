import { localize } from './localization.js';
import { 
    setGameStateVariable, 
    getBeginGameStatus, 
    getMenuState, 
    getGameVisiblePaused, 
    getGameVisibleActive, 
    getElements, 
    getLanguage, 
    getGameInProgress, 
    gameState,
    getScore,
    setScore,
    getScoreIncrementValue,
    setScoreIncrementValue
} from './constantsAndGlobalVars.js';

//--------------------------------------------------------------------------------------------------------

export function startGame() {
    // Set up main clicker button
    const mainClicker = document.getElementById('mainClicker');
    if (mainClicker) {
        mainClicker.addEventListener('click', () => {
            const currentScore = getScore();
            const increment = getScoreIncrementValue();
            setScore(currentScore + increment);
            
            // Add click animation
            mainClicker.classList.add('clicked');
            setTimeout(() => {
                mainClicker.classList.remove('clicked');
            }, 100);
        });
    }
    
    // Set up Better Clicks upgrade button
    const betterClicksBtn = document.getElementById('betterClicksBtn');
    if (betterClicksBtn) {
        console.log('Better Clicks button found');
        betterClicksBtn.addEventListener('click', (e) => {
            console.log('Better Clicks button clicked');
            e.stopPropagation(); // Prevent event bubbling
            
            const currentScore = getScore();
            const currentCost = parseInt(betterClicksBtn.getAttribute('data-cost'));
            
            console.log('Current score:', currentScore, 'Cost:', currentCost);
            
            if (currentScore >= currentCost) {
                console.log('Enough points, processing upgrade...');
                // Deduct points
                setScore(currentScore - currentCost);
                
                // Increase click value
                const currentIncrement = getScoreIncrementValue();
                setScoreIncrementValue(currentIncrement + 1);
                
                // Update cost for next purchase (increase by 13%)
                const newCost = Math.floor(currentCost * 1.13);
                betterClicksBtn.setAttribute('data-cost', newCost);
                
                // Update button text
                betterClicksBtn.textContent = `Buy (${newCost} points)`;
                
                // Update the upgrade description to show the new click value
                const upgradeInfo = betterClicksBtn.closest('.upgrade-item').querySelector('.upgrade-info p');
                if (upgradeInfo) {
                    upgradeInfo.textContent = `+${currentIncrement + 1} points per click`;
                }
            }
        });
    }
    
    gameLoop();
}

function updateButtonStates() {
    const currentScore = getScore();
    
    // Update Better Clicks button
    const betterClicksBtn = document.getElementById('betterClicksBtn');
    if (betterClicksBtn) {
        const cost = parseInt(betterClicksBtn.getAttribute('data-cost'));
        if (currentScore >= cost) {
            betterClicksBtn.classList.remove('disabled');
            betterClicksBtn.disabled = false;
        } else {
            betterClicksBtn.classList.add('disabled');
            betterClicksBtn.disabled = true;
        }
    }
    
    // Update Auto-Clicker button
    const autoClickerBtn = document.getElementById('autoClickerBtn');
    if (autoClickerBtn) {
        const cost = parseInt(autoClickerBtn.getAttribute('data-cost'));
        if (currentScore >= cost) {
            autoClickerBtn.classList.remove('disabled');
            autoClickerBtn.disabled = false;
        } else {
            autoClickerBtn.classList.add('disabled');
            autoClickerBtn.disabled = true;
        }
    }
}

export function gameLoop() {
    if (gameState === getGameVisibleActive() || gameState === getGameVisiblePaused()) {
        // Update button states every frame
        updateButtonStates();
        
        if (gameState === getGameVisibleActive()) {
            // Game logic for active state
        }

        requestAnimationFrame(gameLoop);
    }
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

    switch (newState) {
        case getMenuState():
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
            break;
            
        case getGameVisiblePaused():
        case getGameVisibleActive():
            // Show game container
            if (elements.gameContainer) {
                elements.gameContainer.classList.remove('d-none');
                elements.gameContainer.classList.add('d-flex');
            }
            
            // Update UI based on game state
            if (newState === getGameVisiblePaused()) {
                // Paused state UI updates
                if (elements.pauseGame) {
                    elements.pauseGame.innerHTML = `<i class="fas fa-play"></i>`;
                }
            } else {
                // Active state UI updates
                if (elements.pauseGame) {
                    elements.pauseGame.innerHTML = `<i class="fas fa-pause"></i>`;
                }
            }
            break;
    }
}
