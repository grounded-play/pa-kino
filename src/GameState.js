export const GameState = {
    defaultAudioStats: {
        audioMuted: false,
        masterVolume: 1.0,
        bgmVolume: 0.25,
        musicVolume: 0.25,
        sfxVolume: 0.4
    },
    defaultDisplayStats: {
        scanlinesEnabled: true
    },

    // Persistent Data
    persistentGallery: [], // Array of unlocked film metadata objects
    persistentStats: {
        totalRuns: 0,
        bestScore: 0,
        highestLevel: 0,
        wins: 0,
        unlockedDirectors: [],
        directorProgress: {},
        allDirectorsUnlocked: false,
        audioMuted: false,
        masterVolume: 1.0,
        bgmVolume: 0.25,
        musicVolume: 0.25,
        sfxVolume: 0.4,
        scanlinesEnabled: true
    },

    // Current Roguelike Run Data
    currentRun: {
        directorId: null,
        directorName: '',
        directorProfilePath: null,
        directorPortraitFrame: 0,
        cinematicFact: '',
        draftingPenalty: 0,
        traitLines: [],
        modifiers: {},
        filmography: [], // Array of TMDB film objects
        currentPosterKey: null,
        nextPosterKey: null,
        currentFilmIndex: 0,
        score: 0,
        ballStats: { reel: 0, vhs: 0, dvd: 0 },
        inventory: {
            bouncePads: 3 // Starting items
        }
    },

    draftingPenalty: 0, // Deducted balls from re-rolls

    initRun(directorData, filmography) {
        const modifiers = directorData.traits || {};
        this.currentRun = {
            directorId: directorData.id,
            directorName: directorData.name,
            directorProfilePath: directorData.profilePath || null,
            directorPortraitFrame: directorData.portraitFrame ?? 0,
            directorPortraitKey: directorData.portraitKey || null,
            cinematicFact: directorData.cinematicFact || '',
            draftingPenalty: this.draftingPenalty,
            traitLines: directorData.traitLines || [],
            modifiers,
            filmography: filmography,
            currentPosterKey: directorData.currentPosterKey || null,
            nextPosterKey: directorData.nextPosterKey || null,
            currentFilmIndex: this.persistentStats.directorProgress[directorData.name] || 0,
            score: 0,
            ballStats: { reel: 0, vhs: 0, dvd: 0 },
            inventory: {
                bouncePads: 3 + (modifiers.startingBouncePads || 0),
                stretchPads: modifiers.startingStretchPads || 0,
                multiBalls: modifiers.startingMultiBalls || 0
            }
        };

        this.draftingPenalty = 0;
    },

    getShopPrice(basePrice) {
        const priceMultiplier = this.currentRun.modifiers?.shopPriceMult ?? 1;
        return Math.max(100, Math.round(basePrice * priceMultiplier));
    },

    getCurrentFilm() {
        if (!this.currentRun.filmography || this.currentRun.filmography.length === 0) return null;
        return this.currentRun.filmography[this.currentRun.currentFilmIndex];
    },

    advanceFilm() {
        this.currentRun.currentFilmIndex++;
        
        // Update persistent campaign progression
        const directorName = this.currentRun.directorName;
        const newProgress = this.currentRun.currentFilmIndex;
        this.persistentStats.directorProgress[directorName] = newProgress;
        
        // Unlock all directors if they beat Movie 3 (index 2 implies beating it reaches 3, wait "complete Movie 3" means passing index 2)
        if (newProgress >= 3) {
            this.persistentStats.allDirectorsUnlocked = true;
        }

        // Update highest level stat
        if (this.currentRun.currentFilmIndex > this.persistentStats.highestLevel) {
            this.persistentStats.highestLevel = this.currentRun.currentFilmIndex;
        }

        this.saveData();

        if (this.currentRun.currentFilmIndex >= this.currentRun.filmography.length) {
            // Win condition met for the full campaign
            // Cap at index 4 so they replay the deep cut if they return
            this.persistentStats.directorProgress[directorName] = this.currentRun.filmography.length - 1;
            this.saveData();
            return true;
        }
        return false;
    },

    saveRunToGallery(isWin = false) {
        // Save all beaten films from the current run to the persistent gallery
        const beatenFilms = this.currentRun.filmography.slice(0, this.currentRun.currentFilmIndex);
        
        beatenFilms.forEach(film => {
            // Check if already in gallery by ID
            if (!this.persistentGallery.find(g => g.id === film.id)) {
                this.persistentGallery.push(film);
            }
        });

        // Update Stats
        this.persistentStats.totalRuns++;
        if (this.currentRun.score > this.persistentStats.bestScore) {
            this.persistentStats.bestScore = this.currentRun.score;
        }
        if (isWin) {
            this.persistentStats.wins++;
            if (!this.persistentStats.unlockedDirectors.includes(this.currentRun.directorName)) {
                this.persistentStats.unlockedDirectors.push(this.currentRun.directorName);
            }
        }

        this.saveData();
    },

    saveData() {
        try {
            localStorage.setItem('pachinko_gallery', JSON.stringify(this.persistentGallery));
            localStorage.setItem('pachinko_stats', JSON.stringify(this.persistentStats));
        } catch(e) {
            console.warn("Could not save to localStorage");
        }
    },

    loadData() {
        try {
            const savedGallery = localStorage.getItem('pachinko_gallery');
            if (savedGallery) {
                this.persistentGallery = JSON.parse(savedGallery);
            }

            const savedStats = localStorage.getItem('pachinko_stats');
            if (savedStats) {
                // Merge in case we added new fields to the schema
                this.persistentStats = { ...this.persistentStats, ...JSON.parse(savedStats) };
            }
        } catch(e) {
            console.warn("Could not load from localStorage");
        }

        this.normalizeAudioSettings();
    },

    normalizeAudioSettings() {
        this.persistentStats.audioMuted = Boolean(this.persistentStats.audioMuted);
        this.persistentStats.masterVolume = Math.max(0, Math.min(1, Number(this.persistentStats.masterVolume ?? this.defaultAudioStats.masterVolume)));
        this.persistentStats.musicVolume = Math.max(0, Math.min(1, Number(this.persistentStats.musicVolume ?? this.persistentStats.bgmVolume ?? this.defaultAudioStats.musicVolume)));
        this.persistentStats.bgmVolume = this.persistentStats.musicVolume;
        this.persistentStats.sfxVolume = Math.max(0, Math.min(1, Number(this.persistentStats.sfxVolume ?? this.defaultAudioStats.sfxVolume)));
        this.persistentStats.scanlinesEnabled = this.persistentStats.scanlinesEnabled ?? this.defaultDisplayStats.scanlinesEnabled;
    },

    resetAudioSettings(scene = null) {
        this.persistentStats = {
            ...this.persistentStats,
            ...this.defaultAudioStats
        };

        this.syncAudioRegistry(scene);
        this.saveData();
    },

    ensureAudibleAudio(scene = null) {
        this.normalizeAudioSettings();

        const effectivelySilent = this.persistentStats.audioMuted ||
            this.persistentStats.masterVolume <= 0 ||
            (this.persistentStats.musicVolume <= 0 && this.persistentStats.sfxVolume <= 0);

        if (effectivelySilent) {
            console.warn('Audio settings were muted or zeroed out. Restoring audible defaults.');
            this.resetAudioSettings(scene);
        } else {
            this.syncAudioRegistry(scene);
        }
    },

    syncAudioRegistry(scene) {
        if (!scene?.registry) {
            return;
        }

        scene.registry.set('audioMuted', this.persistentStats.audioMuted);
        scene.registry.set('masterVolume', this.persistentStats.masterVolume);
        scene.registry.set('musicVolume', this.persistentStats.musicVolume ?? this.persistentStats.bgmVolume ?? 0.7);
        scene.registry.set('sfxVolume', this.persistentStats.sfxVolume);
        scene.registry.set('scanlinesEnabled', this.persistentStats.scanlinesEnabled);
    },

    getDisplaySettings(scene) {
        const registry = scene?.registry;
        return {
            scanlinesEnabled: registry?.has('scanlinesEnabled')
                ? registry.get('scanlinesEnabled')
                : (this.persistentStats.scanlinesEnabled ?? this.defaultDisplayStats.scanlinesEnabled)
        };
    },

    setDisplaySettings(settings = {}, scene = null) {
        this.persistentStats = {
            ...this.persistentStats,
            ...Object.fromEntries(
                Object.entries(settings).filter(([, value]) => value !== undefined)
            )
        };

        this.normalizeAudioSettings();
        this.syncAudioRegistry(scene);
        this.saveData();
    },

    getAudioSettings(scene) {
        const registry = scene?.registry;
        return {
            audioMuted: registry?.has('audioMuted') ? registry.get('audioMuted') : this.persistentStats.audioMuted,
            masterVolume: registry?.has('masterVolume') ? registry.get('masterVolume') : this.persistentStats.masterVolume,
            musicVolume: registry?.has('musicVolume') ? registry.get('musicVolume') : (this.persistentStats.musicVolume ?? this.persistentStats.bgmVolume ?? 0.7),
            sfxVolume: registry?.has('sfxVolume') ? registry.get('sfxVolume') : this.persistentStats.sfxVolume
        };
    },

    setAudioSettings(settings = {}, scene = null) {
        this.persistentStats = {
            ...this.persistentStats,
            ...Object.fromEntries(
                Object.entries(settings).filter(([, value]) => value !== undefined)
            )
        };

        this.normalizeAudioSettings();
        this.syncAudioRegistry(scene);
        this.saveData();
    },

    applyAudioSettings(scene) {
        if (!scene?.sound) {
            return;
        }

        const settings = this.getAudioSettings(scene);
        
        // Apply Global Sound Settings
        scene.sound.mute = settings.audioMuted;
        scene.sound.volume = settings.masterVolume;

        // Manage BGM Specifically
        let bgm = scene.sound.get('bgm');
        
        // If BGM is in the cache but not yet added to the manager, add it now
        if (!bgm && scene.cache.audio.exists('bgm')) {
            bgm = scene.sound.add('bgm', { loop: true });
        }

        if (bgm) {
            bgm.setVolume(settings.musicVolume);

            const startOrResumeBgm = () => {
                if (settings.audioMuted) {
                    if (bgm.isPlaying) bgm.pause();
                    return;
                }

                if (bgm.isPaused) {
                    bgm.resume();
                } else if (!bgm.isPlaying) {
                    bgm.play();
                }
            };
            
            if (settings.audioMuted) {
                if (bgm.isPlaying) bgm.pause();
            } else {
                if (scene.sound.locked) {
                    scene.sound.once('unlocked', startOrResumeBgm);
                } else if (scene.sound.context?.state === 'suspended') {
                    scene.sound.context.resume()
                        .then(() => startOrResumeBgm())
                        .catch((error) => console.warn('BGM resume failed:', error));
                } else {
                    startOrResumeBgm();
                }
            }
        }

        this.syncAudioRegistry(scene);
    },

    toggleMute() {
        this.persistentStats.audioMuted = !this.persistentStats.audioMuted;
        this.saveData();
        return this.persistentStats.audioMuted;
    }
};

// Initialize data on load
GameState.loadData();
