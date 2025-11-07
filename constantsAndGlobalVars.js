import { updateScoreDisplay } from './game.js';

const _MENU_STATE = 'menuState';
const _GAME_ACTIVE = 'gameActive';
const CLICK_RATE_WINDOW = 1000;

export let gameState;

let lastClickTime = 0;

let coins = 0;
let coinsIncrementValue = 1;
let clickTimestamps = [];
let betterClicksUpgradeRate = 1;
let autoClickerUpgradeRate = 1;
let betterClicksMultiplierRate = 1;
let autoClickerMultiplierRate = 1;

// Note-related variables
let notes = 0;
let notesIncrementValue = 1;
let noteClickTimestamps = [];
let betterNotesUpgradeRate = 1;
let autoNotesUpgradeRate = 1;
let betterNotesMultiplierRate = 1;
let autoNotesMultiplierRate = 1;

let elements;
let localization = {};
let language = 'en';
let languageSelected = 'en';
let oldLanguage = 'en';

// Flags and toggles
let audioMuted = false;
let languageChangedFlag = false;
let beginGameState = true;
let gameInProgress = false;
let autoSaveOn = false;

// =============================================
// GETTERS
// =============================================

export function getMenuState() {
    return _MENU_STATE;
}

export function getGameActive() {
    return _GAME_ACTIVE;
}

export function getCoins() {
    return coins;
}

export function getNotes() {
    return notes;
}

export function getCoinsIncrementValue() {
    return coinsIncrementValue;
}

export function getNotesIncrementValue() {
    return notesIncrementValue;
}

export function getLanguage() {
    return language;
}

export function getOldLanguage() {
    return oldLanguage;
}

export function getLanguageSelected() {
    return languageSelected;
}

export function getAudioMuted() {
    return audioMuted;
}

export function getLanguageChangedFlag() {
    return languageChangedFlag;
}

export function getBeginGameStatus() {
    return beginGameState;
}

export function getGameInProgress() {
    return gameInProgress;
}

export function getLocalization() {
    return localization;
}

export function getElements() {
    return elements;
}

export function getClickTimestamps() {
    return [...clickTimestamps]; // Return a copy to prevent direct modification
}

export function getNoteClickTimestamps() {
    return [...noteClickTimestamps]; // Return a copy to prevent direct modification
}

export function setClickTimestamps(newTimestamps) {
    if (Array.isArray(newTimestamps)) {
        clickTimestamps = [...newTimestamps]; // Store a copy to prevent external modifications
    } else {
        console.warn('setClickTimestamps: Expected an array of timestamps');
        clickTimestamps = [];
    }
}

export function setNoteClickTimestamps(newTimestamps) {
    if (Array.isArray(newTimestamps)) {
        noteClickTimestamps = [...newTimestamps];
    } else {
        console.warn('setNoteClickTimestamps: Expected an array of timestamps');
        noteClickTimestamps = [];
    }
}

export function getClickRateWindow() {
    return CLICK_RATE_WINDOW;
}

export function getLastClickTime() {
    return lastClickTime;
}

export function setLastClickTime(timestamp) {
    if (typeof timestamp === 'number' && !isNaN(timestamp)) {
        lastClickTime = timestamp;
    } else {
        console.warn('setLastClickTime: Expected a valid timestamp number');
        lastClickTime = 0;
    }
}

// =============================================
// SETTERS
// =============================================

export function setCoins(value) {
    if (typeof value === 'number' && !isNaN(value)) {
        coins = Math.max(0, value);
        updateScoreDisplay();
    } else {
        console.warn('setCoins: Expected a number');
    }
}

export function setNotes(value) {
    if (typeof value === 'number' && !isNaN(value)) {
        notes = Math.max(0, value);
        updateScoreDisplay();
    } else {
        console.warn('setNotes: Expected a number');
    }
}

export function setCoinsIncrementValue(value) {
    coinsIncrementValue = value;
}

export function setNotesIncrementValue(value) {
    notesIncrementValue = value;
}

export function setLanguage(value) {
    language = value;
}

export function setOldLanguage(value) {
    oldLanguage = value;
}

export function setLanguageSelected(value) {
    languageSelected = value;
}

export function setAudioMuted(value) {
    audioMuted = value;
}

export function setLanguageChangedFlag(value) {
    languageChangedFlag = value;
}

export function setBeginGameStatus(value) {
    beginGameState = value;
}

export function setGameInProgress(value) {
    gameInProgress = value;
}

export function setLocalization(value) {
    localization = value;
}

export function setElements() {
    elements = {
        // Menu elements
        menu: document.getElementById('menu'),
        menuTitle: document.getElementById('menuTitle'),
        newGameMenuButton: document.getElementById('newGame'),
        resumeGameMenuButton: document.getElementById('resumeFromMenu'),
        loadGameButton: document.getElementById('loadGame'),
        saveGameButton: document.getElementById('saveGame'),
        
        // Save/Load popup elements
        saveLoadPopup: document.getElementById('loadSaveGameStringPopup'),
        loadSaveGameStringTextArea: document.getElementById('loadSaveGameStringTextArea'),
        loadStringButton: document.getElementById('loadStringButton'),
        textAreaLabel: document.getElementById('textAreaLabel'),
        copyButtonSavePopup: document.getElementById('copyButtonSavePopup'),
        closeButtonSavePopup: document.getElementById('closeButtonSavePopup'),
        
        // Game UI elements
        gameContainer: document.getElementById('gameContainer'),
        pointsDisplay: document.getElementById('points'),
        pointsPerSecondDisplay: document.getElementById('pointsPerSecond'),
        mainClicker: document.getElementById('mainClicker'),
        pauseGame: document.getElementById('pauseGame'),
        
        // Old canvas elements (kept for compatibility)
        returnToMenuButton: document.getElementById('returnToMenu'),
        pauseResumeGameButton: document.getElementById('resumeGame'),
        canvas: document.getElementById('canvas'),
        canvasContainer: document.getElementById('canvasContainer'),
        buttonRow: document.getElementById('buttonRow'),
        
        // Language buttons
        btnEnglish: document.getElementById('btnEnglish'),
        btnSpanish: document.getElementById('btnSpanish'),
        btnFrench: document.getElementById('btnFrench'),
        btnGerman: document.getElementById('btnGerman'),
        btnItalian: document.getElementById('btnItalian'),
        
        // Other UI elements
        overlay: document.getElementById('overlay')
    };
}

export function setGameStateVariable(value) {
    gameState = value;
}

export function getGameStateVariable() {
    return gameState;
}

export function resetGame() {
    // Clean up existing click handler first
    if (typeof window.cleanupClickHandler === 'function') {
        window.cleanupClickHandler();
    }
    
    // Reset global variables
    resetAllVariables();
    
    // Reset upgrades if they exist
    if (window.betterClicks && typeof window.betterClicks.reset === 'function') {
        window.betterClicks.reset();
    }
    if (window.autoClicker && typeof window.autoClicker.reset === 'function') {
        window.autoClicker.reset();
    }
    
    // Set up a fresh click handler
    const mainClicker = document.getElementById('mainClicker');
    if (mainClicker) {
        // Remove all existing click handlers by cloning and replacing the element
        const newClicker = mainClicker.cloneNode(true);
        mainClicker.parentNode.replaceChild(newClicker, mainClicker);
        
        // Set up the new click handler
        if (typeof setupClickHandler === 'function') {
            setupClickHandler();
        }
    }
    
    // Update UI and button states
    updateScoreDisplay();
    if (typeof updateButtonStates === 'function') {
        updateButtonStates();
    }
    
    console.log('Game reset complete');
}

export function resetAllVariables() {
    // Reset coins and increment value
    coins = 0;
    coinsIncrementValue = 1;
    
    // Reset click tracking
    clickTimestamps = [];
    lastClickTime = 0;
    
    // Reset note-related variables
    notes = 0;
    notesIncrementValue = 1;
    noteClickTimestamps = [];
    
    // Reset game state flags
    gameInProgress = true;
    beginGameState = true;
    
    // Reset all upgrade rates
    betterClicksUpgradeRate = 1;
    autoClickerUpgradeRate = 1;
    betterClicksMultiplierRate = 1;
    autoClickerMultiplierRate = 1;
    betterNotesUpgradeRate = 1;
    autoNotesUpgradeRate = 1;
    betterNotesMultiplierRate = 1;
    autoNotesMultiplierRate = 1;
    
    // Update the score display
    updateScoreDisplay();
}

export function captureGameStatusForSaving() {
    const state = {
        version: 2, // Increment version for save file format changes
        // Core values
        language: getLanguage(),
        coins: getCoins(),
        coinsIncrementValue: getCoinsIncrementValue(),
        betterClicksMultiplierRate: getBetterClicksMultiplierRate(),
        autoClickerMultiplierRate: getAutoClickerMultiplierRate(),
        // Notes
        notes: getNotes(),
        notesIncrementValue: getNotesIncrementValue(),
        betterNotesUpgradeRate: getBetterNotesUpgradeRate(),
        autoNotesUpgradeRate: getAutoNotesUpgradeRate(),
        betterNotesMultiplierRate: getBetterNotesMultiplierRate(),
        autoNotesMultiplierRate: getAutoNotesMultiplierRate(),
        // Upgrades (optional chaining in case instances not yet initialized)
        upgrades: {
            betterClicks: {
                count: (window.betterClicks && typeof window.betterClicks.count === 'number') ? window.betterClicks.count : 0
            },
            autoClicker: {
                count: (window.autoClicker && typeof window.autoClicker.count === 'number') ? window.autoClicker.count : 0
            }
        },
        // Preferences
        theme: localStorage.getItem('theme') || null,
        soundEnabled: localStorage.getItem('soundEnabled') !== 'false'
    };
    
    // Persist UI visibility: parent containers and revealed upgrade items
    try {
        const autoContainer = document.querySelector('.autoclickers-container');
        const upgradesContainer = document.querySelector('.upgrades-container');
        const revealedItems = Array.from(document.querySelectorAll('.upgrade-item.revealed .upgrade-btn'))
            .map(btn => btn.id)
            .filter(Boolean);
        state.visibility = {
            parents: {
                autoclickers: !!(autoContainer && autoContainer.classList.contains('revealed')),
                upgrades: !!(upgradesContainer && upgradesContainer.classList.contains('revealed')),
            },
            items: revealedItems,
        };
    } catch {}
    return state;
}
export function restoreGameStatus(gameState) {
    return new Promise((resolve, reject) => {
        try {
            if (!gameState || typeof gameState !== 'object') {
                throw new Error('Invalid game state');
            }

            // Language
            if (gameState.language) setLanguage(gameState.language);

            // Core numbers (support both old 'score' and new 'coins' for backward compatibility)
            const coins = gameState.coins !== undefined ? gameState.coins : gameState.score;
            const coinsIncrementValue = gameState.coinsIncrementValue !== undefined ? gameState.coinsIncrementValue : gameState.scoreIncrementValue;
            
            if (typeof coins === 'number') setCoins(coins);
            if (typeof coinsIncrementValue === 'number') setCoinsIncrementValue(coinsIncrementValue);
            if (typeof gameState.betterClicksMultiplierRate === 'number') setBetterClicksMultiplierRate(gameState.betterClicksMultiplierRate);
            if (typeof gameState.autoClickerMultiplierRate === 'number') setAutoClickerMultiplierRate(gameState.autoClickerMultiplierRate);
            
            // Notes (only available in version 2+)
            if (gameState.version >= 2) {
                if (typeof gameState.notes === 'number') setNotes(gameState.notes);
                if (typeof gameState.notesIncrementValue === 'number') setNotesIncrementValue(gameState.notesIncrementValue);
                if (typeof gameState.betterNotesUpgradeRate === 'number') setBetterNotesUpgradeRate(gameState.betterNotesUpgradeRate);
                if (typeof gameState.autoNotesUpgradeRate === 'number') setAutoNotesUpgradeRate(gameState.autoNotesUpgradeRate);
                if (typeof gameState.betterNotesMultiplierRate === 'number') setBetterNotesMultiplierRate(gameState.betterNotesMultiplierRate);
                if (typeof gameState.autoNotesMultiplierRate === 'number') setAutoNotesMultiplierRate(gameState.autoNotesMultiplierRate);
            }

            // Theme and sound preferences
            if (gameState.theme) {
                localStorage.setItem('theme', gameState.theme);
            }
            if (typeof gameState.soundEnabled === 'boolean') {
                localStorage.setItem('soundEnabled', String(gameState.soundEnabled));
            }

            // Upgrades (requires instances to exist)
            const applyUpgrade = (inst, count) => {
                if (inst && typeof count === 'number') {
                    inst.count = Math.max(0, Math.floor(count));
                    if (typeof inst.baseCost === 'number' && typeof inst.costMultiplier === 'number') {
                        inst.currentCost = Math.floor(inst.baseCost * Math.pow(inst.costMultiplier, inst.count));
                    }
                    if (typeof inst.updateCachedValues === 'function') inst.updateCachedValues();
                    if (typeof inst.updateButtonState === 'function') inst.updateButtonState();
                    if (typeof inst.updatePPSDisplay === 'function') inst.updatePPSDisplay();
                }
            };

            if (gameState.upgrades) {
                const bcCount = gameState.upgrades?.betterClicks?.count;
                const acCount = gameState.upgrades?.autoClicker?.count;
                applyUpgrade(window.betterClicks, bcCount);
                applyUpgrade(window.autoClicker, acCount);
            }

            // Ensure UI reflects restored values
            updateScoreDisplay();
            if (typeof updateButtonStates === 'function') {
                setTimeout(updateButtonStates, 0);
            }

            // Restore UI visibility (parents and individual items)
            try {
                const vis = gameState.visibility;
                if (vis && typeof document !== 'undefined') {
                    // Parent containers
                    const autoContainer = document.querySelector('.autoclickers-container');
                    const upgradesContainer = document.querySelector('.upgrades-container');
                    if (autoContainer) {
                        if (vis.parents?.autoclickers) {
                            autoContainer.classList.remove('d-none');
                            autoContainer.classList.add('revealed');
                        } else {
                            autoContainer.classList.add('d-none');
                            autoContainer.classList.remove('revealed');
                        }
                    }
                    if (upgradesContainer) {
                        if (vis.parents?.upgrades) {
                            upgradesContainer.classList.remove('d-none');
                            upgradesContainer.classList.add('revealed');
                        } else {
                            upgradesContainer.classList.add('d-none');
                            upgradesContainer.classList.remove('revealed');
                        }
                    }
                    // Individual items
                    if (Array.isArray(vis.items)) {
                        vis.items.forEach(id => {
                            const btn = document.getElementById(id);
                            if (!btn) return;
                            const item = btn.closest('.upgrade-item');
                            if (!item) return;
                            item.classList.remove('d-none');
                            item.classList.add('revealed');
                        });
                    }
                }
            } catch {}

            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

// =============================================
// Notes Upgrade Rate Getters
// =============================================

export function getBetterNotesUpgradeRate() {
    return betterNotesUpgradeRate;
}

export function getAutoNotesUpgradeRate() {
    return autoNotesUpgradeRate;
}

export function getBetterNotesMultiplierRate() {
    return betterNotesMultiplierRate;
}

export function getAutoNotesMultiplierRate() {
    return autoNotesMultiplierRate;
}

export function setBetterNotesUpgradeRate(value) {
    if (typeof value === 'number' && value >= 0) {
        betterNotesUpgradeRate = value;
    }
}

export function setAutoNotesUpgradeRate(value) {
    if (typeof value === 'number' && value >= 0) {
        autoNotesUpgradeRate = value;
    }
}

export function setBetterNotesMultiplierRate(value) {
    if (typeof value === 'number' && value >= 1) {
        betterNotesMultiplierRate = value;
    }
}

export function setAutoNotesMultiplierRate(value) {
    if (typeof value === 'number' && value >= 1) {
        autoNotesMultiplierRate = value;
    }
}

// =============================================
// Coin Upgrade Rate Getters/Setters
// =============================================

export function getBetterClicksUpgradeRate() {
    return betterClicksUpgradeRate;
}

export function setBetterClicksUpgradeRate(value) {
    if (typeof value === 'number' && value >= 0) {
        betterClicksUpgradeRate = value;
    }
}

export function getAutoClickerUpgradeRate() {
    return autoClickerUpgradeRate;
}

export function setAutoClickerUpgradeRate(value) {
    if (typeof value === 'number' && value >= 0) {
        autoClickerUpgradeRate = value;
    }
}

export function getBetterClicksMultiplierRate() {
    return betterClicksMultiplierRate;
}

export function setBetterClicksMultiplierRate(value) {
    if (typeof value === 'number' && value >= 0) {
        betterClicksMultiplierRate = value;
    }
}

export function getAutoClickerMultiplierRate() {
    return autoClickerMultiplierRate;
}

export function setAutoClickerMultiplierRate(value) {
    if (typeof value === 'number' && value >= 0) {
        autoClickerMultiplierRate = value;
    }
}

