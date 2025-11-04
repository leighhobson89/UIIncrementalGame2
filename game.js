import { localize } from './localization.js';
import { setGameStateVariable, getBeginGameStatus, getMenuState, getGameVisiblePaused, getGameVisibleActive, getElements, getLanguage, getGameInProgress, gameState } from './constantsAndGlobalVars.js';

//--------------------------------------------------------------------------------------------------------

export function startGame() {

    gameLoop();
}

export function gameLoop() {
    if (gameState === getGameVisibleActive() || gameState === getGameVisiblePaused()) {
        ctx.clearRect(0, 0, getElements().canvas.width, getElements().canvas.height);

        if (gameState === getGameVisibleActive()) {
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
