class AudioManager {
    constructor() {
        this.sounds = new Map([
            ['coinJingle', 'assets/sounds/jingle.mp3'],
            ['buxCollect', 'assets/sounds/buxCollect.mp3'],
            ['upgrade', 'assets/sounds/upgrade.mp3']
        ]);
        
        this.audioCache = new Map();
        this.muted = false;
        this.volume = 0.5; // Default volume (0.0 to 1.0)
    }

    // Preload all sounds
    async preloadAll() {
        const promises = [];
        for (const [name, path] of this.sounds.entries()) {
            promises.push(this.preload(name));
        }
        return Promise.all(promises);
    }

    // Preload a single sound
    preload(name) {
        return new Promise((resolve, reject) => {
            if (!this.sounds.has(name)) {
                console.warn(`Sound '${name}' not found in sound library`);
                resolve(false);
                return;
            }

            if (this.audioCache.has(name)) {
                resolve(true);
                return;
            }

            const audio = new Audio(this.sounds.get(name));
            audio.preload = 'auto';
            
            const onLoad = () => {
                audio.removeEventListener('canplaythrough', onLoad);
                this.audioCache.set(name, audio);
                resolve(true);
            };
            
            const onError = (error) => {
                console.error(`Failed to load sound '${name}':`, error);
                audio.removeEventListener('error', onError);
                resolve(false);
            };
            
            audio.addEventListener('canplaythrough', onLoad, { once: true });
            audio.addEventListener('error', onError, { once: true });
            
            // Some browsers need this to start loading
            audio.load();
        });
    }

    // Play a sound effect
    playFx(name, options = {}) {
        if (this.muted) return null;
        
        if (!this.sounds.has(name)) {
            console.warn(`Sound '${name}' not found in sound library`);
            return null;
        }

        // Get or create audio element
        let audio;
        if (this.audioCache.has(name)) {
            audio = this.audioCache.get(name).cloneNode();
        } else {
            audio = new Audio(this.sounds.get(name));
            this.audioCache.set(name, audio);
        }

        // Apply options
        if (options.volume !== undefined) {
            audio.volume = Math.min(1, Math.max(0, options.volume * this.volume));
        } else {
            audio.volume = this.volume;
        }

        // Play the sound
        const playPromise = audio.play();
        
        // Handle promise to prevent "play() request interrupted" errors
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                if (error.name === 'NotAllowedError' || error.name === 'NotSupportedError') {
                    console.warn('Autoplay was prevented. Please interact with the page first.');
                } else {
                    console.error('Error playing sound:', error);
                }
            });
        }

        // Clean up after playback
        audio.addEventListener('ended', () => {
            if (audio && audio.parentNode) {
                audio.pause();
                audio.remove();
            }
        }, { once: true });

        return audio;
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

// Preload sounds when the page loads
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        audioManager.preloadAll().catch(console.error);
    });
}
