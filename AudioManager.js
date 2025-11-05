class AudioManager {
    constructor() {
        this.sounds = new Map([
            ['coinJingle', 'assets/sounds/jingle.mp3'],
            ['buxCollect', 'assets/sounds/buxCollect.mp3'],
            ['upgrade', 'assets/sounds/upgrade.mp3']
        ]);
        
        // Map<string, { pool: HTMLAudioElement[], nextIndex: number }>
        this.audioCache = new Map();
        this.muted = localStorage.getItem('soundEnabled') === 'false';
        this.volume = 0.5; // Default volume (0.0 to 1.0)
        this.isInitialized = false;
        this.loadingPromises = new Map();
    }
    
    // Check if a sound is loaded and ready to play
    isSoundLoaded(name) {
        const entry = this.audioCache.get(name);
        return !!(entry && Array.isArray(entry.pool) && entry.pool.length && entry.pool[0].readyState >= 2);
    }
    
    // Preload all sounds
    async preloadAll() {
        const results = {};
        const promises = [];
        
        for (const [name] of this.sounds.entries()) {
            promises.push(
                this.preload(name)
                    .then(success => { results[name] = success; })
                    .catch(error => { 
                        console.error(`Error preloading sound '${name}':`, error);
                        results[name] = false;
                    })
            );
        }
        
        await Promise.allSettled(promises);
        this.isInitialized = true;
        return results;
    }

    // Preload a single sound
    preload(name) {
        // Return existing promise if this sound is already being loaded
        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name);
        }
        
        const loadPromise = new Promise((resolve, reject) => {
            if (!this.sounds.has(name)) {
                console.warn(`Sound '${name}' not found in sound library`);
                resolve(false);
                return;
            }

            // Check if already loaded
            if (this.isSoundLoaded(name)) {
                resolve(true);
                return;
            }

            // Create a small pool to avoid cloneNode latency after state switches
            const POOL_SIZE = 4;
            const pool = Array.from({ length: POOL_SIZE }, () => {
                const a = new Audio();
                a.src = this.sounds.get(name);
                a.preload = 'auto';
                return a;
            });

            const first = pool[0];
            const onLoad = () => {
                cleanup();
                this.audioCache.set(name, { pool, nextIndex: 0 });
                this.loadingPromises.delete(name);
                console.log(`Sound '${name}' loaded successfully`);
                resolve(true);
            };

            const onError = (error) => {
                cleanup();
                console.error(`Failed to load sound '${name}':`, error);
                this.loadingPromises.delete(name);
                resolve(false);
            };

            const cleanup = () => {
                first.removeEventListener('canplaythrough', onLoad);
                first.removeEventListener('error', onError);
            };

            first.addEventListener('canplaythrough', onLoad, { once: true });
            first.addEventListener('error', onError, { once: true });

            // Kick off loading for all items (browsers may coalesce requests)
            try {
                pool.forEach(a => a.load());
            } catch (error) {
                console.error(`Error loading sound '${name}':`, error);
                cleanup();
                this.loadingPromises.delete(name);
                resolve(false);
                return;
            }
        });
        
        // Store the promise to prevent duplicate loads
        this.loadingPromises.set(name, loadPromise);
        return loadPromise;
    }

    // Play a sound effect
    async playFx(name, options = {}) {
        if (this.muted) {
            console.log(`Sound '${name}' not played: audio is muted`);
            return null;
        }
        
        if (!this.sounds.has(name)) {
            console.warn(`Sound '${name}' not found in sound library`);
            return null;
        }

        // If sound isn't loaded, try to load it first
        if (!this.isSoundLoaded(name)) {
            console.log(`Sound '${name}' not in cache, attempting to load...`);
            try {
                await this.preload(name);
                if (!this.isSoundLoaded(name)) {
                    console.warn(`Failed to load sound '${name}' for playback`);
                    return null;
                }
            } catch (error) {
                console.error(`Error loading sound '${name}':`, error);
                return null;
            }
        }

        // Get an audio element from the pool (re-usable, already buffered)
        const entry = this.audioCache.get(name);
        let audio;
        if (entry && entry.pool && entry.pool.length) {
            // Round-robin selection
            const idx = entry.nextIndex % entry.pool.length;
            entry.nextIndex = (entry.nextIndex + 1) % entry.pool.length;
            audio = entry.pool[idx];
            // If it's currently playing, try to find a paused one; otherwise create a temp instance
            if (!audio.paused) {
                const paused = entry.pool.find(a => a.paused);
                audio = paused || new Audio(this.sounds.get(name));
                if (paused === undefined) {
                    audio.preload = 'auto';
                }
            }
        } else {
            audio = new Audio(this.sounds.get(name));
            audio.preload = 'auto';
        }

        // Apply options
        audio.volume = options.volume !== undefined 
            ? Math.min(1, Math.max(0, options.volume * this.volume))
            : this.volume;

        // Play the sound
        try {
            // Ensure restart from beginning for pooled elements
            audio.currentTime = 0;
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    if (error.name === 'NotAllowedError' || error.name === 'NotSupportedError') {
                        console.warn('Autoplay was prevented. User interaction required before sound can play.');
                    } else {
                        console.error('Error playing sound:', error);
                    }
                });
            }
            
            // For temporary (non-pooled) elements, clean up after playback
            if (!entry || !entry.pool.includes(audio)) {
                audio.addEventListener('ended', () => {
                    audio.remove();
                }, { once: true });
            }
            
            return audio;
            
        } catch (error) {
            console.error(`Error playing sound '${name}':`, error);
            return null;
        }
    }

    // Set global volume (0.0 to 1.0)
    setVolume(volume) {
        this.volume = Math.min(1, Math.max(0, volume));
    }

    // Toggle mute state
    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    // Add a new sound to the library
    addSound(name, path) {
        this.sounds.set(name, path);
        return this.preload(name);
    }

    // Stop all currently playing sounds
    stopAll() {
        this.audioCache.forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
    }
}

// Create and export a singleton instance
export const audioManager = new AudioManager();

// Preload sounds when the AudioManager is imported
if (typeof window !== 'undefined') {
    // Don't wait for window.load, start preloading immediately
    audioManager.preloadAll().then(results => {
        console.log('Audio preloading results:', results);
    }).catch(error => {
        console.error('Error during audio preloading:', error);
    });
    
    // Also preload on user interaction to help with autoplay policies
    const interactiveEvents = ['click', 'keydown', 'touchstart'];
    const onInteraction = () => {
        if (!audioManager.isInitialized) {
            audioManager.preloadAll().catch(console.error);
        }
        interactiveEvents.forEach(event => {
            window.removeEventListener(event, onInteraction);
        });
    };
    
    interactiveEvents.forEach(event => {
        window.addEventListener(event, onInteraction, { once: true, passive: true });
    });
}
