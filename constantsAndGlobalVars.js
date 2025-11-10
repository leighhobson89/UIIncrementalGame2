import { updateScoreDisplay } from './game.js';

// CONSTANTS
const _MENU_STATE = 'menuState';
const _GAME_ACTIVE = 'gameActive';
const CLICK_RATE_WINDOW = 1000;

// GLOBAL VARIABLES
export let gameState;
let lastClickTime = 0;

let coins = 0;
let coinsIncrementValue = 1;
let coinClickTimestamps = [];
let manualCoinPressUpgradeRate = 1;
let autoCoinClickerUpgradeRate = 1;
let manualCoinPressMultiplierRate = 1;
let coinAutoClickerMultiplierRate = 1;

let notes = 0;
let notesIncrementValue = 1;
let noteClickTimestamps = [];
let manualNotePrinterUpgradeRate = 1;
let autoNotesUpgradeRate = 1;
let manualNotePrinterMultiplierRate = 1;
let autoNotesMultiplierRate = 1;

let elements;
let localization = {};
// Initialize language from localStorage or use browser language as fallback
const getInitialLanguage = () => {
    const savedLanguage = localStorage.getItem('languagePreferenceWealthInc');
    const browserLanguage = navigator.language.split('-')[0];
    const supportedLanguages = ['en', 'es', 'de', 'it', 'fr'];
    return savedLanguage || (supportedLanguages.includes(browserLanguage) ? browserLanguage : 'en');
};

let language = getInitialLanguage();
let languageSelected = getInitialLanguage();
let oldLanguage = getInitialLanguage();

// Flags
let audioMuted = false;
let languageChangedFlag = false;
let beginGameState = true;
let gameInProgress = false;
let notesPrintable = false;

// =============================================
// Getter/Setter pairs
// =============================================

// Coins
export function getCoins() { return coins; }
export function setCoins(value) {
    if (typeof value === 'number' && !isNaN(value)) { coins = Math.max(0, value); updateScoreDisplay(); } else { console.warn('setCoins: Expected a number'); }
}

// Notes
export function getNotes() { return notes; }
export function setNotes(value) {
    if (typeof value === 'number' && !isNaN(value)) { notes = Math.max(0, value); updateScoreDisplay(); } else { console.warn('setNotes: Expected a number'); }
}

// Coins Increment Value
export function getCoinsIncrementValue() { return coinsIncrementValue; }
export function setCoinsIncrementValue(value) { coinsIncrementValue = value; }

// Notes Increment Value
export function getNotesIncrementValue() { return notesIncrementValue; }
export function setNotesIncrementValue(value) { notesIncrementValue = value; }

// Language
export function getLanguage() { return language; }
export function setLanguage(value) { language = value; }

// Old Language
export function getOldLanguage() { return oldLanguage; }
export function setOldLanguage(value) { oldLanguage = value; }

// Language Selected
export function getLanguageSelected() { return languageSelected; }
export function setLanguageSelected(value) { languageSelected = value; }

// Audio Muted
export function getAudioMuted() { return audioMuted; }
export function setAudioMuted(value) { audioMuted = value; }

// Language Changed Flag
export function getLanguageChangedFlag() { return languageChangedFlag; }
export function setLanguageChangedFlag(value) { languageChangedFlag = value; }

// Begin Game Status
export function getBeginGameStatus() { return beginGameState; }
export function setBeginGameStatus(value) { beginGameState = value; }

// Game In Progress
export function getGameInProgress() { return gameInProgress; }
export function setGameInProgress(value) { gameInProgress = value; }

// Localization
export function getLocalization() { return localization; }
export function setLocalization(value) { localization = value; }

// Elements
export function getElements() { return elements; }
export function setElements() {
    elements = {
        menu: document.getElementById('menu'),
        menuTitle: document.getElementById('menuTitle'),
        newGameMenuButton: document.getElementById('newGame'),
        resumeGameMenuButton: document.getElementById('resumeFromMenu'),
        loadGameButton: document.getElementById('loadGame'),
        saveGameButton: document.getElementById('saveGame'),
        saveLoadPopup: document.getElementById('loadSaveGameStringPopup'),
        loadSaveGameStringTextArea: document.getElementById('loadSaveGameStringTextArea'),
        loadStringButton: document.getElementById('loadStringButton'),
        textAreaLabel: document.getElementById('textAreaLabel'),
        copyButtonSavePopup: document.getElementById('copyButtonSavePopup'),
        closeButtonSavePopup: document.getElementById('closeButtonSavePopup'),
        gameContainer: document.getElementById('gameContainer'),
        pointsDisplay: document.getElementById('points'),
        pointsPerSecondDisplay: document.getElementById('pointsPerSecond'),
        mainClicker: document.getElementById('mainClicker'),
        pauseGame: document.getElementById('pauseGame'),
        returnToMenuButton: document.getElementById('returnToMenu'),
        pauseResumeGameButton: document.getElementById('resumeGame'),
        canvas: document.getElementById('canvas'),
        canvasContainer: document.getElementById('canvasContainer'),
        buttonRow: document.getElementById('buttonRow'),
        btnEnglish: document.getElementById('btnEnglish'),
        btnSpanish: document.getElementById('btnSpanish'),
        btnFrench: document.getElementById('btnFrench'),
        btnGerman: document.getElementById('btnGerman'),
        btnItalian: document.getElementById('btnItalian'),
        overlay: document.getElementById('overlay')
    };
}

// Game State Variable
export function getGameStateVariable() { return gameState; }
export function setGameStateVariable(value) { gameState = value; }

// Coin Click Timestamps
export function getCoinClickTimestamps() { return [...coinClickTimestamps]; }
export function setCoinClickTimestamps(newTimestamps) {
    if (Array.isArray(newTimestamps)) { coinClickTimestamps = [...newTimestamps]; } else { console.warn('setClickTimestamps: Expected an array of timestamps'); coinClickTimestamps = []; }
}

// Note Click Timestamps
export function getNoteClickTimestamps() { return [...noteClickTimestamps]; }
export function setNoteClickTimestamps(newTimestamps) {
    if (Array.isArray(newTimestamps)) { noteClickTimestamps = [...newTimestamps]; } else { console.warn('setNoteClickTimestamps: Expected an array of timestamps'); noteClickTimestamps = []; }
}

// Last Click Time
export function getLastClickTime() { return lastClickTime; }
export function setLastClickTime(timestamp) {
    if (typeof timestamp === 'number' && !isNaN(timestamp)) { lastClickTime = timestamp; } else { console.warn('setLastClickTime: Expected a valid timestamp number'); lastClickTime = 0; }
}

// Manual Note Printer Upgrade Rate
export function getManualNotePrinterUpgradeRate() { return manualNotePrinterUpgradeRate; }
export function setManualNotePrinterUpgradeRate(value) { if (typeof value === 'number' && value >= 0) { manualNotePrinterUpgradeRate = value; } }

// Auto Notes Upgrade Rate
export function getAutoNotesUpgradeRate() { return autoNotesUpgradeRate; }
export function setAutoNotesUpgradeRate(value) { if (typeof value === 'number' && value >= 0) { autoNotesUpgradeRate = value; } }

// Manual Note Printer Multiplier Rate
export function getManualNotePrinterMultiplierRate() { return manualNotePrinterMultiplierRate; }
export function setManualNotePrinterMultiplierRate(value) { if (typeof value === 'number' && value >= 1) { manualNotePrinterMultiplierRate = value; } }

// Auto Notes Multiplier Rate
export function getAutoNotesMultiplierRate() { return autoNotesMultiplierRate; }
export function setAutoNotesMultiplierRate(value) { if (typeof value === 'number' && value >= 1) { autoNotesMultiplierRate = value; } }

// Manual Coin Press Upgrade Rate
export function getManualCoinPressUpgradeRate() { return manualCoinPressUpgradeRate; }
export function setManualCoinPressUpgradeRate(value) { if (typeof value === 'number' && value >= 0) { manualCoinPressUpgradeRate = value; } }

// Auto Coin Clicker Upgrade Rate
export function getCoinAutoClickerUpgradeRate() { return autoCoinClickerUpgradeRate; }
export function setCoinAutoClickerUpgradeRate(value) { if (typeof value === 'number' && value >= 0) { autoCoinClickerUpgradeRate = value; } }

// Manual Coin Press Multiplier Rate
export function getManualCoinPressMultiplierRate() { return manualCoinPressMultiplierRate; }
export function setManualCoinPressMultiplierRate(value) { if (typeof value === 'number' && value >= 0) { manualCoinPressMultiplierRate = value; } }

// Coin Auto Clicker Multiplier Rate
export function getCoinAutoClickerMultiplierRate() { return coinAutoClickerMultiplierRate; }
export function setCoinAutoClickerMultiplierRate(value) { if (typeof value === 'number' && value >= 0) { coinAutoClickerMultiplierRate = value; } }

// Notes Printable
export function getNotesPrintable() { return notesPrintable; }
export function setNotesPrintable(value) { notesPrintable = value; }

// =============================================
// Save Name Management
// =============================================
let currentSaveNameWealthInc = 'My Save';

export function getSaveName() {
    try {
        return localStorage.getItem('currentSaveNameWealthInc') || currentSaveNameWealthInc;
    } catch (e) {
        return currentSaveNameWealthInc;
    }
}

export function setSaveName(name) {
    currentSaveNameWealthInc = name;
    try {
        localStorage.setItem('currentSaveNameWealthInc', name);
    } catch (e) {
        // Ignore local storage errors
    }
}

// =============================================
// Bottom functions
// =============================================

export function getMenuState() { return _MENU_STATE; }
export function getGameActive() { return _GAME_ACTIVE; }
export function getClickRateWindow() { return CLICK_RATE_WINDOW; }

export function resetGame() {
    if (typeof window.cleanupClickHandler === 'function') { window.cleanupClickHandler(); }
    resetAllVariables();
    if (window.betterClicks && typeof window.betterClicks.reset === 'function') { window.betterClicks.reset(); }
    if (window.autoClicker && typeof window.autoClicker.reset === 'function') { window.autoClicker.reset(); }
    const mainClicker = document.getElementById('mainClicker');
    if (mainClicker) {
        const newClicker = mainClicker.cloneNode(true);
        mainClicker.parentNode.replaceChild(newClicker, mainClicker);
        if (typeof setupClickHandler === 'function') { setupClickHandler(); }
    }
    updateScoreDisplay();
    if (typeof updateButtonStates === 'function') { updateButtonStates(); }
    console.log('Game reset complete');
}

export function resetAllVariables() {
    coins = 0; coinsIncrementValue = 1; coinClickTimestamps = []; lastClickTime = 0;
    notes = 0; notesIncrementValue = 1; noteClickTimestamps = [];
    gameInProgress = true; beginGameState = true;
    manualCoinPressUpgradeRate = 1; autoCoinClickerUpgradeRate = 1; manualCoinPressMultiplierRate = 1; coinAutoClickerMultiplierRate = 1;
    manualNotePrinterUpgradeRate = 1; autoNotesUpgradeRate = 1; manualNotePrinterMultiplierRate = 1; autoNotesMultiplierRate = 1; notesPrintable = false;
    updateScoreDisplay();
}

export function captureGameStatusForSaving() {
    const state = {
        version: 2,
        language: getLanguage(),
        coins: getCoins(),
        coinsIncrementValue: getCoinsIncrementValue(),
        betterClicksMultiplierRate: getManualCoinPressMultiplierRate(),
        autoClickerMultiplierRate: getCoinAutoClickerMultiplierRate(),
        notes: getNotes(),
        notesIncrementValue: getNotesIncrementValue(),
        betterNotesUpgradeRate: getManualNotePrinterUpgradeRate(),
        autoNotesUpgradeRate: getAutoNotesUpgradeRate(),
        betterNotesMultiplierRate: getManualNotePrinterMultiplierRate(),
        autoNotesMultiplierRate: getAutoNotesMultiplierRate(),
        upgrades: {
            betterClicks: { count: (window.betterClicks && typeof window.betterClicks.count === 'number') ? window.betterClicks.count : 0 },
            autoClicker: { count: (window.autoClicker && typeof window.autoClicker.count === 'number') ? window.autoClicker.count : 0 }
        },
        theme: localStorage.getItem('theme') || null,
        soundEnabled: localStorage.getItem('soundEnabled') !== 'false',
        notesPrintable: getNotesPrintable()
    };
    try {
        const autoContainer = document.querySelector('.autoclickers-container');
        const upgradesContainer = document.querySelector('.upgrades-container');
        const revealedItems = Array.from(document.querySelectorAll('.upgrade-item.revealed .upgrade-btn')).map(btn => btn.id).filter(Boolean);
        state.visibility = { parents: { autoclickers: !!(autoContainer && autoContainer.classList.contains('revealed')), upgrades: !!(upgradesContainer && upgradesContainer.classList.contains('revealed')) }, items: revealedItems };
    } catch {}
    return state;
}

export function restoreGameStatus(gameState) {
    return new Promise((resolve, reject) => {
        try {
            if (!gameState || typeof gameState !== 'object') { throw new Error('Invalid game state'); }
            if (gameState.language) setLanguage(gameState.language);
            const coins = gameState.coins !== undefined ? gameState.coins : gameState.score;
            const coinsIncrementValue = gameState.coinsIncrementValue !== undefined ? gameState.coinsIncrementValue : gameState.scoreIncrementValue;
            if (typeof coins === 'number') setCoins(coins);
            if (typeof coinsIncrementValue === 'number') setCoinsIncrementValue(coinsIncrementValue);
            if (typeof gameState.betterClicksMultiplierRate === 'number') setManualCoinPressMultiplierRate(gameState.betterClicksMultiplierRate);
            if (typeof gameState.autoClickerMultiplierRate === 'number') setCoinAutoClickerMultiplierRate(gameState.autoClickerMultiplierRate);
            if (gameState.version >= 2) {
                if (typeof gameState.notes === 'number') setNotes(gameState.notes);
                if (typeof gameState.notesIncrementValue === 'number') setNotesIncrementValue(gameState.notesIncrementValue);
                if (typeof gameState.betterNotesUpgradeRate === 'number') setManualNotePrinterUpgradeRate(gameState.betterNotesUpgradeRate);
                if (typeof gameState.autoNotesUpgradeRate === 'number') setAutoNotesUpgradeRate(gameState.autoNotesUpgradeRate);
                if (typeof gameState.betterNotesMultiplierRate === 'number') setManualNotePrinterMultiplierRate(gameState.betterNotesMultiplierRate);
                if (typeof gameState.autoNotesMultiplierRate === 'number') setAutoNotesMultiplierRate(gameState.autoNotesMultiplierRate);
            }
            if (gameState.theme) { localStorage.setItem('theme', gameState.theme); }
            if (typeof gameState.soundEnabled === 'boolean') { localStorage.setItem('soundEnabled', String(gameState.soundEnabled)); }
            if (typeof gameState.notesPrintable === 'boolean') { setNotesPrintable(gameState.notesPrintable); }
            const applyUpgrade = (inst, count) => {
                if (inst && typeof count === 'number') {
                    inst.count = Math.max(0, Math.floor(count));
                    if (typeof inst.baseCost === 'number' && typeof inst.costMultiplier === 'number') { inst.currentCost = Math.floor(inst.baseCost * Math.pow(inst.costMultiplier, inst.count)); }
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
            updateScoreDisplay();
            if (typeof updateButtonStates === 'function') { setTimeout(updateButtonStates, 0); }
            try {
                const vis = gameState.visibility;
                if (vis && typeof document !== 'undefined') {
                    const autoContainer = document.querySelector('.autoclickers-container');
                    const upgradesContainer = document.querySelector('.upgrades-container');
                    if (autoContainer) {
                        if (vis.parents?.autoclickers) { autoContainer.classList.remove('d-none'); autoContainer.classList.add('revealed'); } else { autoContainer.classList.add('d-none'); autoContainer.classList.remove('revealed'); }
                    }
                    if (upgradesContainer) {
                        if (vis.parents?.upgrades) { upgradesContainer.classList.remove('d-none'); upgradesContainer.classList.add('revealed'); } else { upgradesContainer.classList.add('d-none'); upgradesContainer.classList.remove('revealed'); }
                    }
                    if (Array.isArray(vis.items)) {
                        vis.items.forEach(id => { const btn = document.getElementById(id); if (!btn) return; const item = btn.closest('.upgrade-item'); if (!item) return; item.classList.remove('d-none'); item.classList.add('revealed'); });
                    }
                }
            } catch {}
            resolve();
        } catch (error) { reject(error); }
    });
}
