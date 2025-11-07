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
    getClickTimestamps,
    setClickTimestamps,
    getClickRateWindow,
    setLastClickTime,
    getNotes,
    setNotes,
    getNotesIncrementValue,
    getNoteClickTimestamps,
    setNoteClickTimestamps,
    getNotesPrintable,
    setNotesPrintable
} from './constantsAndGlobalVars.js';
import { testNumberFormatter, formatNumber } from './utils/numberFormatter.js'; //call in console
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

// Module-scoped references for click handlers to avoid duplicate bindings
let coinClickHandler = null;
let noteClickHandler = null;
let mainClicker = null;
let noteClicker = null;
// Track manual coin click progress (0..9)
let coinClickProgress = 0;
// Track manual note click progress (0..9)
let noteClickProgress = 0;

// Create a coin click handler function
function createCoinClickHandler() {
    return function(event) {
        // Ensure a progress overlay exists
        let fill = this.querySelector('.progress-fill');
        if (!fill) {
            fill = document.createElement('div');
            fill.className = 'progress-fill';
            this.appendChild(fill);
        }

        // Track click for stats (coins/sec reflects 0.1 per click)
        trackManualClick();

        // Add click pulse animation
        this.classList.add('clicked');
        setTimeout(() => this.classList.remove('clicked'), 100);

        // Increment progress up to 10
        coinClickProgress += 1;
        if (coinClickProgress < 10) {
            fill.style.height = `${coinClickProgress * 10}%`;
            return; // No coin awarded yet
        }

        // On 10th click: award +1 coin and reset progress
        coinClickProgress = 0;
        fill.style.height = '0%';

        const current = getCoins();
        const award = getCoinsIncrementValue();
        setCoins(current + award);

        // Play coin jingle sound
        audioManager.playFx('coinJingle');

        // Show floating +1 at click position
        const fx = document.createElement('div');
        fx.className = 'bonus-float';
        fx.textContent = `+${award}`;
        fx.style.left = `${event.clientX}px`;
        fx.style.top = `${event.clientY - 10}px`;
        document.body.appendChild(fx);
        setTimeout(() => fx.remove(), 1200);

        // Coin animation (single coin on award)
        const coinOverlay = document.getElementById('coinOverlay');
        const coin = document.createElement('img');
        coin.src = 'assets/images/coin.png';
        coin.className = 'coin-animation';
        const offsetX = (Math.random() - 0.5) * 40;
        const offsetY = (Math.random() - 0.5) * 40;
        coin.style.left = `${event.clientX + offsetX}px`;
        coin.style.top = `${event.clientY + offsetY}px`;
        const direction = Math.random() > 0.5 ? 'Right' : 'Left';
        coin.style.animationName = `coinFly${direction}`;
        const duration = 1 + Math.random() * 0.5;
        coin.style.animationDuration = `${duration}s`;
        coinOverlay.appendChild(coin);
        setTimeout(() => {
            if (coin.parentNode === coinOverlay) coinOverlay.removeChild(coin);
        }, duration * 1000);
    };
}

// Create a note click handler function
function createNoteClickHandler() {
    return function(event) {
        // Ensure a progress overlay exists
        let fill = this.querySelector('.progress-fill');
        if (!fill) {
            fill = document.createElement('div');
            fill.className = 'progress-fill';
            this.appendChild(fill);
        }

        // Track the note click for stats (0.1 per click)
        trackManualNoteClick();

        // Add click animation
        this.classList.add('clicked');
        setTimeout(() => {
            this.classList.remove('clicked');
        }, 100);

        // Increment progress, fill by 10% per click
        noteClickProgress += 1;
        if (noteClickProgress < 10) {
            fill.style.height = `${noteClickProgress * 10}%`;
            return; // No note awarded yet
        }

        // On 10th click: award +1 note and reset progress
        noteClickProgress = 0;
        fill.style.height = '0%';

        const currentNotes = getNotes();
        const noteAward = getNotesIncrementValue();
        setNotes(currentNotes + noteAward);

        // Play a different sound effect for notes
        if (audioManager && !audioManager.muted) {
            audioManager.playFx('buxCollect');
        }

        // Show floating +1 Note at click position
        const fx = document.createElement('div');
        fx.className = 'bonus-float';
        fx.textContent = `+${noteAward} Note`;
        fx.style.left = `${event.clientX}px`;
        fx.style.top = `${event.clientY - 10}px`;
        fx.style.color = '#4caf50'; // Green color for notes
        document.body.appendChild(fx);
        setTimeout(() => fx.remove(), 1200);

        // Create a single note animation on award
        const noteOverlay = document.getElementById('coinOverlay');
        const note = document.createElement('img');
        note.src = 'assets/images/dollar_banknote.png';
        note.className = 'coin-animation';
        const offsetX = (Math.random() - 0.5) * 40;
        const offsetY = (Math.random() - 0.5) * 40;
        note.style.left = `${event.clientX + offsetX}px`;
        note.style.top = `${event.clientY + offsetY}px`;
        const direction = Math.random() > 0.5 ? 'Right' : 'Left';
        note.style.animationName = `coinFly${direction}`;
        const duration = 1 + Math.random() * 0.5;
        note.style.animationDuration = `${duration}s`;
        noteOverlay.appendChild(note);
        setTimeout(() => {
            if (note.parentNode === noteOverlay) {
                noteOverlay.removeChild(note);
            }
        }, duration * 1000);
    };
}

// Set up the click handlers with proper cleanup
function setupClickHandler() {
    // Clean up any existing handlers first
    cleanupClickHandlers();
    
    // Get the clicker elements
    mainClicker = document.getElementById('mainClicker');
    noteClicker = document.getElementById('noteClicker');
    
    if (!mainClicker || !noteClicker) return;
    
    // Create and store the click handlers
    coinClickHandler = createCoinClickHandler();
    noteClickHandler = createNoteClickHandler();
    
    // Add the event listeners
    mainClicker.addEventListener('click', coinClickHandler);
    noteClicker.addEventListener('click', noteClickHandler);
}

// Clean up the click handlers
function cleanupClickHandlers() {
    // Clean up coin clicker
    if (mainClicker && coinClickHandler) {
        mainClicker.removeEventListener('click', coinClickHandler);
    }
    
    // Clean up note clicker
    if (noteClicker && noteClickHandler) {
        noteClicker.removeEventListener('click', noteClickHandler);
    }
    
    // Clean up references
    coinClickHandler = null;
    noteClickHandler = null;
    mainClicker = null;
    noteClicker = null;
}

// Expose cleanup for external calls if needed
window.cleanupClickHandler = cleanupClickHandlers;

// Bonus types
const BONUS_TYPES = {
    COIN: 'coin',
    NOTE: 'note'
};

// Floating bonus animation with random path
function createFloatingBonus() {
    const overlay = document.getElementById('bonusOverlay');
    const bonus = document.createElement('div');
    
    // Check if upgrades container is visible
    const upgradesContainer = document.querySelector('.upgrades-container');    
    // Determine bonus type - if upgrades are not visible yet, force coin bonus
    let bonusType, isCoin;
    
    if (upgradesContainer && !upgradesContainer.classList.contains('d-none')) {
        // If upgrades are visible, allow note bonuses (20% chance)
        bonusType = Math.random() < 0.80 ? BONUS_TYPES.COIN : BONUS_TYPES.NOTE;
        isCoin = bonusType === BONUS_TYPES.COIN;
    } else {
        // If upgrades are not visible yet, only allow coin bonuses
        bonusType = BONUS_TYPES.COIN;
        isCoin = true;
    }
    
    // Set bonus value and class
    const bonusValue = isCoin 
        ? Math.floor(3000 + Math.random() * 3001) // 3000-6000 coins
        : 1 + Math.floor(Math.random() * 3);     // 1-3 notes
        
    bonus.className = `floating-bonus ${bonusType}-bonus`;
    
    // Random starting position
    let x = Math.random() * (window.innerWidth - 100) + 50;
    let y = Math.random() * (window.innerHeight - 100) + 50;
    
    // Animation parameters
    const baseDuration = 3000 + Math.random() * 2000; // 3-5 seconds base
    const duration = baseDuration * 1.5; // 1.5x longer
    const speedMultiplier = 0.6; // adjust speed of movement
    const startTime = performance.now();
    const numPoints = 5 + Math.floor(Math.random() * 5); // 5-9 points to visit
    
    // Generate random points to visit
    const points = [];
    for (let i = 0; i < numPoints; i++) {
        points.push({
            x: Math.random() * (window.innerWidth - 100) + 50,
            y: Math.random() * (window.innerHeight - 100) + 50,
            time: (i / numPoints) * duration
        });
    }
    
    // Add current position as first point
    points.unshift({ x, y, time: 0 });
    
    // Initial position
    bonus.style.left = `${x}px`;
    bonus.style.top = `${y}px`;
    bonus.style.opacity = '1';
    
    // Add to DOM
    overlay.appendChild(bonus);
    overlay.classList.remove('d-none');
    
    // Click to collect bonus
    let finished = false;
    bonus.addEventListener('click', (e) => {
        e.stopPropagation();
        if (finished) return;
        finished = true;
        
        // Award the appropriate resource
        if (isCoin) {
            const current = getCoins();
            setCoins(current + bonusValue);
            console.log(`[bonus] collected: +${bonusValue} coins`);
        } else {
            const currentNotes = getNotes();
            setNotes(currentNotes + bonusValue);
            console.log(`[bonus] collected: +${bonusValue} notes`);
            
            // Show the Note Printing Tech upgrade if it exists and notes aren't printable yet
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
        
        // Floating text at click point
        const fx = document.createElement('div');
        fx.className = 'bonus-float';
        fx.textContent = `+${bonusValue} ${isCoin ? '' : 'Notes'}`;
        fx.style.left = `${e.clientX}px`;
        fx.style.top = `${e.clientY - 10}px`;
        document.body.appendChild(fx);
        setTimeout(() => fx.remove(), 1200);
        
        // Play sound
        if (audioManager && !audioManager.muted) {
            audioManager.playFx('buxCollect');
        }
        
        // Remove element and hide overlay if empty
        bonus.remove();
        if (overlay.children.length === 0) {
            overlay.classList.add('d-none');
        }
    });
    
    // Animation loop
    function animateFloatingBonus(currentTime) {
        if (finished) return; // Stop animating if collected
        const elapsed = (currentTime - startTime) * speedMultiplier;
        
        // Find current segment
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
            
            // Ease in-out for smoother movement
            const easeInOutCubic = t => t < 0.5 
                ? 4 * t * t * t 
                : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
            
            const easedProgress = easeInOutCubic(segmentProgress);
            
            // Calculate current position
            x = segmentStart.x + (segmentEnd.x - segmentStart.x) * easedProgress;
            y = segmentStart.y + (segmentEnd.y - segmentStart.y) * easedProgress;
            
            // Apply position with pulsing effect
            const pulseScale = 0.8 + Math.sin(elapsed / 150) * 0.3; // Faster pulsing
            bonus.style.transform = `translate(-50%, -50%) scale(${pulseScale})`;
            bonus.style.left = `${x}px`;
            bonus.style.top = `${y}px`;
            
            // Continue animation
            requestAnimationFrame(animateFloatingBonus);
        } else {
            // Fade out at the end
            const fadeOutDuration = 300; // ms
            const fadeProgress = Math.min((elapsed - (duration - fadeOutDuration)) / fadeOutDuration, 1);
            bonus.style.opacity = `${1 - fadeProgress}`;
            
            if (fadeProgress < 1) {
                requestAnimationFrame(animateFloatingBonus);
            } else {
                // Clean up
                bonus.remove();
                if (overlay.children.length === 0) {
                    overlay.classList.add('d-none');
                }
            }
        }
    }
    
    // Start animation
    requestAnimationFrame(animateFloatingBonus);
    
    // Auto-remove after 30 seconds if not collected
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

// Expose for debugging
window.createFloatingBonus = createFloatingBonus;

// Game timing
let lastTime = 0;
const fixedTimeStep = 1000 / 60; // 60 FPS

// Bonus (floating money) spawn timer (ms)
let bonusSpawnRemainingMs = 0;
let bonusLastLoggedSecond = null;
function resetBonusSpawnTimer() {
    // Random spawn timer between 80-320 seconds (1.3 to 5.3 minutes)
    const seconds = 80 + Math.floor(Math.random() * 241);
    
    bonusSpawnRemainingMs = seconds * 1000;
    //bonusSpawnRemainingMs = 5000; //DEBUG
    bonusLastLoggedSecond = Math.ceil(bonusSpawnRemainingMs / 1000);
}

//--------------------------------------------------------------------------------------------------------

export function startGame() {
    // Initialize all upgrades
    initUpgrades();
    
    // Set up the main click handler once per start, with cleanup to prevent duplicates
    setupClickHandler();
    
    // Initialize bonus spawn countdown
    resetBonusSpawnTimer();

    // Start main loop with RAF to ensure a proper timestamp is provided
    requestAnimationFrame(gameLoop);
}

function updateButtonStates() {
    // Update button states for all upgrades
    if (betterClicks) betterClicks.updateButtonState();
    if (betterClicksMultiplier) betterClicksMultiplier.updateButtonState();
    if (autoClicker) autoClicker.updateButtonState();
    if (coinAutoClickerMultiplier) coinAutoClickerMultiplier.updateButtonState();
    if (noteAutoClicker) noteAutoClicker.updateButtonState();
    if (noteAutoClickerMultiplier) noteAutoClickerMultiplier.updateButtonState();
    // Trigger progressive reveal check
    try { if (window.updateUpgradeVisibility) window.updateUpgradeVisibility(); } catch {}
}

export function trackManualClick() {
    const now = Date.now();
    const windowMs = getClickRateWindow();
    
    // Get current timestamps and filter out old ones
    const currentTimestamps = getClickTimestamps()
        .filter(timestamp => now - timestamp < windowMs);
    
    // Add the new click timestamp
    const updatedTimestamps = [...currentTimestamps, now];
    setClickTimestamps(updatedTimestamps);
    
    // Update the last click time
    setLastClickTime(now);
    
    // Calculate clicks per second (over the last second)
    const recentClicks = updatedTimestamps.filter(ts => now - ts <= 1000);
    return recentClicks.length * (getCoinsIncrementValue() / 10);
}

export function getManualClickRate() {
    const now = Date.now();
    // Only count clicks within the last second for current rate
    const recentClicks = getClickTimestamps().filter(ts => now - ts <= 1000);
    return recentClicks.length * (getCoinsIncrementValue() / 10);
}

// Track a manual note click (timestamps kept in constants)
export function trackManualNoteClick() {
    const now = Date.now();
    const windowMs = getClickRateWindow();
    const currentTimestamps = getNoteClickTimestamps().filter(ts => now - ts < windowMs);
    const updatedTimestamps = [...currentTimestamps, now];
    setNoteClickTimestamps(updatedTimestamps);
    const recentClicks = updatedTimestamps.filter(ts => now - ts <= 1000);
    return recentClicks.length * (getNotesIncrementValue() / 10);
}

// Current manual note clicks per second
export function getManualNoteClickRate() {
    const now = Date.now();
    const recentClicks = getNoteClickTimestamps().filter(ts => now - ts <= 1000);
    return recentClicks.length * (getNotesIncrementValue() / 10);
}

export function updateScoreDisplay() {
    // Update coins display
    const coinsElement = document.getElementById('points');
    if (coinsElement) {
        coinsElement.textContent = formatNumber(Math.floor(getCoins()), 10000);
    }
    
    // Update notes display
    const notesElement = document.getElementById('notes');
    if (notesElement) {
        notesElement.textContent = formatNumber(Math.floor(getNotes()), 10000);
    }
    
    // Log for debugging
    console.log(`[DEBUG] Coins: ${getCoins()}, Notes: ${getNotes()}`);
}

export function gameLoop(timestamp) {
    // Calculate delta time safely; initialize on first frame
    if (typeof timestamp !== 'number' || lastTime === 0) {
        lastTime = typeof timestamp === 'number' ? timestamp : performance.now();
        requestAnimationFrame(gameLoop);
        return;
    }
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    // Update autoclickers with delta time
    if (autoClicker) autoClicker.update(deltaTime);
    if (noteAutoClicker) noteAutoClicker.update(deltaTime);
    
    // Update button states
    updateButtonStates();
    
    // Check if notes are printable and update visibility
    if (getNotesPrintable()) {
        const noteClicker = document.getElementById('noteClicker');
        if (noteClicker && noteClicker.classList.contains('d-none')) {
            noteClicker.classList.remove('d-none');
        }
    }
    
    if (gameState === getGameActive()) {
        // Game logic for active state

        // Update bonus spawn countdown and spawn when it reaches zero
        if (bonusSpawnRemainingMs > 0) {
            bonusSpawnRemainingMs -= deltaTime;
            const secLeft = Math.max(0, Math.ceil(bonusSpawnRemainingMs / 1000));
            if (secLeft !== bonusLastLoggedSecond) {
                bonusLastLoggedSecond = secLeft;
                //console.log(`[bonus] countdown: ${secLeft}s`);
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

    // Hide all main containers first
    if (elements.menu) elements.menu.classList.add('d-none');
    if (elements.canvasContainer) elements.canvasContainer.classList.add('d-none');
    if (elements.gameContainer) elements.gameContainer.classList.add('d-none');
    
    // Remove flex display from all containers
    if (elements.menu) elements.menu.classList.remove('d-flex');
    if (elements.canvasContainer) elements.canvasContainer.classList.remove('d-flex');
    if (elements.gameContainer) elements.gameContainer.classList.remove('d-flex');

    if (newState === getMenuState()) {
        // Show menu
        if (elements.menu) {
            elements.menu.classList.remove('d-none');
            elements.menu.classList.add('d-flex');
        }
        
        // Update active language button
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
        
        // Set active state for current language button
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
        // Show game container
        if (elements.gameContainer) {
            elements.gameContainer.classList.remove('d-none');
            elements.gameContainer.classList.add('d-flex');
            
            // Ensure the click handler is set up when the game becomes active
            setupClickHandler();
        }
    }
}
