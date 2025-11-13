import { 
    setElements, 
    getElements, 
    setBeginGameStatus, 
    getGameInProgress, 
    setGameInProgress,
    getStateMenuScreen, 
    getLanguageSelected,
    getStateMainScreen,
    getStateUpgradesScreen,
    resetGame,
    getCoins,
    getNotes,
    setSaveName,
    getLanguage,
    setLanguage,
    setLanguageChangedFlag,
    getLastGameState,
    setLastGameState,
    getGameStateVariable
} from './constantsAndGlobalVars.js';
import { audioManager } from './AudioManager.js';
import { setGameState, startGame, gameLoop } from './game.js';
import { initLocalization, changeLanguage, localize, updateAllElements } from './localization.js';
import { checkPlayerNameExists, loadFromCloud } from './cloudSave.js';
import { loadGameOption, loadGame, saveGame, copySaveStringToClipBoard } from './saveLoadGame.js';
import { initThemes } from './themes.js';
import { refreshUpgradeUI } from './upgrades.js';

let notificationsEnabled = true;
let notificationQueues = {};
let notificationStatus = {};
let notificationContainers = {};
let classificationOrder = [];
const MAX_STACKS = 3;
const STACK_WIDTH = 360;
const BASE_RIGHT = 16;

function getNotificationsToggle() { return notificationsEnabled; }
function setNotificationsToggle(v) { notificationsEnabled = !!v; }
function getNotificationQueues() { return notificationQueues; }
function setNotificationQueues(q) { notificationQueues = q; }
function getNotificationStatus() { return notificationStatus; }
function setNotificationStatus(s) { notificationStatus = s; }
function getNotificationContainers() { return notificationContainers; }
function setNotificationContainers(c) { notificationContainers = c; }
function getClassificationOrder() { return classificationOrder; }
function setClassificationOrder(o) { classificationOrder = o; }

// Function to generate a unique name by appending a number
async function generateUniqueName(baseName) {
    let counter = 1;
    let newName = `${baseName}${counter}`;
    
    // Try up to 100 variations
    while (counter < 100) {
        const exists = await checkPlayerNameExists(newName);
        if (!exists) {
            return newName;
        }
        counter++;
        newName = `${baseName}${counter}`;
    }
    
    // If we can't find a unique name, return null
    return null;
}

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

// Show all upgrades that should be visible
export function showAllVisibleUpgrades() {
    // This function is now a no-op since visibility is managed by the Upgrade class
    // We'll keep it for backward compatibility
}

export function updateUpgradeVisibility() {
    const thresholdFactor = 0.5; // Show when player has 50% of the cost
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
    
    // Process each upgrade
    mappings.forEach(({ btnId, inst, currency }) => {
        if (!inst) return;
        
        const btn = document.getElementById(btnId);
        if (!btn) return;
        
        // Initialize the upgrade if needed
        if (typeof inst.init === 'function') {
            inst.init();
        }
        
        // Calculate the current cost
        let cost = parseFloat(btn.getAttribute('data-cost')) || 0;
        if (typeof inst.currentCost === 'number') {
            cost = inst.currentCost;
            if (typeof inst.calculatePurchaseCost === 'function') {
                const getMult = typeof inst.multiplierGetter === 'function' ? inst.multiplierGetter.bind(inst) : null;
                const mult = Math.max(1, getMult ? getMult() : 1);
                cost = inst.calculatePurchaseCost(mult);
            }
        }
        
        // Get the current balance
        const balance = currency === 'notes' ? notes : coins;
        const canAfford = balance >= (cost * thresholdFactor);
        
        // Update the button's data attributes
        btn.setAttribute('data-cost', cost);
        
        // Update visibility state
        const item = btn.closest('.upgrade-item');
        if (item) {
            if (canAfford) {
                item.classList.add('revealed');
                if (getGameStateVariable() === getStateUpgradesScreen()) {
                    item.classList.remove('d-none');
                    // Show parent container if needed
                    const parentContainer = item.closest('.autoclickers-container, .upgrades-container');
                    if (parentContainer) {
                        parentContainer.classList.remove('d-none');
                    }
                }
            }
            // Update button state based on full cost
            btn.disabled = balance < cost;
        }
    });
}

let isSoundEnabled = localStorage.getItem('soundEnabledWealthInc') !== 'false';
const toggleSoundBtn = document.getElementById('toggleSound');

function toggleSound() {
    isSoundEnabled = !isSoundEnabled;
    audioManager.muted = !isSoundEnabled;
    
    const icon = toggleSoundBtn.querySelector('i');
    icon.className = isSoundEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
    toggleSoundBtn.classList.toggle('muted', !isSoundEnabled);
    
    localStorage.setItem('soundEnabledWealthInc', isSoundEnabled);
    
    if (isSoundEnabled) {
        audioManager.playFx('coinJingle').catch(console.error);
    }
}

function initSoundToggle() {
    const savedSoundPref = localStorage.getItem('soundEnabledWealthInc');
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

// Create and show a themed modal to collect the player's save name
function ensurePlayerNameModal() {
    let modal = document.getElementById('playerNameModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'playerNameModal';
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" data-i18n="newGame">New Game</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="playerSaveName" data-i18n="enterSaveName">Enter a name for your save</label>
                        <input type="text" class="form-control" id="playerSaveName" placeholder="My Save" data-i18n-placeholder="saveNamePlaceholder" />
                        <div id="suggestionContainer" class="mt-2 d-none">
                            <div class="suggestion-row d-flex align-items-center p-2 border rounded" style="cursor: pointer;">
                                <span class="suggestion-text flex-grow-1"></span>
                                <i class="fas fa-check-circle text-success ml-2"></i>
                            </div>
                        </div>
                        <small class="form-text text-muted" data-i18n="saveNameDescription">This name will also be used for Cloud Save / Load.</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal" data-i18n="buttonCancel">Cancel</button>
                    <button id="confirmPlayerNameBtn" type="button" class="btn btn-primary" data-i18n="buttonStart">Start</button>
                </div>
            </div>
        </div>`;
    // Add styles for the suggestion row
    const style = document.createElement('style');
    style.textContent = `
        .suggestion-row {
            transition: all 0.2s ease;
            border: 1px solid #28a745 !important;
        }
        .suggestion-row:hover {
            background-color: rgba(40, 167, 69, 0.1);
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .suggestion-row:active {
            transform: translateY(0);
        }
        .suggestion-row.selected {
            background-color: rgba(40, 167, 69, 0.2);
            border-width: 2px !important;
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(modal);
    return modal;
}

async function startNewGameFlow() {
    const modal = ensurePlayerNameModal();
    // Wire up confirm click each time to avoid duplicates by resetting handler
    const confirmBtn = modal.querySelector('#confirmPlayerNameBtn');
    const input = modal.querySelector('#playerSaveName');
    const suggestionContainer = modal.querySelector('#suggestionContainer');
    
    // Disable the confirm button while we're checking the name
    const originalButtonText = confirmBtn.innerHTML;
    
    // Hide suggestion when user starts typing
    input.addEventListener('input', () => {
        if (suggestionContainer) {
            suggestionContainer.classList.add('d-none');
        }
    });
    
    // Function to handle the suggestion click
    const handleSuggestionClick = (suggestedName) => {
        input.value = suggestedName;
        const container = modal.querySelector('#suggestionContainer');
        container.classList.add('d-none');
        input.focus();
    };

    // Add click handler for suggestion row
    const suggestionRow = modal.querySelector('.suggestion-row');
    if (suggestionRow) {
        suggestionRow.addEventListener('click', () => {
            const suggestedName = suggestionRow.querySelector('.suggestion-text').textContent;
            if (suggestedName) {
                handleSuggestionClick(suggestedName);
            }
        });
    }

    // Function to handle the actual game start logic
    async function startGameWithName(name) {
        // Show loading state on button
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Starting...';
        
        try {
            // Check if the name already exists in the database
            const nameExists = await checkPlayerNameExists(name);
            
            if (nameExists) {
                showNotification(localize('notfcn_nameTaken', getLanguage()) || 'This name is already taken. Please choose another name.', 'error');
                
                // Generate and show a suggested name
                const suggestedName = await generateUniqueName(name);
                const suggestionContainer = modal.querySelector('#suggestionContainer');
                const suggestionText = modal.querySelector('.suggestion-text');
                
                if (suggestedName && suggestionContainer && suggestionText) {
                    // Use localized string for the suggestion
                    const useSuggestionText = localize('useSuggestion', getLanguage()) || 'Use "{0}"';
                    suggestionText.textContent = useSuggestionText.replace('{0}', suggestedName);
                    suggestionContainer.classList.remove('d-none');
                    
                    // Add click handler to the suggestion
                    suggestionContainer.onclick = () => {
                        input.value = suggestedName;
                        suggestionContainer.classList.add('d-none');
                        input.focus();
                    };
                }
                
                input.focus();
                return false; // Indicate that we didn't start the game
            }
            
            // If we get here, the name is available
            setSaveName(name);
            $(modal).modal('hide');
            
            // Start the game logic
            const elements = getElements();
            resetGame();
            setBeginGameStatus(true);
            if (!getGameInProgress()) {
                setGameInProgress(true);
            }
            if (elements.resumeGameMenuButton) {
                disableActivateButton(elements.resumeGameMenuButton, 'active', 'btn-primary');
            }
            
            // Hide upgrades and auto-clicker windows and reset their visibility state
            const autoContainer = document.querySelector('.autoclickers-container');
            const upgradesContainer = document.querySelector('.upgrades-container');
            
            // Reset auto-clicker window
            if (autoContainer) {
                autoContainer.classList.add('d-none');
                autoContainer.classList.remove('revealed');
            }
            
            // Reset upgrades window
            if (upgradesContainer) {
                upgradesContainer.classList.add('d-none');
                upgradesContainer.classList.remove('revealed');
            }
            
            // Also hide any individual upgrade items that might be visible
            document.querySelectorAll('.upgrade-item').forEach(item => {
                item.classList.add('d-none');
                item.classList.remove('revealed');
            });
            
            // Start the game
            // When starting a new game, set last state to menu
            setLastGameState(getStateMenuScreen());
            setGameState(getStateMainScreen());
            startGame();
            window.gameLoopRunning = true;

            // Immediately create the cloud save for this new game
            try { 
                if (window.saveToCloud) { 
                    await window.saveToCloud(true); 
                } 
            } catch (e) { 
                console.error('Error in initial cloud save:', e);
                // Non-critical error, just log it
            }
            
            return true; // Indicate successful game start
            
        } catch (error) {
            console.error('Error in new game flow:', error);
            const errorMessage = error.message.includes('name') 
                ? localize('notfcn_nameCheckError', getLanguage()) || 'Error checking player name. Please try again.'
                : 'An error occurred while starting the game. Please try again.';
                
            showNotification(errorMessage, 'error');
            return false;
        } finally {
            // Always reset the button state
            if (confirmBtn && originalButtonText) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = originalButtonText;
            }
            
            // Update UI elements if needed
            const elements = getElements();
            if (elements.saveGameButton) {
                disableActivateButton(elements.saveGameButton, 'active', 'btn-primary');
            }
        }
    }
    
    // Set up the click handler for the confirm button
    confirmBtn.onclick = async () => {
        const name = (input.value || '').trim();
        if (!name) {
            try { 
                showNotification(localize('notfcn_nameRequired', getLanguage()) || 'Please enter a name to start a new game', 'error'); 
            } catch (e) {
                console.error('Error showing notification:', e);
            }
            return;
        }
        
        await startGameWithName(name);
    };

    // Also submit on Enter key
    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            confirmBtn.click();
        }
    };

    $(modal).modal('show');
    setTimeout(() => input.focus(), 200);
}

// Function to handle language selection and save to localStorage
function setupLanguageButtons() {
    const languageMap = {
        'btnEnglish': 'en',
        'btnSpanish': 'es',
        'btnGerman': 'de',
        'btnItalian': 'it',
        'btnFrench': 'fr',
        'btnPortuguese': 'pt'
    };

    Object.entries(languageMap).forEach(([buttonId, langCode]) => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', () => {
                localStorage.setItem('languagePreferenceWealthInc', langCode);
                changeLanguage(langCode);
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize core components first
        setElements();
        const elements = getElements();
        
        // Initialize sound and themes
        initSoundToggle();
        toggleSoundBtn.addEventListener('click', toggleSound);
        initThemes();
        
        // Add click handlers for Main and Upgrades buttons
        const toggleMainBtn = document.getElementById('toggleMain');
        const toggleUpgradesBtn = document.getElementById('toggleUpgrades');
        
        if (toggleMainBtn) {
            toggleMainBtn.addEventListener('click', () => {
                const currentState = getGameStateVariable();
                // Only update last state if we're not already in the main screen
                if (currentState !== getStateMainScreen()) {
                    setLastGameState(currentState);
                }
                setGameState(getStateMainScreen());
            });
        }
        
        if (toggleUpgradesBtn) {
            toggleUpgradesBtn.addEventListener('click', () => {
                const currentState = getGameStateVariable();
                // Only update last state if we're not already in the upgrades screen
                if (currentState !== getStateUpgradesScreen()) {
                    setLastGameState(currentState);
                }
                setGameState(getStateUpgradesScreen());
            });
        }
        
        // Show initial loading message
        updateLoadingMessage('Loading game resources...');
        
        // Load audio first as it might take time
        updateLoadingMessage('Loading audio...');
        const audioPromise = audioManager.preloadAll();
        
        // Setup language buttons
        setupLanguageButtons();
        
        // Get the current language (already initialized from localStorage)
        const currentLanguage = getLanguageSelected();
        console.log('Initial language from state:', {
            currentLanguage,
            fromLocalStorage: localStorage.getItem('languagePreferenceWealthInc'),
            browserLanguage: navigator.language
        });
        
        // Initialize localization with the current language
        updateLoadingMessage('Loading language resources...');
        await initLocalization(currentLanguage);
        
        console.log('After initLocalization, current language:', getLanguageSelected());
        
        // Check for existing cloud save after language is set
        const saveName = localStorage.getItem('currentSaveNameWealthInc');
        if (saveName && saveName.trim() !== '') {
            updateLoadingMessage('Initializing game state...');
            try {
                // Reset game state first to ensure clean initialization
                resetGame();
                setBeginGameStatus(true);
                setGameInProgress(true);
                startGame();
                
                // Now load the saved game
                updateLoadingMessage('Loading your saved game...');
                await loadFromCloud();
                
                // Ensure the game is properly started after load
                if (!window.gameLoopRunning) {
                    window.gameLoopRunning = true;
                    gameLoop();
                }
            } catch (error) {
                console.error('Error loading from cloud on startup:', error);
                // If loading fails, ensure we still have a working game state
                resetGame();
                setBeginGameStatus(true);
                setGameInProgress(true);
                startGame();
                window.gameLoopRunning = true;
            }
        }
        
        // Wait for audio to finish loading
        const audioResults = await audioPromise;
        console.log('Audio preload results:', audioResults);
        
        // Save the language preference if it wasn't set
        if (!localStorage.getItem('languagePreferenceWealthInc')) {
            localStorage.setItem('languagePreferenceWealthInc', currentLanguage);
        }
        
        updateLoadingMessage('Finalizing setup...');
        
        // Clean up any unwanted elements
        const pauseGameBtn = document.getElementById('pauseGame');
        if (pauseGameBtn?.parentNode) {
            pauseGameBtn.parentNode.removeChild(pauseGameBtn);
        }

        if (elements.newGameMenuButton) {
            elements.newGameMenuButton.addEventListener('click', () => {
                // Ensure we're using the current language from localStorage
                const currentLanguage = localStorage.getItem('languagePreferenceWealthInc') || 'en';
                setLanguage(currentLanguage);
                setLanguageChangedFlag(true);
                startNewGameFlow();
            });
        }

    if (elements.pauseResumeGameButton && elements.pauseResumeGameButton.parentNode) {
        elements.pauseResumeGameButton.parentNode.removeChild(elements.pauseResumeGameButton);
    }

    if (elements.resumeGameMenuButton) {
        elements.resumeGameMenuButton.addEventListener('click', () => {
            // Get the last state before menu was shown, default to main screen if none
            const lastState = getLastGameState() || getStateMainScreen();
            setGameState(lastState);
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
            // When going to menu, store the current state as last state
            const currentState = getGameStateVariable();
            if (currentState !== getStateMenuScreen()) {
                setLastGameState(currentState);
            }
            setGameState(getStateMenuScreen());
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
                setGameState(getStateMenuScreen());
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

        setGameState(getStateMenuScreen());
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

export function showNotification(message, type = 'info', time = 3000, classification = 'default') {
    if (!getNotificationsToggle()) return;

    const queues = getNotificationQueues();
    const status = getNotificationStatus();

    if (!queues[classification]) {
        queues[classification] = [];
        status[classification] = false;
        setNotificationQueues(queues);
        setNotificationStatus(status);
        createNotificationContainer(classification);
    }

    // If the message is a localization key (starts with 'notfcn_'), localize it
    const displayMessage = message.startsWith('notfcn_') ? localize(message, getLanguageSelected()) : message;
    
    queues[classification].push({ message: displayMessage, type, time });
    setNotificationQueues(queues);

    if (!status[classification]) {
        processNotificationQueue(classification);
    }
}

function createNotificationContainer(classification) {
    const container = document.createElement('div');
    container.className = `notification-container classification-${classification}`;

    document.body.appendChild(container);

    const containers = getNotificationContainers();
    containers[classification] = container;
    setNotificationContainers(containers);

    const order = getClassificationOrder();
    order.push(classification);
    setClassificationOrder(order);

    updateContainerPositions();
}

function updateContainerPositions() {
    const containers = getNotificationContainers();
    const order = getClassificationOrder();

    order.slice(0, MAX_STACKS).forEach((className, index) => {
        const container = containers[className];
        if (container) {
            container.style.right = `${BASE_RIGHT + index * STACK_WIDTH}px`;
        }
    });
}

function processNotificationQueue(classification) {
    if (!getNotificationsToggle()) return;

    const queues = getNotificationQueues();
    const status = getNotificationStatus();

    const queue = queues[classification];
    if (queue?.length > 0) {
        status[classification] = true;
        setNotificationStatus(status);

        const { message, type, time } = queue.shift();
        setNotificationQueues(queues);

        sendNotification(message, type, classification, time);
    } else {
        status[classification] = false;
        setNotificationStatus(status);

        const containers = getNotificationContainers();
        const container = containers[classification];
        if (container) {
            container.remove();
            delete containers[classification];
            setNotificationContainers(containers);
        }

        delete queues[classification];
        setNotificationQueues(queues);

        const order = getClassificationOrder().filter(c => c !== classification);
        setClassificationOrder(order);
        delete status[classification];
        setNotificationStatus(status);
        updateContainerPositions();
    }
}

function sendNotification(message, type, classification, duration) {
    const containers = getNotificationContainers();
    const container = containers[classification];
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `<div class="notification-content">${message}</div>`;

    const existing = container.querySelector('.notification');
    if (existing) {
        existing.remove();
    }

    const button = document.createElement('button');
    button.className = 'notification-button';
    button.innerText = 'Clear All';
    button.onclick = () => {
        const queues = getNotificationQueues();
        const containers = getNotificationContainers();
        const status = getNotificationStatus();
        const order = getClassificationOrder();
    
        queues[classification] = [];
        setNotificationQueues(queues);
    
        const container = containers[classification];
        if (container) {
            container.remove();
            delete containers[classification];
            setNotificationContainers(containers);
        }

        delete status[classification];
        setNotificationStatus(status);
    
        const newOrder = order.filter(c => c !== classification);
        setClassificationOrder(newOrder);
    
        updateContainerPositions();
    };

notification.appendChild(button);

    container.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        hideNotification(notification);
        processNotificationQueue(classification);
    }, duration);
}

function hideNotification(notification) {
    notification.classList.remove('show');
    setTimeout(() => {
        notification.remove();
    }, 500);
}
