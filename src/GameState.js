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

    persistentGallery: [],
    persistentStats: {
        totalRuns: 0,
        bestScore: 0,
        bestProduction: 0,
        highestLevel: 0,
        wins: 0,
        totalFilmsCompleted: 0,
        lifetimeScore: 0,
        totalReelsDropped: 0,
        unlockedDirectors: [],
        directorProgress: {},
        filmHighScores: {},
        allDirectorsUnlocked: false,
        audioMuted: false,
        masterVolume: 1.0,
        bgmVolume: 0.25,
        musicVolume: 0.25,
        sfxVolume: 0.4,
        scanlinesEnabled: true
    },

    currentRun: {
        directorId: null,
        directorName: '',
        directorProfilePath: null,
        directorPortraitFrame: 0,
        directorPortraitKey: null,
        cinematicFact: '',
        draftingPenalty: 0,
        traitLines: [],
        modifiers: {},
        filmography: [],
        currentPosterKey: null,
        nextPosterKey: null,
        currentFilmIndex: 0,
        score: 0,
        reelDrops: 0,
        completedFilms: [],
        lastRoundScore: 0,
        lastRating: 0,
        ballStats: { reel: 0, vhs: 0, dvd: 0 },
        inventory: {
            bouncePads: 3
        }
    },

    draftingPenalty: 0,

    createEmptyRun() {
        return {
            directorId: null,
            directorName: '',
            directorProfilePath: null,
            directorPortraitFrame: 0,
            directorPortraitKey: null,
            cinematicFact: '',
            draftingPenalty: 0,
            traitLines: [],
            modifiers: {},
            filmography: [],
            currentPosterKey: null,
            nextPosterKey: null,
            currentFilmIndex: 0,
            score: 0,
            reelDrops: 0,
            completedFilms: [],
            lastRoundScore: 0,
            lastRating: 0,
            ballStats: { reel: 0, vhs: 0, dvd: 0 },
            inventory: {
                bouncePads: 3
            }
        };
    },

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
            modifiers: { ...modifiers },
            filmography: filmography || [],
            currentPosterKey: directorData.currentPosterKey || null,
            nextPosterKey: directorData.nextPosterKey || null,
            currentFilmIndex: 0,
            score: 0,
            reelDrops: 0,
            completedFilms: [],
            lastRoundScore: 0,
            lastRating: 0,
            ballStats: { reel: 0, vhs: 0, dvd: 0 },
            inventory: {
                bouncePads: 3 + (modifiers.startingBouncePads || 0),
                stretchPads: modifiers.startingStretchPads || 0,
                multiBalls: modifiers.startingMultiBalls || 0
            }
        };

        this.draftingPenalty = 0;
    },

    resetCurrentRun() {
        this.currentRun = this.createEmptyRun();
        this.draftingPenalty = 0;
    },

    getShopPrice(basePrice) {
        const priceMultiplier = this.currentRun.modifiers?.shopPriceMult ?? 1;
        return Math.max(100, Math.round(basePrice * priceMultiplier));
    },

    getCurrentFilm() {
        if (!this.currentRun.filmography?.length) {
            return null;
        }
        return this.currentRun.filmography[this.currentRun.currentFilmIndex] || null;
    },

    getDirectorMilestoneCount(directorName) {
        return Math.max(0, Math.min(5, this.persistentStats.directorProgress[directorName] || 0));
    },

    getTotalMilestones() {
        return Object.values(this.persistentStats.directorProgress)
            .reduce((sum, value) => sum + Math.max(0, Math.min(5, Number(value) || 0)), 0);
    },

    getGalleryFilmsForDirector(directorName) {
        return this.persistentGallery.filter((film) => film.directorName === directorName);
    },

    getBestProduction() {
        return Math.max(this.persistentStats.bestProduction || 0, this.persistentStats.bestScore || 0);
    },

    formatMillions(value) {
        const safeValue = Number(value) || 0;
        if (Math.abs(safeValue) >= 100) {
            return `$${Math.round(safeValue)}M`;
        }
        return `$${safeValue.toFixed(1)}M`;
    },

    unlockFilm(film, directorName = this.currentRun.directorName) {
        if (!film?.id) {
            return;
        }

        const existing = this.persistentGallery.find((entry) => entry.id === film.id);
        if (existing) {
            if (!existing.directorName && directorName) {
                existing.directorName = directorName;
            }
            return;
        }

        this.persistentGallery.push({
            ...film,
            posterPath: film.posterPath
                || (film.poster_path
                    ? (film.poster_path.startsWith('http') || film.poster_path.startsWith('/src/')
                        ? film.poster_path
                        : `https://image.tmdb.org/t/p/w500${film.poster_path}`)
                    : null),
            directorName
        });
    },

    markFilmComplete(film = this.getCurrentFilm(), scoreOverride = this.currentRun.score) {
        if (!film) {
            return;
        }

        this.unlockFilm(film, this.currentRun.directorName);

        if (!this.currentRun.completedFilms.find((entry) => entry.id === film.id)) {
            this.currentRun.completedFilms.push({ ...film, directorName: this.currentRun.directorName });
            this.persistentStats.totalFilmsCompleted += 1;
        }

        const directorName = this.currentRun.directorName;
        const milestoneCount = this.currentRun.completedFilms.length;
        this.persistentStats.directorProgress[directorName] = Math.max(
            this.getDirectorMilestoneCount(directorName),
            Math.min(5, milestoneCount)
        );

        const filmKey = String(film.id);
        this.persistentStats.filmHighScores[filmKey] = Math.max(
            this.persistentStats.filmHighScores[filmKey] || 0,
            Math.floor(scoreOverride || 0)
        );

        if (this.persistentStats.directorProgress[directorName] >= 3) {
            this.persistentStats.allDirectorsUnlocked = true;
        }

        if (!this.persistentStats.unlockedDirectors.includes(directorName) && this.persistentStats.directorProgress[directorName] > 0) {
            this.persistentStats.unlockedDirectors.push(directorName);
        }

        this.persistentStats.highestLevel = Math.max(this.persistentStats.highestLevel, this.currentRun.currentFilmIndex + 1);
        this.saveData();
    },

    advanceFilm() {
        const completedFilm = this.getCurrentFilm();
        this.markFilmComplete(completedFilm, this.currentRun.score);
        this.currentRun.currentFilmIndex += 1;
        this.saveData();
        return this.currentRun.currentFilmIndex >= this.currentRun.filmography.length;
    },

    createRunRecap({ win = false, abandoned = false } = {}) {
        return {
            win,
            abandoned,
            score: Math.floor(this.currentRun.score || 0),
            moviesCompleted: this.currentRun.completedFilms.length,
            completedFilms: [...this.currentRun.completedFilms],
            ballStats: { ...this.currentRun.ballStats },
            totalReelsDropped: this.currentRun.reelDrops || 0,
            totalFilmsCompleted: this.persistentStats.totalFilmsCompleted,
            bestProduction: this.getBestProduction(),
            lifetimeScore: this.persistentStats.lifetimeScore || 0
        };
    },

    saveRunToGallery(isWin = false) {
        this.currentRun.completedFilms.forEach((film) => this.unlockFilm(film, this.currentRun.directorName));

        this.persistentStats.totalRuns += 1;
        this.persistentStats.bestScore = Math.max(this.persistentStats.bestScore, this.currentRun.score || 0);
        this.persistentStats.bestProduction = Math.max(this.getBestProduction(), this.currentRun.score || 0);
        this.persistentStats.lifetimeScore += Math.max(0, this.currentRun.score || 0);
        this.persistentStats.totalReelsDropped += Math.max(0, this.currentRun.reelDrops || 0);

        if (isWin) {
            this.persistentStats.wins += 1;
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
        } catch (e) {
            console.warn('Could not save to localStorage');
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
                this.persistentStats = { ...this.persistentStats, ...JSON.parse(savedStats) };
            }
            // User requested stats reset for career values
            this.persistentStats.lifetimeScore = 0;
            this.persistentStats.bestScore = 0;
            this.persistentStats.bestProduction = 0;
        } catch (e) {
            console.warn('Could not load from localStorage');
        }

        this.persistentGallery = (this.persistentGallery || []).map((film) => ({
            ...film,
            directorName: film.directorName || ''
        }));
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
        scene.sound.mute = settings.audioMuted;
        scene.sound.volume = settings.masterVolume;

        let bgm = scene.sound.get('bgm');
        if (!bgm && scene.cache.audio.exists('bgm')) {
            bgm = scene.sound.add('bgm', { loop: true });
        }

        if (bgm) {
            bgm.setVolume(settings.musicVolume);

            const startOrResumeBgm = () => {
                if (settings.audioMuted) {
                    if (bgm.isPlaying) {
                        bgm.pause();
                    }
                    return;
                }

                if (bgm.isPaused) {
                    bgm.resume();
                } else if (!bgm.isPlaying) {
                    bgm.play();
                }
            };

            if (settings.audioMuted) {
                if (bgm.isPlaying) {
                    bgm.pause();
                }
            } else if (scene.sound.locked) {
                scene.sound.once('unlocked', startOrResumeBgm);
            } else if (scene.sound.context?.state === 'suspended') {
                scene.sound.context.resume()
                    .then(() => startOrResumeBgm())
                    .catch((error) => console.warn('BGM resume failed:', error));
            } else {
                startOrResumeBgm();
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

GameState.loadData();
