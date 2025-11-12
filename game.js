import { localize } from './localization.js';
import { 
    setGameStateVariable, 
    getMenuState, 
    getGameActive,
    getElements, 
    getLanguage, 
    getGameInProgress, 
    gameState,
    getCoins,
    setCoins,
    getCoinsIncrementValue,
    setCoinsIncrementValue,
    getCoinClickTimestamps,
    setCoinClickTimestamps,
    getClickRateWindow,
    setLastClickTime,
    getNotes,
    setNotes,
    getNotesIncrementValue,
    getNoteClickTimestamps,
    setNoteClickTimestamps,
    getNotesPrintable,
    getFillDuration
} from './constantsAndGlobalVars.js';
import { testNumberFormatter, formatNumber } from './utils/numberFormatter.js';
import { 
    initUpgrades, 
    betterClicks, 
    autoClicker, 
    betterClicksMultiplier, 
    coinAutoClickerMultiplier,
    noteAutoClicker,
    noteAutoClickerMultiplier
} from './upgrades.js';
import { audioManager } from './AudioManager.js';

let coinClickHandler = null;
let noteClickHandler = null;
let mainClicker = null;
let noteClicker = null;
let coinClickProgress = 9; // Start at 9 to make first click instant
let noteClickProgress = 9; // Start at 9 to make first click instant
let coinAnimationId = null;
let noteAnimationId = null;
let coinAnimationStart = 0;
let noteAnimationStart = 0;

function animateCoinButton(timestamp) {
    if (!coinAnimationStart) coinAnimationStart = timestamp;
    const elapsed = timestamp - coinAnimationStart;
    const fillDuration = getFillDuration();
    const progress = Math.min(elapsed / fillDuration, 1);
    
    const fill = mainClicker?.querySelector('.progress-fill');
    if (fill) {
        fill.style.height = `${progress * 100}%`;
    }
    
    if (progress < 1) {
        coinAnimationId = requestAnimationFrame(animateCoinButton);
    } else {
        // Animation complete, award the coin
        const current = getCoins();
        const award = getCoinsIncrementValue();
        setCoins(current + award);
        
        // Reset animation
        if (fill) fill.style.height = '0%';
        coinAnimationStart = 0;
        coinAnimationId = null;
        
        // Visual feedback
        if (mainClicker) {
            mainClicker.classList.add('clicked');
            setTimeout(() => mainClicker.classList.remove('clicked'), 100);
            
            // Show +X coins text
            const fx = document.createElement('div');
            fx.className = 'bonus-float';
            fx.textContent = `+${award}`;
            fx.style.left = `${mainClicker.getBoundingClientRect().left + mainClicker.offsetWidth/2}px`;
            fx.style.top = `${mainClicker.getBoundingClientRect().top - 10}px`;
            document.body.appendChild(fx);
            setTimeout(() => fx.remove(), 1200);
            
            // Show coin animation
            const coinOverlay = document.getElementById('coinOverlay');
            const numCoins = Math.min(Math.ceil(award), 8);
            
            for (let i = 0; i < numCoins; i++) {
                const coin = document.createElement('img');
                coin.src = 'assets/images/coin.png';
                coin.className = 'coin-animation';
                
                const delay = i * 50 + Math.random() * 50;
                coin.style.animationDelay = `${delay}ms`;
                
                const spread = 60 + (numCoins * 5);
                const angle = (i / numCoins) * Math.PI * 2;
                const offsetX = Math.cos(angle) * spread * (Math.random() * 0.5 + 0.5);
                const offsetY = Math.sin(angle) * spread * (Math.random() * 0.5 + 0.5);
                
                const rect = mainClicker.getBoundingClientRect();
                coin.style.left = `${rect.left + rect.width/2 + offsetX}px`;
                coin.style.top = `${rect.top + rect.height/2 + offsetY}px`;
                
                const direction = Math.random() > 0.5 ? 'Right' : 'Left';
                coin.style.animationName = `coinFly${direction}`;
            
                const duration = 0.8 + Math.random() * 0.4;
                coin.style.animationDuration = `${duration}s`;
                
                const scale = 0.7 + Math.random() * 0.3;
                coin.style.transform = `scale(${scale})`;
                
                coinOverlay.appendChild(coin);
                
                setTimeout(() => {
                    if (coin.parentNode === coinOverlay) {
                        coinOverlay.removeChild(coin);
                    }
                }, (duration * 1000) + delay);
            }
        }
        
        audioManager.playFx('coinJingle');
        
        // Don't restart animation automatically, wait for next click
    }
}

function animateNoteButton(timestamp) {
    if (!noteAnimationStart) noteAnimationStart = timestamp;
    const elapsed = timestamp - noteAnimationStart;
    const fillDuration = getFillDuration();
    const progress = Math.min(elapsed / fillDuration, 1);
    
    const fill = noteClicker?.querySelector('.progress-fill');
    if (fill) {
        fill.style.height = `${progress * 100}%`;
    }
    
    if (progress < 1) {
        noteAnimationId = requestAnimationFrame(animateNoteButton);
    } else {
        // Animation complete, award the note
        const currentNotes = getNotes();
        const noteAward = getNotesIncrementValue();
        setNotes(currentNotes + noteAward);
        
        // Reset animation
        if (fill) fill.style.height = '0%';
        noteAnimationStart = 0;
        noteAnimationId = null;
        
        // Visual feedback
        if (noteClicker) {
            noteClicker.classList.add('clicked');
            setTimeout(() => noteClicker.classList.remove('clicked'), 100);
            
            // Show +X notes text
            const fx = document.createElement('div');
            fx.className = 'bonus-float';
            fx.textContent = `+${noteAward} Note${noteAward !== 1 ? 's' : ''}`;
            fx.style.left = `${noteClicker.getBoundingClientRect().left + noteClicker.offsetWidth/2}px`;
            fx.style.top = `${noteClicker.getBoundingClientRect().top - 10}px`;
            fx.style.color = '#4caf50';
            document.body.appendChild(fx);
            setTimeout(() => fx.remove(), 1200);
            
            // Show note animation
            const noteOverlay = document.getElementById('coinOverlay');
            const numNotes = Math.min(Math.ceil(noteAward), 8);
            
            for (let i = 0; i < numNotes; i++) {
                const note = document.createElement('img');
                note.src = 'assets/images/dollar_banknote.png';
                note.className = 'coin-animation';
                
                const delay = i * 50 + Math.random() * 50;
                note.style.animationDelay = `${delay}ms`;
                
                const spread = 80 + (numNotes * 5);
                const angle = (i / numNotes) * Math.PI * 2;
                const offsetX = Math.cos(angle) * spread * (Math.random() * 0.5 + 0.5);
                const offsetY = Math.sin(angle) * spread * (Math.random() * 0.5 + 0.5);
                
                const rect = noteClicker.getBoundingClientRect();
                note.style.left = `${rect.left + rect.width/2 + offsetX}px`;
                note.style.top = `${rect.top + rect.height/2 + offsetY}px`;
                
                const direction = Math.random() > 0.5 ? 'Right' : 'Left';
                note.style.animationName = `coinFly${direction}`;
            
                const duration = 0.8 + Math.random() * 0.4;
                note.style.animationDuration = `${duration}s`;
                
                const rotation = (Math.random() * 60) - 30;
                const scale = 0.8 + Math.random() * 0.4;
                note.style.transform = `rotate(${rotation}deg) scale(${scale})`;

                note.style.width = '40px';
                note.style.height = '40px';
                
                noteOverlay.appendChild(note);
                
                setTimeout(() => {
                    if (note.parentNode === noteOverlay) {
                        noteOverlay.removeChild(note);
                    }
                }, (duration * 1000) + delay);
            }
        }
        
        if (audioManager && !audioManager.muted) {
            audioManager.playFx('buxCollect');
        }
        
        // Don't restart animation automatically, wait for next click
    }
}

function createCoinClickHandler() {
    return function(event) {
        // Initialize fill element if it doesn't exist
        let fill = this.querySelector('.progress-fill');
        if (!fill) {
            fill = document.createElement('div');
            fill.className = 'progress-fill';
            this.appendChild(fill);
        }
        
        // Track the manual click
        trackManualClick();
        
        // If animation is not running, start it
        if (!coinAnimationId) {
            coinAnimationStart = performance.now();
            coinAnimationId = requestAnimationFrame(animateCoinButton);
            
            // Visual feedback for starting the fill
            this.classList.add('clicked');
            setTimeout(() => this.classList.remove('clicked'), 100);
        }
    };
}

function createNoteClickHandler() {
    return function(event) {
        // Initialize fill element if it doesn't exist
        let fill = this.querySelector('.progress-fill');
        if (!fill) {
            fill = document.createElement('div');
            fill.className = 'progress-fill';
            this.appendChild(fill);
        }
        
        // Track the manual click
        trackManualNoteClick();
        
        // If animation is not running, start it
        if (!noteAnimationId) {
            noteAnimationStart = performance.now();
            noteAnimationId = requestAnimationFrame(animateNoteButton);
            
            // Visual feedback for starting the fill
            this.classList.add('clicked');
            setTimeout(() => this.classList.remove('clicked'), 100);
            
            // No visual feedback when starting to fill, will show when complete
        }
    };
}

function setupClickHandler() {
    cleanupClickHandlers();
    
    mainClicker = document.getElementById('mainClicker');
    noteClicker = document.getElementById('noteClicker');
    
    if (!mainClicker || !noteClicker) return;
    
    coinClickHandler = createCoinClickHandler();
    noteClickHandler = createNoteClickHandler();
    
    mainClicker.addEventListener('click', coinClickHandler);
    noteClicker.addEventListener('click', noteClickHandler);
}

function cleanupClickHandlers() {
    // Cancel any running animations
    if (coinAnimationId) {
        cancelAnimationFrame(coinAnimationId);
        coinAnimationId = null;
        coinAnimationStart = 0;
    }
    
    if (noteAnimationId) {
        cancelAnimationFrame(noteAnimationId);
        noteAnimationId = null;
        noteAnimationStart = 0;
    }
    
    // Remove event listeners
    if (mainClicker && coinClickHandler) {
        mainClicker.removeEventListener('click', coinClickHandler);
    }
    
    if (noteClicker && noteClickHandler) {
        noteClicker.removeEventListener('click', noteClickHandler);
    }
    
    // Reset variables
    coinClickHandler = null;
    noteClickHandler = null;
    mainClicker = null;
    noteClicker = null;
    coinClickProgress = 9; // Reset to 9 for instant first click
    noteClickProgress = 9; // Reset to 9 for instant first click
}

window.cleanupClickHandler = cleanupClickHandlers;

const BONUS_TYPES = {
    COIN: 'coin',
    NOTE: 'note'
};

function createFloatingBonus() {
    const overlay = document.getElementById('bonusOverlay');
    const bonus = document.createElement('div');
    
    const upgradesContainer = document.querySelector('.upgrades-container');    
    let bonusType, isCoin;
    
    if (upgradesContainer && !upgradesContainer.classList.contains('d-none')) {
        bonusType = Math.random() < 0.80 ? BONUS_TYPES.COIN : BONUS_TYPES.NOTE;
        isCoin = bonusType === BONUS_TYPES.COIN;
    } else {
        bonusType = BONUS_TYPES.COIN;
        isCoin = true;
    }
    
    const bonusValue = isCoin 
        ? Math.floor(3000 + Math.random() * 3001)
        : 1 + Math.floor(Math.random() * 3);
        
    bonus.className = `floating-bonus ${bonusType}-bonus`;
    
    let x = Math.random() * (window.innerWidth - 100) + 50;
    let y = Math.random() * (window.innerHeight - 100) + 50;
    
    const baseDuration = 3000 + Math.random() * 2000;
    const duration = baseDuration * 1.5;
    const speedMultiplier = 0.6;
    const startTime = performance.now();
    const numPoints = 5 + Math.floor(Math.random() * 5);
    
    const points = [];
    for (let i = 0; i < numPoints; i++) {
        points.push({
            x: Math.random() * (window.innerWidth - 100) + 50,
            y: Math.random() * (window.innerHeight - 100) + 50,
            time: (i / numPoints) * duration
        });
    }
    
    points.unshift({ x, y, time: 0 });
    
    bonus.style.left = `${x}px`;
    bonus.style.top = `${y}px`;
    bonus.style.opacity = '1';
    
    overlay.appendChild(bonus);
    overlay.classList.remove('d-none');
    let finished = false;
    bonus.addEventListener('click', (e) => {
        e.stopPropagation();
        if (finished) return;
        finished = true;
        
        if (isCoin) {
            const current = getCoins();
            setCoins(current + bonusValue);
            console.log(`[bonus] collected: +${bonusValue} coins`);
        } else {
            const currentNotes = getNotes();
            setNotes(currentNotes + bonusValue);
            console.log(`[bonus] collected: +${bonusValue} notes`);
            
            if (!getNotesPrintable()) {
                const notePrintingTech = window.notePrintingTech;
                if (notePrintingTech) {
                    const upgradeElement = document.querySelector(`.upgrade-item[data-upgrade-id="${notePrintingTech.id}"]`);
                    if (upgradeElement && upgradeElement.classList.contains('d-none')) {
                        upgradeElement.classList.remove('d-none');
                        console.log('[Bonus] Note Printing Tech upgrade shown');
                    }
                }
            }
        }
        
        const fx = document.createElement('div');
        fx.className = 'bonus-float';
        fx.textContent = `+${bonusValue} ${isCoin ? '' : 'Notes'}`;
        fx.style.left = `${e.clientX}px`;
        fx.style.top = `${e.clientY - 10}px`;
        document.body.appendChild(fx);
        setTimeout(() => fx.remove(), 1200);
        
        if (audioManager && !audioManager.muted) {
            audioManager.playFx('buxCollect');
        }
        
        bonus.remove();
        if (overlay.children.length === 0) {
            overlay.classList.add('d-none');
        }
    });
    
    function animateFloatingBonus(currentTime) {
        if (finished) return;
        const elapsed = (currentTime - startTime) * speedMultiplier;
        
        let currentPoint = 0;
        while (currentPoint < points.length - 1 && points[currentPoint + 1].time <= elapsed) {
            currentPoint++;
        }
        
        if (currentPoint < points.length - 1) {
            const segmentStart = points[currentPoint];
            const segmentEnd = points[currentPoint + 1];
            const segmentDuration = segmentEnd.time - segmentStart.time;
            const segmentElapsed = elapsed - segmentStart.time;
            const segmentProgress = Math.min(segmentElapsed / segmentDuration, 1);
            
            const easeInOutCubic = t => t < 0.5 
                ? 4 * t * t * t 
                : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
            
            const easedProgress = easeInOutCubic(segmentProgress);
            
            x = segmentStart.x + (segmentEnd.x - segmentStart.x) * easedProgress;
            y = segmentStart.y + (segmentEnd.y - segmentStart.y) * easedProgress;
            
            const pulseScale = 0.8 + Math.sin(elapsed / 150) * 0.3;
            bonus.style.transform = `translate(-50%, -50%) scale(${pulseScale})`;
            bonus.style.left = `${x}px`;
            bonus.style.top = `${y}px`;
            
            requestAnimationFrame(animateFloatingBonus);
        } else {
            const fadeOutDuration = 300;
            const fadeProgress = Math.min((elapsed - (duration - fadeOutDuration)) / fadeOutDuration, 1);
            bonus.style.opacity = `${1 - fadeProgress}`;
            
            if (fadeProgress < 1) {
                requestAnimationFrame(animateFloatingBonus);
            } else {
                bonus.remove();
                if (overlay.children.length === 0) {
                    overlay.classList.add('d-none');
                }
            }
        }
    }
    
    requestAnimationFrame(animateFloatingBonus);
    
    setTimeout(() => {
        if (!finished) {
            finished = true;
            bonus.remove();
            if (overlay.children.length === 0) {
                overlay.classList.add('d-none');
            }
        }
    }, 30000);
}

window.createFloatingBonus = createFloatingBonus;

let lastTime = 0;
const fixedTimeStep = 1000 / 60;

let bonusSpawnRemainingMs = 0;
let bonusLastLoggedSecond = null;
function resetBonusSpawnTimer() {
    const seconds = 80 + Math.floor(Math.random() * 241);
    
    bonusSpawnRemainingMs = seconds * 1000;
    bonusLastLoggedSecond = Math.ceil(bonusSpawnRemainingMs / 1000);
}


export function startGame() {
    initUpgrades();
    
    setupClickHandler();
    
    resetBonusSpawnTimer();

    requestAnimationFrame(gameLoop);
}

function updateButtonStates() {
    if (betterClicks) betterClicks.updateButtonState();
    if (betterClicksMultiplier) betterClicksMultiplier.updateButtonState();
    if (autoClicker) autoClicker.updateButtonState();
    if (coinAutoClickerMultiplier) coinAutoClickerMultiplier.updateButtonState();
    if (noteAutoClicker) noteAutoClicker.updateButtonState();
    if (noteAutoClickerMultiplier) noteAutoClickerMultiplier.updateButtonState();
    try { if (window.updateUpgradeVisibility) window.updateUpgradeVisibility(); } catch {}
}

export function trackManualClick() {
    const now = Date.now();
    const windowMs = getClickRateWindow();
    
    const currentTimestamps = getCoinClickTimestamps()
        .filter(timestamp => now - timestamp < windowMs);
    
    const updatedTimestamps = [...currentTimestamps, now];
    setCoinClickTimestamps(updatedTimestamps);
    
    setLastClickTime(now);
    
    const recentClicks = updatedTimestamps.filter(ts => now - ts <= 1000);
    return recentClicks.length * (getCoinsIncrementValue() / 10);
}

export function getManualClickRate() {
    const now = Date.now();
    const recentClicks = getCoinClickTimestamps().filter(ts => now - ts <= 1000);
    return recentClicks.length * (getCoinsIncrementValue() / 10);
}

export function trackManualNoteClick() {
    const now = Date.now();
    const windowMs = getClickRateWindow();
    const currentTimestamps = getNoteClickTimestamps().filter(ts => now - ts < windowMs);
    const updatedTimestamps = [...currentTimestamps, now];
    setNoteClickTimestamps(updatedTimestamps);
    const recentClicks = updatedTimestamps.filter(ts => now - ts <= 1000);
    return recentClicks.length * (getNotesIncrementValue() / 10);
}

export function getManualNoteClickRate() {
    const now = Date.now();
    const recentClicks = getNoteClickTimestamps().filter(ts => now - ts <= 1000);
    return recentClicks.length * (getNotesIncrementValue() / 10);
}

export function updateScoreDisplay() {
    const coinsElement = document.getElementById('points');
    if (coinsElement) {
        coinsElement.textContent = formatNumber(Math.floor(getCoins()), 10000);
    }
    
    const notesElement = document.getElementById('notes');
    if (notesElement) {
        notesElement.textContent = formatNumber(Math.floor(getNotes()), 10000);
    }
    
    console.log(`[DEBUG] Coins: ${getCoins()}, Notes: ${getNotes()}`);
}

export function gameLoop(timestamp) {
    if (typeof timestamp !== 'number' || lastTime === 0) {
        lastTime = typeof timestamp === 'number' ? timestamp : performance.now();
        requestAnimationFrame(gameLoop);
        return;
    }
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    if (autoClicker) autoClicker.update(deltaTime);
    if (noteAutoClicker) noteAutoClicker.update(deltaTime);
    
    updateButtonStates();
    
    if (getNotesPrintable()) {
        const noteClicker = document.getElementById('noteClicker');
        if (noteClicker && noteClicker.classList.contains('d-none')) {
            noteClicker.classList.remove('d-none');
        }
    }
    
    if (gameState === getGameActive()) {
        if (bonusSpawnRemainingMs > 0) {
            bonusSpawnRemainingMs -= deltaTime;
            const secLeft = Math.max(0, Math.ceil(bonusSpawnRemainingMs / 1000));
            if (secLeft !== bonusLastLoggedSecond) {
                bonusLastLoggedSecond = secLeft;
            }
            if (bonusSpawnRemainingMs <= 0) {
                createFloatingBonus();
                resetBonusSpawnTimer();
            }
        }
    }

    requestAnimationFrame(gameLoop);
}

export function setGameState(newState) {
    console.log("Setting game state to " + newState);
    setGameStateVariable(newState);
    const elements = getElements();

    if (elements.menu) elements.menu.classList.add('d-none');
    if (elements.canvasContainer) elements.canvasContainer.classList.add('d-none');
    if (elements.gameContainer) elements.gameContainer.classList.add('d-none');
    
    if (elements.menu) elements.menu.classList.remove('d-flex');
    if (elements.canvasContainer) elements.canvasContainer.classList.remove('d-flex');
    if (elements.gameContainer) elements.gameContainer.classList.remove('d-flex');

    if (newState === getMenuState()) {
        if (elements.menu) {
            elements.menu.classList.remove('d-none');
            elements.menu.classList.add('d-flex');
        }
        
        const languageButtons = [
            elements.btnEnglish, 
            elements.btnSpanish, 
            elements.btnGerman, 
            elements.btnItalian, 
            elements.btnFrench
        ];
        
        languageButtons.forEach(button => {
            if (button) button.classList.remove('active');
        });

        const currentLanguage = getLanguage();
        console.log("Language is " + currentLanguage);
        
        const languageButtonMap = {
            'en': elements.btnEnglish,
            'es': elements.btnSpanish,
            'de': elements.btnGerman,
            'it': elements.btnItalian,
            'fr': elements.btnFrench
        };
        
        if (languageButtonMap[currentLanguage]) {
            languageButtonMap[currentLanguage].classList.add('active');
        }

        if (getGameInProgress() && elements.copyButtonSavePopup && elements.closeButtonSavePopup) {
            elements.copyButtonSavePopup.innerHTML = `${localize('copyButton', currentLanguage)}`;
            elements.closeButtonSavePopup.innerHTML = `${localize('closeButton', currentLanguage)}`;
        }
    } else if (newState === getGameActive()) {
        if (elements.gameContainer) {
            elements.gameContainer.classList.remove('d-none');
            elements.gameContainer.classList.add('d-flex');
            
            setupClickHandler();
        }
    }
}
