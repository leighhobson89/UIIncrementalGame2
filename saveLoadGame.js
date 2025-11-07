import {captureGameStatusForSaving, restoreGameStatus, getElements, getLanguage, setLanguageChangedFlag, getLanguageChangedFlag} from './constantsAndGlobalVars.js';
import {localize} from './localization.js';
import { handleLanguageChange } from './ui.js';
import { refreshUpgradeUI, initUpgrades } from './upgrades.js';

export function saveGame() {
    const gameState = captureGameStatusForSaving();
    const serializedGameState = JSON.stringify(gameState);
    let compressed = LZString.compressToEncodedURIComponent(serializedGameState);
    const blob = new Blob([compressed], {
        type: 'text/plain'
    });
    const url = URL.createObjectURL(blob);

    document.querySelector('.save-load-header').innerHTML = `${localize('headerStringSave', getLanguage())}`;
    document.getElementById('copyButtonSavePopup').classList.remove('d-none');
    document.getElementById('loadStringButton').classList.add('d-none');
    getElements().saveLoadPopup.classList.remove('d-none');
    //document.getElementById('overlay').classList.remove('d-none');

    const reader = new FileReader();
    reader.onload = function(event) {
        getElements().loadSaveGameStringTextArea.value = `${event.target.result}`;
        getElements().loadSaveGameStringTextArea.readOnly = true;
    };
    reader.readAsText(blob);
}

export function copySaveStringToClipBoard() {
    const textArea = getElements().loadSaveGameStringTextArea;
    textArea.select();
    textArea.setSelectionRange(0, 99999);

    try {
        navigator.clipboard.writeText(textArea.value)
            .then(() => {
            })
            .catch(err => {
                alert(err);
            })
            .finally(() => {
                textArea.setSelectionRange(0, 0);
            })
    } catch (err) {
        alert(err);
    }
}

export function loadGameOption() {
    getElements().loadSaveGameStringTextArea.readOnly = false;
    document.querySelector('.save-load-header').innerHTML = `${localize('headerStringLoad', getLanguage())}`;
    document.getElementById('loadStringButton').classList.remove('d-none');
    document.getElementById('copyButtonSavePopup').classList.add('d-none');
    getElements().saveLoadPopup.classList.remove('d-none');
    document.getElementById('overlay').classList.remove('d-none');
    getElements().loadSaveGameStringTextArea.value = "";
    getElements().loadSaveGameStringTextArea.placeholder = `${localize('textAreaLabel', getLanguage())}`;
}

export function loadGame() {
    const textArea = document.getElementById('loadSaveGameStringTextArea');
    if (textArea) {
        const string = {
            target: {
                result: textArea.value
            }
        };
        return handleFileSelectAndInitialiseLoadedGame(null, true, string);
    } else {
        return Promise.reject("Text area not found.");
    }
}

function handleFileSelectAndInitialiseLoadedGame(event, stringLoad, string) {
    return new Promise((resolve, reject) => {
        const processGameData = (compressed) => {
            try {
                // Validate the compressed string before processing
                if (!validateSaveString(compressed)) {
                    alert('Invalid game data string. Please check and try again.');
                    return reject('Invalid game data string');
                }

                let decompressedJson = LZString.decompressFromEncodedURIComponent(compressed);
                let gameState = JSON.parse(decompressedJson);

                getElements().overlay.classList.add('d-none');

                initialiseLoadedGame(gameState).then(async () => {
                    setLanguageChangedFlag(true);
                    checkForLanguageChange();
                    // If user hasn't started a game yet, ensure upgrades are initialized
                    try {
                        initUpgrades();
                    } catch {}
                    // Re-apply state now that upgrades exist (ensures counts/costs apply to UI)
                    try {
                        await restoreGameStatus(gameState);
                    } catch {}
                    // Ensure upgrade buttons/descriptions reflect restored multipliers and values
                    refreshUpgradeUI();
                    // Auto-close the load dialog and overlay, and enable Resume/Save buttons
                    const els = getElements();
                    if (els.overlay) els.overlay.classList.add('d-none');
                    if (els.saveLoadPopup) els.saveLoadPopup.classList.add('d-none');
                    if (els.resumeGameMenuButton) {
                        els.resumeGameMenuButton.classList.remove('disabled');
                        els.resumeGameMenuButton.classList.add('btn-primary');
                    }
                    if (els.saveGameButton) {
                        els.saveGameButton.classList.remove('disabled');
                        els.saveGameButton.classList.add('btn-primary');
                    }
                    // Show themed load success dialog
                    showSuccessDialog('Load Successful', 'Game loaded successfully');
                    // Game state is now properly initialized
                    resolve();
                }).catch(error => {
                    console.error('Error initializing game:', error);
                    alert('Error initializing game. Please make sure the data is correct.');
                    reject(error);
                });

            } catch (error) {
                console.error('Error loading game:', error);
                alert('Error loading game. Please make sure the file contains valid game data.');
                reject(error);
            }
        };

        if (stringLoad) {
            try {
                processGameData(string.target.result);
            } catch (error) {
                console.error('Error processing string:', error);
                alert('Error processing string. Please make sure the string is valid.');
                reject(error);
            }
        } else {
            const file = event.target.files[0];
            if (!file) {
                return reject('No file selected');
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    processGameData(e.target.result);
                } catch (error) {
                    console.error('Error reading file:', error);
                    alert('Error reading file. Please make sure the file contains valid game data.');
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject('Error reading file');
            };

            reader.readAsText(file);
        }
    });
}

function validateSaveString(compressed) {
    let decompressedJson = LZString.decompressFromEncodedURIComponent(compressed);
    JSON.parse(decompressedJson);
    return decompressedJson !== null;
}

async function initialiseLoadedGame(gameState) {    
    await restoreGameStatus(gameState);
}

export function checkForLanguageChange() {
    if (getLanguageChangedFlag()) {
        handleLanguageChange(getLanguage());
    }
    setLanguageChangedFlag(false);
}

function showSuccessDialog(title, message) {
    const overlay = document.getElementById('overlay');
    const popup = document.getElementById('successPopup');
    const header = document.getElementById('successHeader');
    const msg = document.getElementById('successMessage');
    const closeBtn = document.getElementById('successCloseButton');
    if (!popup || !header || !msg || !closeBtn) return;
    header.textContent = title || 'Success';
    msg.textContent = message || '';
    if (overlay) overlay.classList.remove('d-none');
    popup.classList.remove('d-none');
    const close = () => {
        popup.classList.add('d-none');
        if (overlay) overlay.classList.add('d-none');
        closeBtn.removeEventListener('click', close);
    };
    closeBtn.addEventListener('click', close);
}