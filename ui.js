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
    getCoins
} from './constantsAndGlobalVars.js';
import { audioManager } from './AudioManager.js';
import { setGameState, startGame, gameLoop } from './game.js';
import { initLocalization, localize, changeLanguage } from './localization.js';
import { loadGameOption, loadGame, saveGame, copySaveStringToClipBoard } from './saveLoadGame.js';
import { initThemes } from './themes.js';
import { refreshUpgradeUI } from './upgrades.js';

/**
 * Update price colors and button states based on affordability
 * @param {Array} upgrades - Array of upgrade objects with currentCost property
 */
export function updatePriceColors(upgrades) {
    const currentScore = getCoins();
    
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

// Sound toggle state
let isSoundEnabled = localStorage.getItem('soundEnabled') !== 'false';
const toggleSoundBtn = document.getElementById('toggleSound');

// Toggle sound function
function toggleSound() {
    isSoundEnabled = !isSoundEnabled;
    audioManager.muted = !isSoundEnabled;
    
    // Update button icon and class
    const icon = toggleSoundBtn.querySelector('i');
    icon.className = isSoundEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
    toggleSoundBtn.classList.toggle('muted', !isSoundEnabled);
    
    // Save preference to localStorage
    localStorage.setItem('soundEnabled', isSoundEnabled);
    
    // Play a sound when unmuting to help with autoplay policies
    if (isSoundEnabled) {
        audioManager.playFx('coinJingle').catch(console.error);
    }
}

// Initialize sound toggle from localStorage
function initSoundToggle() {
    const savedSoundPref = localStorage.getItem('soundEnabled');
    if (savedSoundPref !== null) {
        isSoundEnabled = savedSoundPref === 'true';
        audioManager.muted = !isSoundEnabled;
        
        // Update button icon and class based on saved preference
        const icon = toggleSoundBtn.querySelector('i');
        icon.className = isSoundEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
        toggleSoundBtn.classList.toggle('muted', !isSoundEnabled);
    } else {
        // Default to enabled if no preference is saved
        isSoundEnabled = true;
        audioManager.muted = false;
        toggleSoundBtn.classList.remove('muted');
    }
}

// Add loading screen styles
const style = document.createElement('style');
style.textContent = `
    #loadingScreen {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: var(--theme-bg, #1a1a1a);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        color: var(--theme-text, #ffffff);
        font-size: 1.5rem;
        z-index: 9999;
        transition: opacity 0.5s ease;
    }
    #loadingScreen h2 {
        margin-bottom: 1rem;
        color: var(--theme-accent, #4a90e2);
    }
    #loadingScreen p {
        margin-top: 1rem;
        font-size: 1rem;
        opacity: 0.8;
    }
    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        border-top-color: var(--theme-accent, #4a90e2);
        animation: spin 1s ease-in-out infinite;
        margin-bottom: 1rem;
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Create loading screen
const loadingScreen = document.createElement('div');
loadingScreen.id = 'loadingScreen';
loadingScreen.innerHTML = `
    <div class="loading-spinner"></div>
    <h2>Loading Game</h2>
    <p>Preparing your experience...</p>
`;
document.body.appendChild(loadingScreen);

// Update loading message
function updateLoadingMessage(message) {
    const messageEl = loadingScreen.querySelector('p');
    if (messageEl) messageEl.textContent = message;
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize elements
        setElements();
        const elements = getElements();
        
        // Initialize sound toggle
        initSoundToggle();
        toggleSoundBtn.addEventListener('click', toggleSound);
        
        // Initialize themes
        initThemes();
        
        updateLoadingMessage('Loading game resources...');
        
        // Initialize localization
        await initLocalization(getLanguageSelected() || 'en');
        
        // Preload audio
        updateLoadingMessage('Loading audio...');
        const audioResults = await audioManager.preloadAll();
        console.log('Audio preload results:', audioResults);
        
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
                // Re-apply dynamic upgrade texts so placeholders like {0} are replaced
                refreshUpgradeUI();
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
        
        // Hide loading screen with fade out
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.remove();
                // Try to play a sound to unlock audio context (helps with autoplay policies)
                audioManager.playFx('coinJingle').catch(() => {});
            }, 500);
        }, 500);
        
    } catch (error) {
        console.error('Initialization error:', error);
        updateLoadingMessage('Error loading game. Please refresh the page.');
        loadingScreen.querySelector('h2').textContent = 'Error';
        loadingScreen.querySelector('.loading-spinner').style.display = 'none';
    }
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

