import Phaser from 'phaser';
import { GameState, MAX_RUN_BUDGET } from '../GameState.js';
import { UI } from '../utils/UI.js';
import { TMDB } from '../utils/TMDB.js';

const DIALOGUE = {
    blockbuster: [
        'This is CINEMA. Pure cinema.',
        "We're sweeping every award!",
        'The studio is already green-lighting the sequel.',
        'I told them. Nobody believed me. Ha.',
        "Box office records? We don't chase them. They chase us."
    ],
    hit: [
        'Solid work. The studio approves.',
        'We made it. Now the next one.',
        'The critics noticed. Good.',
        'Not our best. But definitely not our worst.',
        'A respectable entry in the filmography.'
    ],
    cult_classic: [
        "Critics won't understand. Yet.",
        'Ahead of its time. Trust me.',
        'The midnight screenings will be legendary.',
        "The numbers lie. The art doesn't.",
        'Thirty years from now, they\'ll call it visionary.'
    ],
    bomb: [
        'The studio is calling. Run.',
        'How did we let this happen?',
        'We need more reels. Many more reels.',
        "The editor's cut was better. Obviously.",
        'Next film. We go again. No choice.'
    ]
};

const SUGGESTIONS = {
    extra_balls: { title: '+5 REELS', desc: 'Drop more reels to hit the target.', icon: 'film' },
    big_explosion: { title: 'IMAX BLAST', desc: 'Bigger explosions unstick jammed reels.', icon: 'film' }
};

export default class ShopScene extends Phaser.Scene {
    constructor() {
        super('ShopScene');
        this.upgradePool = [
            { id: 'extra_balls', title: '+5 REELS', desc: 'Add 5 extra film reels to your starting stock.', cost: 3000, mod: { startingBalls: 5 } },
            { id: 'bouncy_pegs', title: 'BOUNCIER PEGS', desc: 'Pegs gain +25% restitution. Higher bounce, more chaos.', cost: 4500, mod: { pegBounce: 0.25 } },
            { id: 'big_explosion', title: 'IMAX BLAST', desc: 'Increase anti-stuck explosion radius by 50%.', cost: 6000, mod: { explosionRadiusMult: 1.5 } },
            { id: 'wide_buckets', title: 'WIDE SCREEN', desc: 'Catch-buckets are 20% wider for easier scoring.', cost: 5000, mod: { bucketWidthMult: 1.2 } },
            { id: 'slow_funnel', title: 'STEADY CAM', desc: 'The funnel moves 30% slower for precise timing.', cost: 3500, mod: { funnelSpeedMult: 0.7 } },
            { id: 'stretch_pads', title: 'GRIP EQUIPMENT', desc: 'Start every level with 2 free Stretch Pads.', cost: 7000, mod: { startingStretchPads: 2 } },
            { id: 'multi_ball', title: 'RE-SHOOTS', desc: 'Gain 3 Multi-Ball powerups for the next film.', cost: 9000, mod: { startingMultiBalls: 3 } }
        ];
    }

    init() {
        this.offeredUpgrades = Phaser.Utils.Array.Shuffle([...this.upgradePool]).slice(0, 3);
    }

    preload() {
        if (!this.textures.exists('icon_film')) {
            this.load.svg('icon_film', '/src/assets/images/film.svg', { width: 48, height: 48 });
        }
        if (!this.textures.exists('icon_vhs')) {
            this.load.svg('icon_vhs', '/src/assets/images/vhs.svg', { width: 48, height: 48 });
        }
    }

    create() {
        UI.createWheelTransition(this, 'in');
        const { width, height } = this.scale;
        const margin = 60;
        const safeWidth = width - (margin * 2);
        const safeHeight = height - (margin * 2);
        const sidebarWidth = Math.floor(safeWidth * 0.3);
        const boardWidth = Math.floor(safeWidth * 0.7);
        const innerSidebarW = sidebarWidth - 36;
        const pad = 18;

        const run = GameState.currentRun;
        const nextFilm = run.filmography[run.currentFilmIndex] || null;
        const nextPosterKey = nextFilm?.id ? `poster_${nextFilm.id}` : null;

        // ── Backgrounds ──────────────────────────────────────────────────────────
        this.add.rectangle(margin, margin, boardWidth, safeHeight, 0x111111).setOrigin(0, 0).setDepth(5);
        this.add.rectangle(margin + boardWidth, margin, sidebarWidth, safeHeight, 0x0a0a0a).setOrigin(0, 0).setDepth(5);

        const borders = this.add.graphics();
        borders.lineStyle(3, 0xff8800, 1);
        borders.strokeRect(margin, margin, boardWidth + sidebarWidth, safeHeight);
        borders.lineStyle(2, 0xff8800, 0.5);
        borders.lineBetween(margin + boardWidth, margin, margin + boardWidth, margin + safeHeight);
        borders.setDepth(6);

        const storeTitleY = margin + 45;
        this.add.text(margin + boardWidth / 2, storeTitleY, 'PRE-PRODUCTION STORE', {
            fontSize: '44px', fontFamily: '"VT323", monospace', color: '#ffcc00', align: 'center'
        }).setOrigin(0.5, 0).setDepth(10);

        // ── Board area: taller upgrade cards ────────────────────────────
        const cardWidth = 620;
        const cardHeight = 90; 
        const cardGap = 15;
        const startY = margin + 160;

        this.offeredUpgrades.forEach((upgrade, index) => {
            const y = startY + index * (cardHeight + cardGap);
            const container = this.add.container(margin + boardWidth / 2, y);
            const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x1a1a1a).setStrokeStyle(2, 0x444444);
            const title = this.add.text(-cardWidth / 2 + 25, -cardHeight / 2 + 20, upgrade.title.toUpperCase(), {
                fontSize: '22px', fontFamily: '"VT323", monospace', color: '#ffcc00'
            });
            const desc = this.add.text(-cardWidth / 2 + 25, 10, upgrade.desc, {
                fontSize: '18px', fontFamily: '"VT323", monospace', color: '#aaaaaa',
                wordWrap: { width: cardWidth - 250 }
            });
            const costBtn = UI.createChunkyButton(this, cardWidth / 2 - 110, 0, 180, 52,
                GameState.formatMillions(upgrade.cost), () => this.purchaseUpgrade(upgrade, container));
            
            container.add([bg, title, desc, costBtn]);
            container.costBtn = costBtn;
            container.setDepth(10);
        });

        const budgetY = 560;
        const budgetBg = this.add.rectangle(margin + boardWidth / 2, budgetY, 400, 48, 0x002233, 0.8)
            .setStrokeStyle(2, 0x66f2ff).setDepth(10);
        this.budgetLabel = this.add.text(margin + boardWidth / 2, budgetY, `BUDGET AVAILABLE: ${GameState.formatMillions(run.score)}`, {
            fontSize: '32px', fontFamily: '"VT323", monospace', color: '#66f2ff', fontWeight: 'bold'
        }).setOrigin(0.5).setDepth(11);

        // ── Board area: Director & Premiere (Lowered for breathing room) ──
        const directorY = 740; 
        const portraitW = 150;
        const portraitH = 210;
        const frameX = margin + boardWidth / 2;

        const portraitCard = this.add.rectangle(frameX, directorY, portraitW + 30, portraitH + 40, 0x20150b, 1)
            .setStrokeStyle(4, 0xffd27a).setDepth(10);
        const portraitMatte = this.add.rectangle(frameX, directorY - 10, portraitW + 10, portraitH + 10, 0x111111, 1)
            .setStrokeStyle(2, 0xffaa00).setDepth(10);

        if (this.textures.exists('director_portraits')) {
            const frameToken = this._resolveDirectorPortraitFrame(run);
            const portrait = this.add.sprite(frameX, directorY - 15, 'director_portraits');
            portrait.setTexture('director_portraits', frameToken);
            portrait.setDisplaySize(portraitW, portraitH);
            portrait.setDepth(11);
        }

        // Blue Box (Dialogue)
        const blueBoxY = 940;
        const blueBoxW = 640;
        const blueBox = this.add.rectangle(frameX, blueBoxY, blueBoxW, 90, 0x003366, 0.95)
            .setStrokeStyle(3, 0x66ccff).setDepth(10);
        
        this.add.text(frameX, blueBoxY - 26, (run.directorName || 'UNKNOWN').toUpperCase(), {
            fontSize: '26px', fontFamily: '"VT323", monospace', color: '#ffcc00'
        }).setOrigin(0.5).setDepth(11);

        const rating10 = GameState.calculateRating(run);
        const dialogue = this._getDialogue(rating10 / 6, run.directorName);
        this.add.text(frameX, blueBoxY + 12, `"${dialogue}"`, {
            fontSize: '18px', fontFamily: '"VT323", monospace', color: '#ffffff', align: 'center',
            wordWrap: { width: blueBoxW - 40 }
        }).setOrigin(0.5).setDepth(11);

        // ── Board area: Review & Details ──────────────────────────────────────────
        const reviewY = 1120;
        const completedFilm = run.completedFilms[run.completedFilms.length - 1] || null;
        const currentPosterKey = completedFilm?.id ? `poster_${completedFilm.id}` : null;
        
        // Poster on left
        const posterW = 160;
        const posterH = 240;
        const posterX = frameX - 180;
        const posterFrame = this.add.rectangle(posterX, reviewY, posterW + 16, posterH + 16, 0x000000)
            .setStrokeStyle(3, 0x444444).setDepth(10);
        if (currentPosterKey && this.textures.exists(currentPosterKey)) {
            this.add.image(posterX, reviewY, currentPosterKey).setDisplaySize(posterW, posterH).setDepth(11);
        }

        // Critic Rating Centered below poster
        const ratingY = reviewY + posterH / 2 + 40;
        this.add.text(posterX, ratingY, `CRITIC RATING: ${rating10.toFixed(1)} / 10.0`, {
            fontSize: '28px', fontFamily: '"VT323", monospace', color: '#ffcc00'
        }).setOrigin(0.5).setDepth(11);

        // Breakdown on right
        const detailsX = frameX + 20;
        const detailsY = reviewY - 110;
        this.add.text(detailsX, detailsY, 'WORLD PREMIERE RESULTS', {
            fontSize: '28px', fontFamily: '"VT323", monospace', color: '#ffcc00'
        }).setOrigin(0, 0).setDepth(11);

        const breakdown = this._getBreakdown(run);
        let dy = detailsY + 45;
        breakdown.forEach(item => {
            this.add.text(detailsX, dy, item.label, {
                fontSize: '20px', fontFamily: '"VT323", monospace', color: '#aaaaaa'
            }).setDepth(11);
            this.add.text(detailsX + 300, dy, item.value, {
                fontSize: '20px', fontFamily: '"VT323", monospace', color: item.pts > 0 ? '#66ff88' : (item.pts < 0 ? '#ff6666' : '#666666'), align: 'right'
            }).setOrigin(1, 0).setDepth(11);
            dy += 28;
        });

        // ── Board area: Upcoming Feature Preview ─────────────────────────────────
        const upcomingFilm = run.filmography?.[run.currentFilmIndex];
        if (upcomingFilm) {
            const upNextY = 1420; // Pushed down past review
            this.add.text(frameX, upNextY, 'COMING SOON', {
                fontSize: '22px', fontFamily: '"VT323", monospace', color: '#66f2ff'
            }).setOrigin(0.5).setDepth(11);
            
            const nextPosterKey = `poster_${upcomingFilm.id}`;
            const nextPosterW = 160;
            const nextPosterH = 240;
            if (this.textures.exists(nextPosterKey)) {
                this.add.image(frameX - 220, upNextY + 120, nextPosterKey).setDisplaySize(nextPosterW, nextPosterH).setDepth(11);
            } else {
                this.add.rectangle(frameX - 220, upNextY + 120, nextPosterW, nextPosterH, 0x111111).setStrokeStyle(1, 0x333333).setDepth(11);
            }
            
            const levelInfo = TMDB.getLevelDataFromFilm(upcomingFilm);
            const details = [
                `TITLE: ${upcomingFilm.title.toUpperCase()}`,
                `EXPECTED REELS: ${levelInfo.expectedReels}`,
                `TARGET SCORE: ${GameState.formatMillions(levelInfo.targetScore)}`,
                `ENSEMBLE SLOTS: 3`
            ];
            
            details.forEach((line, i) => {
                this.add.text(frameX - 120, upNextY + 40 + (i * 32), line, {
                    fontSize: i === 0 ? '28px' : '20px', 
                    fontFamily: '"VT323", monospace', 
                    color: i === 0 ? '#ffffff' : '#aaaaaa',
                    wordWrap: { width: 440 }
                }).setOrigin(0, 0).setDepth(11);
            });
        }

        // Next Filming Button (Moved up slightly from very bottom)
        const nextBtn = UI.createChunkyButton(this, frameX, height - 140, 420, 80, 'NEXT FILMING >', () => {
            UI.createWheelTransition(this, 'out', () => {
                this.scene.start('PachinkoScene');
            });
        }).setDepth(10);

        // ── Sidebar: Run Recap ────────────────────────────────────────────────────
        const sidebar = this.add.container(margin + boardWidth, margin).setDepth(50);

        const maskShape = this.make.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect(margin + boardWidth, margin, sidebarWidth, safeHeight);
        sidebar.setMask(maskShape.createGeometryMask());

        // Settings button — top-right of sidebar, matching PachinkoScene position
        const settingsOverlay = UI.createSettingsOverlay(this, {
            showAbandon: true,
            onAbandon: () => {
                if (!this.sound.mute && this.cache.audio.exists('sfx_abandon')) {
                    this.sound.play('sfx_abandon', { volume: 0.9 * (GameState.getAudioSettings(this).sfxVolume ?? 1) });
                }
                UI.createWheelTransition(this, 'out', () => {
                    this.scene.start('GameOverScene', { win: false, abandoned: true });
                });
            }
        });

        const settingsPosition = UI.getSettingsButtonPositionInContainer(this, margin + boardWidth, margin);
        const settingsBtn = UI.createSettingsButton(this, settingsPosition.x, settingsPosition.y, () => {
            if (!this.sound.mute && this.cache.audio.exists('sfx_gear')) {
                this.sound.play('sfx_gear', { volume: 0.8 * (GameState.getAudioSettings(this).sfxVolume ?? 1) });
            }
            settingsOverlay.openModal();
        });

        this._buildShopSidebar(sidebar, run, nextFilm, nextPosterKey, sidebarWidth, innerSidebarW, pad);

        sidebar.add(settingsBtn);
        if (typeof sidebar.bringToTop === 'function') {
            sidebar.bringToTop(settingsBtn);
        }
        settingsBtn.setDepth(2000);

        // Ambient sound
        if (!this.sound.mute && this.cache.audio.exists('sfx_oscar')) {
            this.sound.play('sfx_oscar', { volume: 0.3 * (GameState.getAudioSettings(this).sfxVolume ?? 1) });
        }
    }

    _getBreakdown(run) {
        const actual = run.lastReelsDropped || 0;
        const expected = run.lastExpectedReels || 1;
        const gross = run.lastGrossRoundScore || 0;
        const costs = run.lastProductionCost || 1;
        const actors = run.lastCastCount || 0;
        const oscars = run.lastOscarCount || 0;

        const items = [];
        
        // 1. Reel Efficiency (5.0 pts)
        let reelPts = 5.0;
        if (actual > expected) reelPts -= (actual - expected);
        reelPts = Math.max(0, reelPts);
        items.push({ 
            label: 'REEL EFFICIENCY', 
            value: `${reelPts.toFixed(1)}/5.0`, 
            pts: reelPts > 0 ? 1 : 0 
        });

        // 2. Profit Score (2.0 pts)
        let profitPts = 0;
        if (gross >= costs) {
            profitPts = 1.0 + Math.min(1.0, (gross / costs) - 1.0);
        }
        items.push({ 
            label: 'PROFIT SCORE', 
            value: `${profitPts.toFixed(1)}/2.0`, 
            pts: profitPts > 0 ? 1 : 0 
        });

        // 3. Ensemble Cast (2.0 pts)
        const ensemblePts = (Math.min(3, actors) / 3) * 2.0;
        items.push({ 
            label: 'ENSEMBLE CAST', 
            value: `${ensemblePts.toFixed(1)}/2.0`, 
            pts: ensemblePts > 0 ? 1 : 0 
        });

        // 4. Oscar Bonus (1.0 pts)
        const oscarPts = oscars > 0 ? 1.0 : 0;
        items.push({ 
            label: 'OSCAR BONUS', 
            value: `${oscarPts.toFixed(1)}/1.0`, 
            pts: oscarPts > 0 ? 1 : 0 
        });
        
        return items;
    }

    _getRatingInfo(ratio) {
        if (ratio >= 1.5) return { label: 'BLOCKBUSTER', color: '#ffcc00', bg: 0x332200, border: 0xffcc00 };
        if (ratio >= 1.0) return { label: 'HIT', color: '#66ff88', bg: 0x002200, border: 0x44cc66 };
        if (ratio >= 0.5) return { label: 'CULT CLASSIC', color: '#88aaff', bg: 0x001133, border: 0x5577cc };
        return { label: 'BOX OFFICE BOMB', color: '#ff5555', bg: 0x220000, border: 0xcc2222 };
    }

    _getDialogue(ratio, directorName) {
        let pool;
        if (ratio >= 1.5) pool = DIALOGUE.blockbuster;
        else if (ratio >= 1.0) pool = DIALOGUE.hit;
        else if (ratio >= 0.5) pool = DIALOGUE.cult_classic;
        else pool = DIALOGUE.bomb;
        return pool[(directorName || '').length % pool.length];
    }

    _getSuggestion(ratio, reelDrops) {
        if (ratio >= 1.0) return null;
        return reelDrops < 6 ? SUGGESTIONS.extra_balls : SUGGESTIONS.big_explosion;
    }

    _buildShopSidebar(sidebar, run, nextFilm, nextPosterKey, sidebarWidth, innerSidebarW, pad) {
        const { height } = this.scale;
        const safeHeight = height - 120;
        sidebar.add(this.add.rectangle(sidebarWidth / 2, safeHeight / 2, sidebarWidth, safeHeight, 0x0d0d0d, 1));
        
        let sy = 130; // Lowered more for breathing room
        const summaryTitle = this.add.text(sidebarWidth / 2, sy, 'RUN SUMMARY', {
            fontSize: '32px', fontFamily: '"VT323", monospace', color: '#ffaa00'
        }).setOrigin(0.5, 0);
        sidebar.add(summaryTitle);

        // Underline
        const underline = this.add.graphics();
        underline.lineStyle(2, 0xffaa00, 0.6);
        underline.lineBetween(sidebarWidth / 2 - 80, sy + 38, sidebarWidth / 2 + 80, sy + 38);
        sidebar.add(underline);

        sy += 75;

        const lastFilm = run.completedFilms[run.completedFilms.length - 1] || {};
        const statRows = [
            { label: 'TOTAL FILMS', value: `${run.currentFilmIndex}/${run.filmography?.length || 5}` },
            { label: 'LAST GROSS', value: GameState.formatMillions(lastFilm.gross || 0) },
            { label: 'LAST COSTS', value: GameState.formatMillions(lastFilm.cost || 0), color: '#ff6666' },
            { label: 'LAST NET', value: GameState.formatMillions(lastFilm.net || 0), color: (lastFilm.net || 0) >= 0 ? '#66ff88' : '#ff6666' },
            { label: 'LIFETIME BOX', value: GameState.formatMillions(run.score) },
            { label: 'TOTAL REELS', value: run.totalReelsDropped || run.reelDrops || 0 }
        ];

        statRows.forEach(row => {
            sidebar.add(this.add.text(pad, sy, row.label, { fontSize: '18px', fontFamily: '"VT323", monospace', color: '#666666' }));
            sidebar.add(this.add.text(sidebarWidth - pad, sy, row.value, { 
                fontSize: '18px', 
                fontFamily: '"VT323", monospace', 
                color: row.color || '#cccccc', 
                align: 'right' 
            }).setOrigin(1, 0));
            sy += 24;
        });

        sy += 40;

        // ── Filmography History (Vertical List) ──────────────────────────────────
        sidebar.add(this.add.text(sidebarWidth / 2, sy, 'PRODUCTION HISTORY', {
            fontSize: '18px', fontFamily: '"VT323", monospace', color: '#444444'
        }).setOrigin(0.5, 0));
        sy += 30;

        const rowH = 80;
        const thumbW = 40;
        const thumbH = 60;

        const unlockedGallery = new Set(GameState.persistentGallery.map(f => f.id));

        for (let i = 0; i < 5; i++) {
            const film = run.filmography?.[i];
            const isCompleted = i < run.currentFilmIndex;
            const isCurrent = i === run.currentFilmIndex;
            const isUnlocked = film && (isCompleted || unlockedGallery.has(film.id));
            const rowY = sy + i * (rowH + 6);
            
            // Background row (Portrait Rectangle look)
            sidebar.add(this.add.rectangle(sidebarWidth / 2, rowY + rowH / 2, sidebarWidth - pad * 2, rowH, 0x1a1a1a).setStrokeStyle(1, 0x333333));
            
            if (film) {
                const posterKey = `poster_${film.id}`;
                if (isUnlocked && this.textures.exists(posterKey)) {
                    const poster = this.add.image(pad + 30, rowY + rowH / 2, posterKey);
                    poster.setDisplaySize(thumbW, thumbH);
                    sidebar.add(poster);
                } else {
                    // Placeholder for current/future
                    const placeholder = this.add.rectangle(pad + 30, rowY + rowH / 2, thumbW, thumbH, 0x000000).setStrokeStyle(1, 0x444444);
                    sidebar.add(placeholder);
                    sidebar.add(this.add.text(pad + 30, rowY + rowH / 2, isCurrent ? '!' : '?', {
                        fontSize: '20px', fontFamily: '"VT323", monospace', color: isCurrent ? '#ffaa00' : '#444444'
                    }).setOrigin(0.5));
                }

                const titleText = isUnlocked || isCurrent ? film.title.toUpperCase() : 'LOCKED';
                const titleColor = isCurrent ? '#ffaa00' : (isCompleted ? '#ffffff' : '#666666');

                sidebar.add(this.add.text(pad + 60, rowY + 15, titleText, {
                    fontSize: '15px', fontFamily: '"VT323", monospace', color: titleColor,
                    wordWrap: { width: sidebarWidth - pad * 2 - 100 }
                }));

                if (isCompleted) {
                    const savedFilm = run.completedFilms.find(f => f.id === film.id);
                    const rating = savedFilm?.rating || 0;
                    const gross = savedFilm?.gross || 0;
                    
                    sidebar.add(this.add.text(sidebarWidth - pad - 10, rowY + 15, `${rating.toFixed(1)}/10`, {
                        fontSize: '18px', fontFamily: '"VT323", monospace', color: '#ffcc00'
                    }).setOrigin(1, 0));

                    sidebar.add(this.add.text(sidebarWidth - pad - 10, rowY + 45, GameState.formatMillions(gross), {
                        fontSize: '16px', fontFamily: '"VT323", monospace', color: '#66ff88'
                    }).setOrigin(1, 0));
                }
            }
        }

        sy += 5 * (rowH + 6) + 40;

        // ── Career Bests ────────────────────────────────────────────────────────
        sidebar.add(this.add.text(sidebarWidth / 2, sy, 'CAREER BESTS', {
            fontSize: '18px', fontFamily: '"VT323", monospace', color: '#444444'
        }).setOrigin(0.5, 0));
        sy += 30;

        const bestStats = [
            { label: 'HIGHEST RATED', value: `${GameState.persistentStats.bestRating?.toFixed(1) || '0.0'}`, sub: GameState.persistentStats.bestRatingFilm || 'NONE' },
            { label: 'HIGHEST EARNER', value: GameState.formatMillions(GameState.persistentStats.bestGross || 0), sub: GameState.persistentStats.bestGrossFilm || 'NONE' }
        ];

        bestStats.forEach(stat => {
            sidebar.add(this.add.text(pad, sy, stat.label, { fontSize: '16px', fontFamily: '"VT323", monospace', color: '#666666' }));
            sidebar.add(this.add.text(sidebarWidth - pad, sy, stat.value, { fontSize: '18px', fontFamily: '"VT323", monospace', color: '#ffcc00', align: 'right' }).setOrigin(1, 0));
            sy += 20;
            sidebar.add(this.add.text(sidebarWidth - pad, sy, stat.sub.toUpperCase(), { fontSize: '14px', fontFamily: '"VT323", monospace', color: '#444444', align: 'right' }).setOrigin(1, 0));
            sy += 25;
        });
    }

    _resolveDirectorPortraitFrame(run) {
        if (!this.textures.exists('director_portraits')) {
            return run.directorPortraitFrame ?? 0;
        }

        const texture = this.textures.get('director_portraits');
        const portraitToken = this._resolveDirectorPortraitToken(run);
        if (texture.has(portraitToken)) {
            return portraitToken;
        }

        const numericFrame = run.directorPortraitFrame ?? 0;
        return texture.has(numericFrame) ? numericFrame : 0;
    }

    _resolveDirectorPortraitToken(run) {
        const candidates = [
            run.directorPortraitKey,
            run.directorPortraitFrame
        ];
        const hardcodedMatch = TMDB.getHardcodedDirectors().find((director) => {
            return director.id === run.directorId || director.name === run.directorName;
        });
        if (hardcodedMatch) {
            candidates.push(hardcodedMatch.portraitKey, hardcodedMatch.portraitFrame);
        }
        return candidates.find((candidate) => candidate !== undefined && candidate !== null) ?? 0;
    }

    _addDirectorPortrait(sidebar, run, x, y, width, height, imageOffsetY = 0) {
        if (!this.textures.exists('director_portraits')) {
            sidebar.add(this.add.rectangle(x, y, width, height, 0x222222).setStrokeStyle(2, 0x555555));
            return;
        }

        const frameToken = this._resolveDirectorPortraitFrame(run);
        const portrait = this.add.sprite(x, y + imageOffsetY, 'director_portraits');
        portrait.setTexture('director_portraits', frameToken);
        portrait.setDisplaySize(width, height);
        sidebar.add(portrait);
    }

    _fitImageWithin(image, maxWidth, maxHeight) {
        const textureWidth = image.width || image.frame?.width || maxWidth;
        const textureHeight = image.height || image.frame?.height || maxHeight;
        const scale = Math.min(maxWidth / textureWidth, maxHeight / textureHeight);
        image.setDisplaySize(textureWidth * scale, textureHeight * scale);
    }

    _divider(x1, y, x2) {
        const g = this.add.graphics();
        g.lineStyle(1, 0x444444, 0.8);
        g.lineBetween(x1, y, x2, y);
        return g;
    }

    purchaseUpgrade(upgrade, container) {
        if (GameState.currentRun.score >= upgrade.cost) {
            GameState.currentRun.score -= upgrade.cost;
            Object.assign(GameState.currentRun.modifiers, upgrade.mod);

            if (this.budgetLabel) {
                this.budgetLabel.setText(`BUDGET AVAILABLE: ${GameState.formatMillions(GameState.currentRun.score)}`);
            }

            const label = container.costBtn?.list?.[1];
            if (label) label.setText('PURCHASED');
            container.setAlpha(0.7);
            container.list.forEach(c => { if (c.disableInteractive) c.disableInteractive(); });

            if (!this.sound.mute && this.cache.audio.exists('sfx_win1')) {
                this.sound.play('sfx_win1', { volume: 0.8 * (GameState.getAudioSettings(this).sfxVolume ?? 1) });
            }
        } else {
            this.cameras.main.shake(100, 0.005);
        }
    }
}
