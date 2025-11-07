import { 
    setElements, 
    getElements, 
    setBeginGameStatus, 
    getGameInProgress, 
    setGameInProgress,
    getMenuState, 
    getLanguageSelected,    getGameActive,
    resetGame,
    getCoins,
    getNotes
} from './constantsAndGlobalVars.js';
import { audioManager } from './AudioManager.js';
import { setGameState, startGame, gameLoop } from './game.js';
import { initLocalization, changeLanguage } from './localization.js';
import { loadGameOption, loadGame, saveGame, copySaveStringToClipBoard } from './saveLoadGame.js';
import { initThemes } from './themes.js';
import { refreshUpgradeUI } from './upgrades.js';

export function updatePriceColors(upgrades) {
    const currentScore = getCoins();
    
    upgrades.forEach(upgrade => {
        if (upgrade.button) {
            const canAfford = currentScore >= upgrade.currentCost;
            
            upgrade.button.disabled = !canAfford;
            upgrade.button.classList.toggle('disabled', !canAfford);
            
            const upgradeItem = upgrade.button.closest('.upgrade-item');
            if (upgradeItem) {
                const headerElement = upgradeItem.querySelector('.upgrade-info h4');
                if (headerElement) {
                    headerElement.classList.toggle('price-unaffordable', !canAfford);
                }
            }
        }
    });

    try { updateUpgradeVisibility(); } catch {}
}

export function updateUpgradeVisibility() {
    const thresholdFactor = 0.9;
    const coins = getCoins();
    const notes = getNotes();

    const mappings = [
        { btnId: 'autoClickerBtn', inst: window.autoClicker, currency: 'coins' },
        { btnId: 'noteAutoClickerBtn', inst: window.noteAutoClicker, currency: 'notes' },
        { btnId: 'betterClicksBtn', inst: window.betterClicks, currency: 'coins' },
        { btnId: 'betterClicksMultiplierBtn', inst: window.betterClicksMultiplier, currency: 'coins' },
        { btnId: 'autoClickerMultiplierBtn', inst: window.autoClickerMultiplier, currency: 'coins' },
        { btnId: 'noteAutoClickerMultiplierBtn', inst: window.noteAutoClickerMultiplier, currency: 'notes' },
    ];

    mappings.forEach(({ btnId, inst, currency }) => {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        const item = btn.closest('.upgrade-item');
        if (!item || item.classList.contains('revealed')) return;

        let cost = parseFloat(btn.getAttribute('data-cost')) || Infinity;
        if (inst && typeof inst.currentCost === 'number') {
            cost = inst.currentCost;
            if (typeof inst.calculatePurchaseCost === 'function') {
                const getMult = typeof inst.multiplierGetter === 'function' ? inst.multiplierGetter.bind(inst) : null;
                const mult = Math.max(1, getMult ? getMult() : 1);
                cost = inst.calculatePurchaseCost(mult);
            }
        }
        if (!isFinite(cost)) return;

        let balance = currency === 'notes' ? notes : coins;

        if (balance >= thresholdFactor * cost) {
            item.classList.remove('d-none');
            item.classList.add('fade-in', 'revealed');
            const parentContainer = item.closest('.autoclickers-container, .upgrades-container');
            if (parentContainer) {
                parentContainer.classList.remove('d-none');
                parentContainer.classList.add('revealed');
            }
            setTimeout(() => item.classList.remove('fade-in'), 500);
        }
    });
}

let isSoundEnabled = localStorage.getItem('soundEnabled') !== 'false';
const toggleSoundBtn = document.getElementById('toggleSound');

function toggleSound() {
    isSoundEnabled = !isSoundEnabled;
    audioManager.muted = !isSoundEnabled;
    
    const icon = toggleSoundBtn.querySelector('i');
    icon.className = isSoundEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
    toggleSoundBtn.classList.toggle('muted', !isSoundEnabled);
    
    localStorage.setItem('soundEnabled', isSoundEnabled);
    
    if (isSoundEnabled) {
        audioManager.playFx('coinJingle').catch(console.error);
    }
}

function initSoundToggle() {
    const savedSoundPref = localStorage.getItem('soundEnabled');
    if (savedSoundPref !== null) {
        isSoundEnabled = savedSoundPref === 'true';
        audioManager.muted = !isSoundEnabled;
        
        const icon = toggleSoundBtn.querySelector('i');
        icon.className = isSoundEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
        toggleSoundBtn.classList.toggle('muted', !isSoundEnabled);
    } else {
        isSoundEnabled = true;
        audioManager.muted = false;
        toggleSoundBtn.classList.remove('muted');
    }
}

const loadingScreen = document.getElementById('loadingScreen');

function updateLoadingMessage(message) {
    const messageEl = loadingScreen.querySelector('p');
    if (messageEl) messageEl.textContent = message;
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        setElements();
        const elements = getElements();
        
        initSoundToggle();
        toggleSoundBtn.addEventListener('click', toggleSound);
        
        initThemes();
        
        updateLoadingMessage('Loading game resources...');
        
        await initLocalization(getLanguageSelected() || 'en');
        
        updateLoadingMessage('Loading audio...');
        const audioResults = await audioManager.preloadAll();
        console.log('Audio preload results:', audioResults);
        
        const pauseGameBtn = document.getElementById('pauseGame');
        if (pauseGameBtn && pauseGameBtn.parentNode) {
            pauseGameBtn.parentNode.removeChild(pauseGameBtn);
        }

        if (elements.newGameMenuButton) {
            elements.newGameMenuButton.addEventListener('click', () => {
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

    if (elements.pauseResumeGameButton && elements.pauseResumeGameButton.parentNode) {
        elements.pauseResumeGameButton.parentNode.removeChild(elements.pauseResumeGameButton);
    }

    if (elements.resumeGameMenuButton) {
        elements.resumeGameMenuButton.addEventListener('click', () => {
            setGameState(getGameActive());
            if (!window.gameLoopRunning) {
                gameLoop();
                window.gameLoopRunning = true;
            }
        });
    }

    const returnToMenuButtons = [
        elements.returnToMenuButton,
        elements.pauseGame?.closest('.game-controls')?.querySelector('.btn-outline-light')
    ].filter(btn => btn);
    
    returnToMenuButtons.forEach(button => {
        button.addEventListener('click', () => {
            setGameState(getMenuState());
        });
    });

    const languageButtons = {
        'en': elements.btnEnglish,
        'es': elements.btnSpanish,
        'de': elements.btnGerman,
        'it': elements.btnItalian,
        'fr': elements.btnFrench
    };

    Object.entries(languageButtons).forEach(([lang, button]) => {
        if (button) {
            button.addEventListener('click', () => {
                changeLanguage(lang);
                refreshUpgradeUI();
                setGameState(getMenuState());
            });
        }
    });
    
    const currentLang = getLanguageSelected() || 'en';
    if (languageButtons[currentLang]) {
        languageButtons[currentLang].classList.add('active');
    }

    if (elements.saveGameButton) {
        elements.saveGameButton.addEventListener('click', function () {
            if (elements.overlay) {
                elements.overlay.classList.remove('d-none');
            }
            saveGame();
        });
    }

    if (elements.loadGameButton) {
        elements.loadGameButton.addEventListener('click', function () {
            if (elements.overlay) {
                elements.overlay.classList.remove('d-none');
            }
            loadGameOption();
        });
    }

    if (elements.loadStringButton && elements.loadSaveGameStringTextArea) {
        elements.loadStringButton.addEventListener('click', function () {
            loadGame();
        });
    }

    if (elements.copyButtonSavePopup) {
        elements.copyButtonSavePopup.addEventListener('click', function () {
            copySaveStringToClipBoard();
        });
    }

    if (elements.closeButtonSavePopup && elements.overlay && elements.saveLoadPopup) {
        elements.closeButtonSavePopup.addEventListener('click', function () {
            elements.overlay.classList.add('d-none');
            elements.saveLoadPopup.classList.add('d-none');
        });
    }

        setGameState(getMenuState());
        handleLanguageChange(getLanguageSelected());
        
        window.gameLoopRunning = false;
        
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.remove();
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

export function handleLanguageChange(languageCode) {
    changeLanguage(languageCode);
}

export function disableActivateButton(button, action, activeClass) {
    switch (action) {
        case 'active':
            button.classList.remove('disabled');
            button.classList.add(activeClass);
            break;
        case 'disable':
            button.classList.add('disabled');
            button.classList.remove(activeClass);
            break;
        default:
            console.warn('Invalid action for disableActivateButton:', action);
    }
}
