import Phaser from 'phaser';
import { GameState } from '../GameState.js';
import { UI } from '../utils/UI.js';
import { TMDB } from '../utils/TMDB.js';

export default class DirectorCutScene extends Phaser.Scene {
    constructor() {
        super('DirectorCutScene');
    }

    init(data) {
        this.win = Boolean(data?.win);
        this.abandoned = Boolean(data?.abandoned);
        this.finalScore = data?.score ?? GameState.currentRun.score ?? 0;
        this.productionCosts = data?.productionCosts ?? GameState.currentRun.productionCosts ?? 0;
        this.lastGrossRoundScore = data?.lastGrossRoundScore ?? GameState.currentRun.lastGrossRoundScore ?? 0;
        this.lastProductionCost = data?.lastProductionCost ?? GameState.currentRun.lastProductionCost ?? 0;
        this.lastNetRoundScore = data?.lastNetRoundScore ?? GameState.currentRun.lastNetRoundScore ?? 0;
        this.lastExpectedReels = data?.lastExpectedReels ?? GameState.currentRun.lastExpectedReels ?? 0;
        this.lastReelsOver = data?.lastReelsOver ?? GameState.currentRun.lastReelsOver ?? 0;
        this.moviesCompleted = data?.moviesCompleted ?? GameState.currentRun.currentFilmIndex ?? 0;
        this.completedFilms = data?.completedFilms ?? [...GameState.currentRun.completedFilms];
        this.ballStats = data?.ballStats ?? { ...GameState.currentRun.ballStats };
        this.lastRating = GameState.calculateRating();
    }

    create() {
        UI.createWheelTransition(this, 'in');
        const { width, height } = this.scale;
        const margin = 60;
        const safeWidth = width - (margin * 2);
        const safeHeight = height - (margin * 2);
        const sidebarWidth = Math.floor(safeWidth * 0.3);
        const boardWidth = Math.floor(safeWidth * 0.7);
        const pad = 18;

        const run = GameState.currentRun;

        // ── Backgrounds ──────────────────────────────────────────────────────────
        this.add.rectangle(margin, margin, boardWidth, safeHeight, 0x111111).setOrigin(0, 0);
        this.add.rectangle(margin + boardWidth, margin, sidebarWidth, safeHeight, 0x0a0a0a).setOrigin(0, 0);

        const borders = this.add.graphics();
        borders.lineStyle(3, 0xff8800, 1);
        borders.strokeRect(margin, margin, boardWidth + sidebarWidth, safeHeight);
        borders.lineStyle(2, 0xff8800, 0.5);
        borders.lineBetween(margin + boardWidth, margin, margin + boardWidth, margin + safeHeight);

        // ── Title ──────────────────────────────────────────────────────────────
        const titleText = this.abandoned ? 'PRODUCTION ABANDONED' : (this.win ? 'FILMOGRAPHY COMPLETE!' : 'DIRECTOR CUT!');
        const titleColor = this.abandoned ? '#ff8844' : (this.win ? '#00ff88' : '#ff4444');

        this.add.text(margin + boardWidth / 2, margin + 45, titleText, {
            fontSize: '56px',
            fontFamily: '"VT323", monospace',
            color: titleColor,
            stroke: '#000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5, 0);

        // ── Last Film Results (Main Area) ──────────────────────────────────────
        const frameX = margin + boardWidth / 2;
        const reviewY = 450;
        
        const completedFilm = this.completedFilms[this.completedFilms.length - 1] || null;
        const currentPosterKey = completedFilm?.id ? `poster_${completedFilm.id}` : null;

        // Poster
        const posterW = 280;
        const posterH = 420;
        const posterX = frameX - 220;
        this.add.rectangle(posterX, reviewY, posterW + 20, posterH + 20, 0x000000).setStrokeStyle(4, 0x444444);
        if (currentPosterKey && this.textures.exists(currentPosterKey)) {
            this.add.image(posterX, reviewY, currentPosterKey).setDisplaySize(posterW, posterH);
        }

        // Details next to poster
        const detailsX = frameX - 40;
        const detailsY = reviewY - 210;
        this.add.text(detailsX, detailsY, 'FINAL WRAP REPORT', {
            fontSize: '36px', fontFamily: '"VT323", monospace', color: '#ffcc00'
        }).setOrigin(0, 0);

        const breakdown = [
            { label: 'GROSS TAKE', value: GameState.formatMillions(this.lastGrossRoundScore), pts: 1 },
            { label: 'PRODUCTION COSTS', value: GameState.formatMillions(this.lastProductionCost), pts: -1 },
            { label: 'NET PROFIT', value: GameState.formatMillions(this.lastNetRoundScore), pts: this.lastNetRoundScore >= 0 ? 1 : -1 },
            { label: 'REEL EFFICIENCY', value: `${this.lastExpectedReels} / ${this.lastExpectedReels + this.lastReelsOver}`, pts: this.lastReelsOver === 0 ? 1 : 0 },
            { label: 'CRITIC RATING', value: `${this.lastRating.toFixed(1)} / 10.0`, pts: 1 }
        ];

        let dy = detailsY + 70;
        breakdown.forEach(item => {
            this.add.text(detailsX, dy, item.label, {
                fontSize: '24px', fontFamily: '"VT323", monospace', color: '#aaaaaa'
            });
            this.add.text(detailsX + 400, dy, item.value, {
                fontSize: '24px', fontFamily: '"VT323", monospace', color: item.pts > 0 ? '#66ff88' : (item.pts < 0 ? '#ff6666' : '#666666'), align: 'right'
            }).setOrigin(1, 0);
            dy += 40;
        });

        // Director Dialogue
        const directorY = 820;
        const portraitW = 180;
        const portraitH = 250;
        
        const portraitCard = this.add.rectangle(frameX - 220, directorY, portraitW + 30, portraitH + 40, 0x20150b, 1)
            .setStrokeStyle(4, 0xffd27a);
        
        if (this.textures.exists('director_portraits')) {
            const frameToken = run.directorPortraitKey || run.directorPortraitFrame || 0;
            const portrait = this.add.sprite(frameX - 220, directorY - 15, 'director_portraits');
            portrait.setTexture('director_portraits', frameToken);
            portrait.setDisplaySize(portraitW, portraitH);
        }

        const dialogueBoxY = directorY + 180;
        const dialogueBoxW = 700;
        this.add.rectangle(frameX, dialogueBoxY, dialogueBoxW, 120, 0x003366, 0.95).setStrokeStyle(3, 0x66ccff);
        
        this.add.text(frameX, dialogueBoxY - 35, (run.directorName || 'DIRECTOR').toUpperCase(), {
            fontSize: '32px', fontFamily: '"VT323", monospace', color: '#ffcc00'
        }).setOrigin(0.5);

        const dialogue = this.abandoned ? "We're walking away. The vision is lost." : (this.win ? "Masterpiece. Every frame a painting." : "The studio cut it. My vision is compromised.");
        this.add.text(frameX, dialogueBoxY + 15, `"${dialogue}"`, {
            fontSize: '22px', fontFamily: '"VT323", monospace', color: '#ffffff', align: 'center',
            wordWrap: { width: dialogueBoxW - 40 }
        }).setOrigin(0.5);

        // ── Stats Summary ──────────────────────────────────────────────────────
        const statsY = 1200;
        const statsW = 680;
        this.add.text(frameX, statsY, '--- RUN PRODUCTION STATS ---', {
            fontSize: '28px', fontFamily: '"VT323", monospace', color: '#ffaa00'
        }).setOrigin(0.5);

        const runStats = [
            `TOTAL REELS: ${this.ballStats.reel + this.ballStats.vhs + this.ballStats.dvd}`,
            `VHS RECOVERY: ${this.ballStats.vhs} | DVD EXTRAS: ${this.ballStats.dvd}`,
            `LIFETIME FILMS: ${GameState.persistentStats.totalFilmsCompleted + (this.win ? 1 : 0)}`,
            `ALL-TIME BEST: ${GameState.formatMillions(GameState.getBestProduction())}`
        ];

        runStats.forEach((line, i) => {
            this.add.text(frameX, statsY + 50 + (i * 35), line, {
                fontSize: '22px', fontFamily: '"VT323", monospace', color: '#cccccc'
            }).setOrigin(0.5);
        });

        // Navigation Button
        const runOver = GameState.currentRun.currentFilmIndex >= GameState.currentRun.filmography.length || !this.win;
        const btnLabel = runOver ? 'BACK TO MAIN MENU' : 'TO THE SHOP >';
        const btnSub = runOver ? 'CAREER PROGRESS SAVED' : 'PRE-PRODUCTION PHASE';
        
        UI.createChunkyButton(this, frameX, height - 160, 420, 90, btnLabel, () => {
            if (runOver) {
                this.cameras.main.fadeOut(800, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    GameState.resetCurrentRun();
                    this.scene.start('MenuScene');
                });
            } else {
                UI.createWheelTransition(this, 'out', () => {
                    this.scene.start('ShopScene');
                });
            }
        }, btnSub);

        // ── Sidebar: Production History ─────────────────────────────────────────
        const sidebar = this.add.container(margin + boardWidth, margin);
        this._buildSidebar(sidebar, sidebarWidth, safeHeight, pad);

        GameState.saveRunToGallery(this.win);
    }

    _buildSidebar(sidebar, width, height, pad) {
        sidebar.add(this.add.rectangle(width / 2, height / 2, width, height, 0x0d0d0d, 1));

        let sy = 60;
        sidebar.add(this.add.text(width / 2, sy, 'RUN SUMMARY', {
            fontSize: '32px', fontFamily: '"VT323", monospace', color: '#ffaa00'
        }).setOrigin(0.5, 0));

        // Underline
        const underline = this.add.graphics();
        underline.lineStyle(2, 0xffaa00, 0.6);
        underline.lineBetween(width / 2 - 80, sy + 38, width / 2 + 80, sy + 38);
        sidebar.add(underline);

        sy += 70;

        const statRows = [
            { label: 'TOTAL FILMS', value: `${GameState.currentRun.currentFilmIndex}/${GameState.currentRun.filmography?.length || 5}` },
            { label: 'TOTAL REELS', value: GameState.currentRun.reelDrops || 0 },
            { label: 'LIFETIME BOX', value: GameState.formatMillions(GameState.currentRun.score) }
        ];

        statRows.forEach(row => {
            sidebar.add(this.add.text(pad, sy, row.label, { fontSize: '18px', fontFamily: '"VT323", monospace', color: '#666666' }));
            sidebar.add(this.add.text(width - pad, sy, row.value, { 
                fontSize: '18px', 
                fontFamily: '"VT323", monospace', 
                color: '#cccccc', 
                align: 'right' 
            }).setOrigin(1, 0));
            sy += 24;
        });

        sy += 50;

        sidebar.add(this.add.text(width / 2, sy, 'PRODUCTION HISTORY', {
            fontSize: '18px', fontFamily: '"VT323", monospace', color: '#444444'
        }).setOrigin(0.5, 0));
        
        sy += 30;

        const rowH = 100;
        const thumbW = 50;
        const thumbH = 75;

        for (let i = 0; i < 5; i++) {
            const film = GameState.currentRun.filmography?.[i];
            const isCompleted = i < GameState.currentRun.currentFilmIndex;
            const rowY = sy + i * (rowH + 10);
            
            sidebar.add(this.add.rectangle(width / 2, rowY + rowH / 2, width - pad * 2, rowH, 0x1a1a1a).setStrokeStyle(1, 0x333333));
            
            if (film) {
                const posterKey = `poster_${film.id}`;
                if (this.textures.exists(posterKey)) {
                    sidebar.add(this.add.image(pad + 35, rowY + rowH / 2, posterKey).setDisplaySize(thumbW, thumbH));
                }

                const titleText = film.title.toUpperCase();
                sidebar.add(this.add.text(pad + 75, rowY + 20, titleText, {
                    fontSize: '18px', fontFamily: '"VT323", monospace', color: isCompleted ? '#ffffff' : '#444444',
                    wordWrap: { width: width - pad * 2 - 100 }
                }));

                if (isCompleted) {
                    const savedFilm = GameState.currentRun.completedFilms.find(f => f.id === film.id);
                    const rating = savedFilm?.rating || 0;
                    sidebar.add(this.add.text(width - pad - 10, rowY + 20, `${rating.toFixed(1)}`, {
                        fontSize: '22px', fontFamily: '"VT323", monospace', color: '#ffcc00'
                    }).setOrigin(1, 0));
                }
            }
        }
        sy += 5 * (rowH + 10) + 40;

        // ── Career Bests ────────────────────────────────────────────────────────
        sidebar.add(this.add.text(width / 2, sy, 'CAREER BESTS', {
            fontSize: '18px', fontFamily: '"VT323", monospace', color: '#444444'
        }).setOrigin(0.5, 0));
        sy += 30;

        const bestStats = [
            { label: 'HIGHEST RATED', value: `${GameState.persistentStats.bestRating?.toFixed(1) || '0.0'}`, sub: GameState.persistentStats.bestRatingFilm || 'NONE' },
            { label: 'HIGHEST EARNER', value: GameState.formatMillions(GameState.persistentStats.bestGross || 0), sub: GameState.persistentStats.bestGrossFilm || 'NONE' }
        ];

        bestStats.forEach(stat => {
            sidebar.add(this.add.text(pad, sy, stat.label, { fontSize: '16px', fontFamily: '"VT323", monospace', color: '#666666' }));
            sidebar.add(this.add.text(width - pad, sy, stat.value, { fontSize: '18px', fontFamily: '"VT323", monospace', color: '#ffcc00', align: 'right' }).setOrigin(1, 0));
            sy += 20;
            sidebar.add(this.add.text(width - pad, sy, stat.sub.toUpperCase(), { fontSize: '14px', fontFamily: '"VT323", monospace', color: '#444444', align: 'right' }).setOrigin(1, 0));
            sy += 25;
        });
    }
}
