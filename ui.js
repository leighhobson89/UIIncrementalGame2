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
    getNotes,
    setSaveName
} from './constantsAndGlobalVars.js';
import { audioManager } from './AudioManager.js';
import { setGameState, startGame, gameLoop } from './game.js';
import { initLocalization, changeLanguage } from './localization.js';
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
                    <h5 class="modal-title">New Game</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="playerSaveName">Enter a name for your save</label>
                        <input type="text" class="form-control" id="playerSaveName" placeholder="My Save" />
                        <small class="form-text text-muted">This name will also be used for Cloud Save / Load.</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                    <button id="confirmPlayerNameBtn" type="button" class="btn btn-primary">Start</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modal);
    return modal;
}

function startNewGameFlow() {
    const modal = ensurePlayerNameModal();
    // Wire up confirm click each time to avoid duplicates by resetting handler
    const confirmBtn = modal.querySelector('#confirmPlayerNameBtn');
    const input = modal.querySelector('#playerSaveName');
    confirmBtn.onclick = () => {
        const name = (input.value || '').trim();
        if (!name) {
            try { showNotification('Please enter a name to start a new game', 'error'); } catch {}
            return;
        }
        setSaveName(name);
        $(modal).modal('hide');

        // Proceed with the same logic as before
        const elements = getElements();
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
            elements.newGameMenuButton.addEventListener('click', startNewGameFlow);
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

    queues[classification].push({ message, type, time });
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
