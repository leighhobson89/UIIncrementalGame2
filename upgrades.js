import { 
    getCoinsIncrementValue as getScoreIncrementValue, 
    setCoinsIncrementValue as setScoreIncrementValue,
    getManualCoinPressMultiplierRate,
    setManualCoinPressMultiplierRate,
    getCoinAutoClickerMultiplierRate,
    setCoinAutoClickerMultiplierRate,
    getAutoNotesMultiplierRate,
    setAutoNotesMultiplierRate
} from './constantsAndGlobalVars.js';
import { updatePriceColors } from './ui.js';
import AutoClicker from './AutoClicker.js';
import Upgrade from './Upgrade.js';
import { coinResource } from './resources/CoinResource.js';
import { noteResource } from './resources/NoteResource.js';
import { setNotesPrintable } from './constantsAndGlobalVars.js';

export const betterClicks = new Upgrade(
    'betterClicks',
    10,
    1.2,
    'Better Clicks',
    () => {
        const currentValue = getScoreIncrementValue();
        const increment = getManualCoinPressMultiplierRate();
        setScoreIncrementValue(currentValue + increment);
    },
    true,
    'betterClicks'
);

export const coinAutoClickerMultiplier = new Upgrade(
    'autoClickerMultiplier',
    100,
    1.2,
    'Coin Maker Machine',
    () => {
        const currentRate = getCoinAutoClickerMultiplierRate();
        setCoinAutoClickerMultiplierRate(currentRate + 1);
        try { autoClicker.updateButtonState(); } catch {}
    },
    true,
);

export const noteAutoClickerMultiplier = new Upgrade(
    'noteAutoClickerMultiplier',
    150,
    1.2,
    'Note Maker Machine',
    () => {
        const currentRate = getAutoNotesMultiplierRate();
        setAutoNotesMultiplierRate(currentRate + 1);
        try { noteAutoClicker.updateButtonState(); } catch {}
    },
    true
);

export const notePrintingTech = new Upgrade(
    'notePrintingTechBtn', // Match the button ID in HTML
    0,
    1,
    'Manually Print Notes',
    () => {
        setNotesPrintable(true);
        // Show the note clicker button when this upgrade is purchased
        const noteClicker = document.getElementById('noteClicker');
        if (noteClicker) {
            noteClicker.classList.remove('d-none');
            console.log('[Upgrade] Note clicker button shown');
        }
        
        // Show the note clicker in the UI
        const noteClickerUI = document.querySelector('.clicker-container #noteClicker');
        if (noteClickerUI) {
            noteClickerUI.classList.remove('d-none');
        }
    },
    false,
    'notePrintingTech'
);

export const betterClicksMultiplier = new Upgrade(
    'betterClicksMultiplier',
    150,
    1.15,
    'Better Clicks Multiplier',
    () => {
        const currentRate = getManualCoinPressMultiplierRate();
        setManualCoinPressMultiplierRate(currentRate + 1);
    },
    true
);

export const autoClicker = new AutoClicker(coinResource, {
    id: 'autoClicker',
    nameKey: 'autoClicker',
    descriptionKey: 'autoClickerDesc',
});

export const noteAutoClicker = new AutoClicker(noteResource, {
    id: 'noteAutoClicker',
    nameKey: 'noteAutoClicker',
    descriptionKey: 'noteAutoClickerDesc',
    multiplierGetter: getAutoNotesMultiplierRate,
});

function updateAllPriceColors() {
    updatePriceColors([betterClicks, betterClicksMultiplier, coinAutoClickerMultiplier, noteAutoClickerMultiplier, notePrintingTech]);
}

const originalUpdateButtonState = Upgrade.prototype.updateButtonState;
Upgrade.prototype.updateButtonState = function() {
    originalUpdateButtonState.call(this);
    updateAllPriceColors();
};

if (typeof window !== 'undefined') {
    window.betterClicks = betterClicks;
    window.autoClicker = autoClicker;
    window.noteAutoClicker = noteAutoClicker;
    window.coinAutoClickerMultiplier = coinAutoClickerMultiplier;
    window.betterClicksMultiplier = betterClicksMultiplier;
    window.noteAutoClickerMultiplier = noteAutoClickerMultiplier;
    window.notePrintingTech = notePrintingTech;
}

export function updateAutoclickers(deltaTime) {
    autoClicker.update(deltaTime);
    noteAutoClicker.update(deltaTime);
}

export function getCoinsPerSecond() {
    return autoClicker.coinsPerSecond;
}

export function refreshUpgradeUI() {
    try {
        betterClicks.updateButtonState();
        betterClicksMultiplier.updateButtonState();
        autoClicker.updateButtonState();
        coinAutoClickerMultiplier.updateButtonState();
        noteAutoClicker.updateButtonState();
        noteAutoClickerMultiplier.updateButtonState();
    } catch (e) {
        console.warn('refreshUpgradeUI: could not update all upgrades', e);
    }
}

export function initUpgrades() {
    betterClicks.init();
    betterClicksMultiplier.init();
    autoClicker.init();
    coinAutoClickerMultiplier.init();
    noteAutoClicker.init();
    noteAutoClickerMultiplier.init();
    
    // Initialize note printing tech upgrade
    notePrintingTech.init();
    
    // Hide the upgrade by default - it will be shown when a note bonus is collected
    const upgradeElement = document.querySelector(`.upgrade-item[data-upgrade-id="${notePrintingTech.id}"]`);
    if (upgradeElement) {
        upgradeElement.classList.add('d-none');
    }
    
    updateAllPriceColors();
}