/**
 * TimerManager - A performance-optimized timer system for incremental games
 * Uses delta time to ensure smooth updates regardless of frame rate
 */
class TimerManager {
    constructor() {
        this.timers = new Map();
        this.lastUpdateTime = performance.now();
        this.paused = false;
    }

    /**
     * Creates a new timer
     * @param {string} id - Unique identifier for the timer
     * @param {number} interval - Time in milliseconds between callbacks
     * @param {Function} callback - Function to call when the timer completes
     * @param {Object} [options] - Additional options
     * @param {boolean} [options.autoStart=true] - Whether to start the timer immediately
     * @param {boolean} [options.loop=false] - Whether the timer should loop
     * @param {number} [options.maxIterations=Infinity] - Maximum number of iterations for looping timers
     * @returns {string} The ID of the created timer
     */
    createTimer(id, interval, callback, options = {}) {
        const {
            autoStart = true,
            loop = false,
            maxIterations = Infinity
        } = options;

        const timer = {
            id,
            interval,
            callback,
            elapsed: 0,
            isRunning: autoStart,
            loop,
            maxIterations,
            currentIterations: 0,
            lastUpdateTime: performance.now()
        };

        this.timers.set(id, timer);
        return id;
    }

    /**
     * Updates all active timers
     * @param {number} [deltaTime] - Optional delta time in milliseconds. If not provided, will calculate automatically
     */
    update(deltaTime) {
        if (this.paused) return;

        const currentTime = performance.now();
        const delta = deltaTime !== undefined ? deltaTime : (currentTime - this.lastUpdateTime);
        this.lastUpdateTime = currentTime;

        for (const [id, timer] of this.timers.entries()) {
            if (!timer.isRunning) continue;

            timer.elapsed += delta;

            if (timer.elapsed >= timer.interval) {
                // Calculate how many intervals have passed
                const intervalsPassed = Math.floor(timer.elapsed / timer.interval);
                timer.elapsed %= timer.interval;

                // Execute callback for each interval that passed
                for (let i = 0; i < intervalsPassed; i++) {
                    timer.callback();
                    timer.currentIterations++;

                    // Check if we've reached max iterations for this timer
                    if (timer.loop && timer.currentIterations >= timer.maxIterations) {
                        this.removeTimer(id);
                        break;
                    }
                }
            }
        }
    }

    /**
     * Starts a timer
     * @param {string} id - The ID of the timer to start
     */
    startTimer(id) {
        const timer = this.timers.get(id);
        if (timer) {
            timer.isRunning = true;
            timer.lastUpdateTime = performance.now();
        }
    }

    /**
     * Pauses a timer
     * @param {string} id - The ID of the timer to pause
     */
    pauseTimer(id) {
        const timer = this.timers.get(id);
        if (timer) {
            timer.isRunning = false;
        }
    }

    /**
     * Resets a timer
     * @param {string} id - The ID of the timer to reset
     */
    resetTimer(id) {
        const timer = this.timers.get(id);
        if (timer) {
            timer.elapsed = 0;
            timer.currentIterations = 0;
            timer.lastUpdateTime = performance.now();
        }
    }

    /**
     * Removes a timer
     * @param {string} id - The ID of the timer to remove
     */
    removeTimer(id) {
        this.timers.delete(id);
    }

    /**
     * Gets a timer by ID
     * @param {string} id - The ID of the timer to get
     * @returns {Object|null} The timer object or null if not found
     */
    getTimer(id) {
        return this.timers.get(id) || null;
    }

    /**
     * Pauses all timers
     */
    pauseAll() {
        this.paused = true;
    }

    /**
     * Resumes all timers
     */
    resumeAll() {
        this.paused = false;
        this.lastUpdateTime = performance.now();
    }

    /**
     * Removes all timers
     */
    clearAll() {
        this.timers.clear();
    }
}

// Export as ES6 module
export default TimerManager;
