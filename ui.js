import {  
    getLanguage, 
    setElements, 
    getElements, 
    setBeginGameStatus, 
    getGameInProgress, 
    setGameInProgress,
    getMenuState, 
    getLanguageSelected, 
    setLanguage, 
    getGameActive,
    resetGame,
    getScore
} from './constantsAndGlobalVars.js';
import { setGameState, startGame, gameLoop } from './game.js';
import { initLocalization, localize, changeLanguage } from './localization.js';
import { loadGameOption, loadGame, saveGame, copySaveStringToClipBoard } from './saveLoadGame.js';
import { initThemes } from './themes.js';

/**
 * Update price colors and button states based on affordability
 * @param {Array} upgrades - Array of upgrade objects with currentCost property
 */
export function updatePriceColors(upgrades) {
    const currentScore = getScore();
    
    upgrades.forEach(upgrade => {
        if (upgrade.button) {
            const canAfford = currentScore >= upgrade.currentCost;
            
            // Update button disabled state
            upgrade.button.disabled = !canAfford;
            upgrade.button.classList.toggle('disabled', !canAfford);
            
            // Update price color in header
            const upgradeItem = upgrade.button.closest('.upgrade-item');
            if (upgradeItem) {
                const headerElement = upgradeItem.querySelector('.upgrade-info h4');
                if (headerElement) {
                    headerElement.classList.toggle('price-unaffordable', !canAfford);
                }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize elements
    setElements();
    const elements = getElements();
    
    // Initialize themes
    initThemes();
    
    // Initialize localization
    await initLocalization(getLanguageSelected() || 'en');

    // Remove pause button if it exists
    const pauseGameBtn = document.getElementById('pauseGame');
    if (pauseGameBtn && pauseGameBtn.parentNode) {
        pauseGameBtn.parentNode.removeChild(pauseGameBtn);
    }

    // Menu event listeners
    if (elements.newGameMenuButton) {
        elements.newGameMenuButton.addEventListener('click', () => {
            // Reset the game state before starting
            resetGame();
            
            setBeginGameStatus(true);
            if (!getGameInProgress()) {
                setGameInProgress(true);
            }
            if (elements.resumeGameMenuButton) {
                disableActivateButton(elements.resumeGameMenuButton, 'active', 'btn-primary');
            }
            if (elements.saveGameButton) {
                disableActivateButton(elements.saveGameButton, 'active', 'btn-primary');
            }
            setGameState(getGameActive());
            startGame();
            window.gameLoopRunning = true;
        });
    }

    // Remove pause/resume button if it exists
    if (elements.pauseResumeGameButton && elements.pauseResumeGameButton.parentNode) {
        elements.pauseResumeGameButton.parentNode.removeChild(elements.pauseResumeGameButton);
    }

    // Resume game from menu - go directly to active game
    if (elements.resumeGameMenuButton) {
        elements.resumeGameMenuButton.addEventListener('click', () => {
            setGameState(getGameActive());
            if (!window.gameLoopRunning) {
                gameLoop();
                window.gameLoopRunning = true;
            }
        });
    }

    // Return to menu button (both old and new UI)
    const returnToMenuButtons = [
        elements.returnToMenuButton,
        elements.pauseGame?.closest('.game-controls')?.querySelector('.btn-outline-light')
    ].filter(btn => btn);
    
    returnToMenuButtons.forEach(button => {
        button.addEventListener('click', () => {
            setGameState(getMenuState());
        });
    });

    // Language buttons
    const languageButtons = {
        'en': elements.btnEnglish,
        'es': elements.btnSpanish,
        'de': elements.btnGerman,
        'it': elements.btnItalian,
        'fr': elements.btnFrench
    };

    // Add event listeners for language buttons
    Object.entries(languageButtons).forEach(([lang, button]) => {
        if (button) {
            button.addEventListener('click', () => {
                changeLanguage(lang);
                setGameState(getMenuState());
            });
        }
    });
    
    // Set active language button
    const currentLang = getLanguageSelected() || 'en';
    if (languageButtons[currentLang]) {
        languageButtons[currentLang].classList.add('active');
    }

    // Save game button
    if (elements.saveGameButton) {
        elements.saveGameButton.addEventListener('click', function () {
            if (elements.overlay) {
                elements.overlay.classList.remove('d-none');
            }
            saveGame(true);
        });
    }

    // Load game button
    if (elements.loadGameButton) {
        elements.loadGameButton.addEventListener('click', function () {
            if (elements.overlay) {
                elements.overlay.classList.remove('d-none');
            }
            loadGameOption();
        });
    }

    // Load game from string
    if (elements.loadStringButton && elements.loadSaveGameStringTextArea) {
        elements.loadStringButton.addEventListener('click', function () {
            loadGame(elements.loadSaveGameStringTextArea.value);
        });
    }

    // Copy save string to clipboard
    if (elements.copyButtonSavePopup) {
        elements.copyButtonSavePopup.addEventListener('click', function () {
            copySaveStringToClipBoard();
        });
    }

    // Close save/load popup
    if (elements.closeButtonSavePopup && elements.overlay && elements.saveLoadPopup) {
        elements.closeButtonSavePopup.addEventListener('click', function () {
            elements.overlay.classList.add('d-none');
            elements.saveLoadPopup.classList.add('d-none');
        });
    }

    // Set initial game state and language
    setGameState(getMenuState());
    handleLanguageChange(getLanguageSelected());
    
    // Track if game loop is running
    window.gameLoopRunning = false;
});

async function setElementsLanguageText() {
    // Localization text
    getElements().menuTitle.innerHTML = `<h2>${localize('menuTitle', getLanguage())}</h2>`;
    getElements().newGameMenuButton.innerHTML = `${localize('newGame', getLanguage())}`;
    getElements().resumeGameMenuButton.innerHTML = `${localize('resumeGame', getLanguage())}`;
    getElements().loadGameButton.innerHTML = `${localize('loadGame', getLanguage())}`;
    getElements().saveGameButton.innerHTML = `${localize('saveGame', getLanguage())}`;
    getElements().loadStringButton.innerHTML = `${localize('loadButton', getLanguage())}`;
}

export function handleLanguageChange(languageCode) {
    changeLanguage(languageCode);
}

async function setupLanguageAndLocalization() {
    setLanguage(getLanguageSelected());
    await initLocalization(getLanguage());
}

export function disableActivateButton(button, action, activeClass) {
    switch (action) {
        case 'active':
            button.classList.remove('disabled');
            button.classList.add(activeClass);
            break;
        case 'disable':
            button.classList.remove(activeClass);
            button.classList.add('disabled');
            break;
    }
}

