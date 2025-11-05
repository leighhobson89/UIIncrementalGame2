class AudioManager {
    constructor() {
        this.sounds = new Map([
            ['coinJingle', 'assets/sounds/jingle.mp3'],
            ['buxCollect', 'assets/sounds/buxCollect.mp3'],
            ['upgrade', 'assets/sounds/upgrade.mp3']
        ]);
        
        this.audioCache = new Map();
        this.muted = localStorage.getItem('soundEnabled') === 'false';
        this.volume = 0.5; // Default volume (0.0 to 1.0)
        this.isInitialized = false;
        this.loadingPromises = new Map();
    }
    
    // Check if a sound is loaded and ready to play
    isSoundLoaded(name) {
        return this.audioCache.has(name) && this.audioCache.get(name).readyState >= 2; // 2 = HAVE_CURRENT_DATA
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

            const audio = new Audio();
            audio.src = this.sounds.get(name);
            audio.preload = 'auto';
            
            const onLoad = () => {
                cleanup();
                this.audioCache.set(name, audio);
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
                audio.removeEventListener('canplaythrough', onLoad);
                audio.removeEventListener('error', onError);
            };
            
            audio.addEventListener('canplaythrough', onLoad, { once: true });
            audio.addEventListener('error', onError, { once: true });
            
            // Start loading
            try {
                audio.load();
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

        // Get the audio element
        const audio = this.audioCache.get(name).cloneNode();
        
        // Apply options
        audio.volume = options.volume !== undefined 
            ? Math.min(1, Math.max(0, options.volume * this.volume))
            : this.volume;

        // Play the sound
        try {
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
            
            // Clean up after playback
            audio.addEventListener('ended', () => {
                audio.remove();
            }, { once: true });
            
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
