import { formatNumber } from './utils/numberFormatter.js';
import { updateScoreDisplay } from './game.js';

const _MENU_STATE = 'menuState';
const _GAME_ACTIVE = 'gameActive';
const CLICK_RATE_WINDOW = 1000;

export let gameState;

let lastClickTime = 0;

let score = 0;
let scoreIncrementValue = 1;
let clickTimestamps = [];
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

export function getScore() {
    return score;
}

export function getScoreIncrementValue() {
    return scoreIncrementValue;
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

export function setClickTimestamps(newTimestamps) {
    if (Array.isArray(newTimestamps)) {
        clickTimestamps = [...newTimestamps]; // Store a copy to prevent external modifications
    } else {
        console.warn('setClickTimestamps: Expected an array of timestamps');
        clickTimestamps = [];
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

export function setScore(value) {
    score = value;
    updateScoreDisplay();
    
    // Update button states when score changes
    if (typeof updateButtonStates === 'function') {
        setTimeout(updateButtonStates, 0);
    }
}

export function setScoreIncrementValue(value) {
    scoreIncrementValue = value;
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
    // Reset score and increment value
    score = 0;
    scoreIncrementValue = 1;
    
    // Reset click tracking
    clickTimestamps = [];
    lastClickTime = 0;
    
    // Reset game state flags
    gameInProgress = true;
    beginGameState = true;
    
    // Update the score display
    updateScoreDisplay();
}

export function captureGameStatusForSaving() {
    let gameState = {};

    // Game variables

    // Flags

    // UI elements

    gameState.language = getLanguage();

    return gameState;
}
export function restoreGameStatus(gameState) {
    return new Promise((resolve, reject) => {
        try {
            // Game variables

            // Flags

            // UI elements

            setLanguage(gameState.language);

            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

