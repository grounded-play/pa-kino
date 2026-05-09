export const MAX_RUN_BUDGET = 1000000; // $1,000,000M hard cap

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
        perfectFilms: [], // IDs of films with 10.0 rating
        achievements: {}, // id: timestamp
        bestRating: 0,
        bestRatingFilm: '',
        bestGross: 0,
        bestGrossFilm: '',
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
        productionCosts: 0,
        reelDrops: 0,
        completedFilms: [],
        lastRoundScore: 0,
        lastGrossRoundScore: 0,
        lastProductionCost: 0,
        lastNetRoundScore: 0,
        lastExpectedReels: 0,
        lastReelsDropped: 0,
        lastReelsOver: 0,
        lastTargetScore: 0,
        lastRating: 0,
        lastCastCount: 0,
        lastOscarCount: 0,
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
            productionCosts: 0,
            reelDrops: 0,
            completedFilms: [],
            lastRoundScore: 0,
            lastGrossRoundScore: 0,
            lastProductionCost: 0,
            lastNetRoundScore: 0,
            lastExpectedReels: 0,
            lastReelsDropped: 0,
            lastReelsOver: 0,
            lastTargetScore: 0,
            lastRating: 0,
            lastCastCount: 0,
            lastOscarCount: 0,
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
            productionCosts: 0,
            reelDrops: 0,
            completedFilms: [],
            lastRoundScore: 0,
            lastGrossRoundScore: 0,
            lastProductionCost: 0,
            lastNetRoundScore: 0,
            lastExpectedReels: 0,
            lastReelsDropped: 0,
            lastReelsOver: 0,
            lastTargetScore: 0,
            lastRating: 0,
            lastCastCount: 0,
            lastOscarCount: 0,
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

    calculateRating(run = this.currentRun) {
        const actual = run.lastReelsDropped || 0;
        const expected = run.lastExpectedReels || 1;
        const gross = run.lastGrossRoundScore || 0;
        const costs = run.lastProductionCost || 1;
        const actors = run.lastCastCount || 0;
        const oscars = run.lastOscarCount || 0;
        
        // 1. Reel Efficiency (5.0 points max)
        // Full 5 points if on or under plan. -1 point per reel over.
        let reelScore = 5.0;
        if (actual > expected) {
            reelScore -= (actual - expected);
        }
        reelScore = Math.max(0, reelScore);

        // 2. Profit Score (2.0 points max)
        // 1.0 point for breaking even (100%), 
        // +0.1 per 10% above 100%, up to 2.0 at 200%.
        let profitScore = 0;
        if (gross >= costs) {
            const ratio = gross / costs;
            profitScore = 1.0 + Math.min(1.0, ratio - 1.0);
        }

        // 3. Ensemble Cast (2.0 points max)
        // 0.66 per actor caught (up to 2.0 for all 3)
        const ensembleScore = (Math.min(3, actors) / 3) * 2.0;

        // 4. Oscar Bonus (1.0 point max)
        const oscarScore = oscars > 0 ? 1.0 : 0;
        
        const total = reelScore + profitScore + ensembleScore + oscarScore;
        return Math.max(0, Math.min(10, total));
    },

    getBestProduction() {
        return Math.max(this.persistentStats.bestProduction || 0, this.persistentStats.bestScore || 0);
    },

    formatMillions(value) {
        const safeValue = (Number(value) || 0) / 100;
        // At most 1 decimal place as requested
        return `$${safeValue.toFixed(1)} Mil`;
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

        let completedEntry = this.currentRun.completedFilms.find((entry) => entry.id === film.id);
        
        if (!completedEntry) {
            completedEntry = { 
                ...film, 
                directorName: this.currentRun.directorName,
                rating: this.currentRun.lastRating || 0,
                gross: this.currentRun.lastGrossRoundScore || 0,
                cost: this.currentRun.lastProductionCost || 0,
                net: this.currentRun.lastNetRoundScore || 0,
                castCount: this.currentRun.lastCastCount || 0,
                oscarCount: this.currentRun.lastOscarCount || 0
            };
            this.currentRun.completedFilms.push(completedEntry);
            this.persistentStats.totalFilmsCompleted += 1;

            // Track career bests
            if (completedEntry.rating > (this.persistentStats.bestRating || 0)) {
                this.persistentStats.bestRating = completedEntry.rating;
                this.persistentStats.bestRatingFilm = film.title;
            }
            if (completedEntry.gross > (this.persistentStats.bestGross || 0)) {
                this.persistentStats.bestGross = completedEntry.gross;
                this.persistentStats.bestGrossFilm = film.title;
            }
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
        
        if (completedEntry.rating >= 10.0 && !this.persistentStats.perfectFilms.includes(filmKey)) {
            this.persistentStats.perfectFilms.push(filmKey);
        }

        this.checkAchievements();
        this.saveData();
    },

    advanceFilm() {
        const completedFilm = this.getCurrentFilm();
        this.markFilmComplete(completedFilm, this.currentRun.score);
        this.currentRun.currentFilmIndex += 1;
        this.currentRun.score = Math.min(this.currentRun.score, MAX_RUN_BUDGET);
        this.saveData();
        return this.currentRun.currentFilmIndex >= this.currentRun.filmography.length;
    },

    createRunRecap({ win = false, abandoned = false } = {}) {
        return {
            win,
            abandoned,
            score: Math.floor(this.currentRun.score || 0),
            productionCosts: Math.floor(this.currentRun.productionCosts || 0),
            moviesCompleted: this.currentRun.completedFilms.length,
            completedFilms: [...this.currentRun.completedFilms],
            ballStats: { ...this.currentRun.ballStats },
            lastGrossRoundScore: Math.floor(this.currentRun.lastGrossRoundScore || 0),
            lastProductionCost: Math.floor(this.currentRun.lastProductionCost || 0),
            lastNetRoundScore: Math.floor(this.currentRun.lastNetRoundScore || 0),
            lastExpectedReels: this.currentRun.lastExpectedReels || 0,
            lastReelsOver: this.currentRun.lastReelsOver || 0,
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

        this.checkAchievements({ isWin, runEnded: true });
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

        // Only reset on genuine data corruption (NaN/null/undefined), never on
        // intentionally low or zero volumes — those are valid user preferences.
        const corruptedVolumes = !Number.isFinite(this.persistentStats.masterVolume) ||
            (!Number.isFinite(this.persistentStats.musicVolume) && !Number.isFinite(this.persistentStats.sfxVolume));

        if (corruptedVolumes) {
            console.warn('Audio settings corrupted. Restoring defaults.');
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
    },

    checkAchievements(context = {}) {
        const stats = this.persistentStats;
        const run = this.currentRun;
        const gallery = this.persistentGallery;
        const now = Date.now();

        const unlock = (id) => {
            if (!stats.achievements[id]) {
                stats.achievements[id] = now;
                console.log(`ACHIEVEMENT UNLOCKED: ${id}`);
                return true;
            }
            return false;
        };

        // 1-10. Director Mastery
        const directors = [
            'Akira Kurosawa', 'Agnès Varda', 'Satyajit Ray', 'Spike Lee', 'Jane Campion',
            'Bong Joon-ho', 'Guillermo del Toro', 'John Singleton', 'Ava DuVernay', 'Chloe Zhao'
        ];
        directors.forEach((name, i) => {
            if (stats.directorProgress[name] >= 5) {
                unlock(`DIR_${(i + 1).toString().padStart(2, '0')}`);
            }
        });

        // 11. Cut! (First Game Over)
        if (stats.totalRuns > stats.wins) unlock('GAME_OVER');

        // 12. The End (First Win)
        if (stats.wins > 0) unlock('WIN_01');

        // 13. Halfway There (25 movies)
        if (gallery.length >= 25) unlock('HALF_GALLERY');

        // 14. The Archivist (50 movies)
        if (gallery.length >= 50) unlock('FULL_GALLERY');

        // 15. Critics' Choice (10.0 Rating)
        if (stats.bestRating >= 10.0) unlock('PERFECT_10');

        // 16. Masterpiece (Perfect 10.0 Run)
        if (context.isWin && run.completedFilms.every(f => f.rating >= 10.0)) {
            unlock('PERFECT_RUN');
        }

        // 17. Perfect Gallery (All 50 with 10.0)
        if (stats.perfectFilms.length >= 50) unlock('PERFECT_ALL');

        // 18. Big Budget ($100M film - 10,000 score units)
        if (stats.bestGross >= 10000) unlock('SCORE_100M');

        // 19. Billionaire Club ($1,000M lifetime - 100,000 score units)
        if (stats.lifetimeScore >= 100000) unlock('CAREER_1B');

        // 20. Oscar Winner (First Oscar)
        if (run.lastOscarCount > 0) unlock('OSCAR_01');

        // 21. Ensemble (3 actors in 1 film)
        if (run.lastCastCount >= 3) unlock('ENSEMBLE');

        // 22. Blockbuster (200% profit)
        if (run.lastGrossRoundScore >= run.lastProductionCost * 2 && run.lastProductionCost > 0) {
            unlock('PROFIT_200');
        }

        // 23. Efficiency Expert (Actual <= Expected reels)
        if (run.lastReelsDropped > 0 && run.lastReelsDropped <= run.lastExpectedReels) {
            unlock('EFFICIENCY');
        }

        // 24. Casting Legend (3 actors in every film of a run)
        if (context.runEnded && run.completedFilms.length >= 5 && run.completedFilms.every(f => (f.castCount || 0) >= 3)) {
            unlock('CASTING_STREAK');
        }
    }
};

export const ACHIEVEMENTS = [
    { id: 'DIR_01', title: 'MASTER OF MOTION', desc: 'Capture all 5 Akira Kurosawa films.' },
    { id: 'DIR_02', title: 'THE LEFT BANK', desc: 'Capture all 5 Agnès Varda films.' },
    { id: 'DIR_03', title: 'THE HUMANIST', desc: 'Capture all 5 Satyajit Ray films.' },
    { id: 'DIR_04', title: 'THE VISIONARY', desc: 'Capture all 5 Spike Lee films.' },
    { id: 'DIR_05', title: 'POETIC JUSTICE', desc: 'Capture all 5 Jane Campion films.' },
    { id: 'DIR_06', title: 'GENRE BENDER', desc: 'Capture all 5 Bong Joon-ho films.' },
    { id: 'DIR_07', title: 'MONSTER MAKER', desc: 'Capture all 5 Guillermo del Toro films.' },
    { id: 'DIR_08', title: 'URBAN REALIST', desc: 'Capture all 5 John Singleton films.' },
    { id: 'DIR_09', title: 'DRAMA QUEEN', desc: 'Capture all 5 Ava DuVernay films.' },
    { id: 'DIR_10', title: 'INDIE NOMAD', desc: 'Capture all 5 Chloe Zhao films.' },
    { id: 'GAME_OVER', title: 'CUT!', desc: 'Experience your first production failure.' },
    { id: 'WIN_01', title: 'THE END', desc: 'Complete a full 5-film campaign.' },
    { id: 'HALF_GALLERY', title: 'HALFWAY THERE', desc: 'Unlock 25 movies in the archive.' },
    { id: 'FULL_GALLERY', title: 'THE ARCHIVIST', desc: 'Unlock all 50 movies in the archive.' },
    { id: 'PERFECT_10', title: "CRITICS' CHOICE", desc: 'Earn a perfect 10.0 rating on a film.' },
    { id: 'PERFECT_RUN', title: 'MASTERPIECE', desc: 'Finish a run with all 5 films rated 10.0.' },
    { id: 'PERFECT_ALL', title: 'PERFECT GALLERY', desc: 'Unlock all 50 movies with a 10.0 rating.' },
    { id: 'SCORE_100M', title: 'BIG BUDGET', desc: 'Earn over $100.0 Mil in a single film.' },
    { id: 'CAREER_1B', title: 'BILLIONAIRE CLUB', desc: 'Earn over $1,000.0 Mil in lifetime gross.' },
    { id: 'OSCAR_01', title: 'OSCAR WINNER', desc: 'Collect your first Oscar.' },
    { id: 'ENSEMBLE', title: 'ENSEMBLE CAST', desc: 'Catch all 3 actors in a single film.' },
    { id: 'PROFIT_200', title: 'BLOCKBUSTER', desc: 'Earn 200% profit in a single film.' },
    { id: 'EFFICIENCY', title: 'EFFICIENCY EXPERT', desc: 'Finish a film using expected reels or less.' },
    { id: 'CASTING_STREAK', title: 'CASTING LEGEND', desc: 'Catch 3 actors in every film of a run.' }
];

GameState.loadData();
