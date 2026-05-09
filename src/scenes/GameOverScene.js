import Phaser from 'phaser';
import { GameState } from '../GameState.js';
import { UI } from '../utils/UI.js';

export default class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    init(data) {
        this.win = Boolean(data?.win);
        this.abandoned = Boolean(data?.abandoned);
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

        // ── Main Content Area ──────────────────────────────────────────────────
        const frameX = margin + boardWidth / 2;
        
        // Director Dialogue / Final Status
        const dialogueBoxY = margin + 200;
        const dialogueBoxW = 600;
        this.add.rectangle(frameX, dialogueBoxY, dialogueBoxW, 120, 0x003366, 0.95).setStrokeStyle(3, 0x66ccff);
        
        this.add.text(frameX, dialogueBoxY - 35, (run.directorName || 'DIRECTOR').toUpperCase(), {
            fontSize: '32px', fontFamily: '"VT323", monospace', color: '#ffcc00'
        }).setOrigin(0.5);

        const dialogue = this.abandoned 
            ? "We're walking away. The vision is lost." 
            : (this.win ? "Masterpiece. Every frame a painting." : "The studio cut it. My vision is compromised.");
        
        this.add.text(frameX, dialogueBoxY + 15, `"${dialogue}"`, {
            fontSize: '22px', fontFamily: '"VT323", monospace', color: '#ffffff', align: 'center',
            wordWrap: { width: dialogueBoxW - 40 }
        }).setOrigin(0.5);

        // Final Run Stats
        const statsY = margin + 400;
        this.add.text(frameX, statsY, '--- FINAL RUN PERFORMANCE ---', {
            fontSize: '32px', fontFamily: '"VT323", monospace', color: '#ffaa00'
        }).setOrigin(0.5);

        const ballStats = run.ballStats;
        const runStats = [
            { label: 'TOTAL FILMS BEATEN', value: `${run.currentFilmIndex} / ${run.filmography.length}` },
            { label: 'TOTAL REELS DROPPED', value: run.reelDrops },
            { label: 'VHS RECOVERY', value: ballStats.vhs },
            { label: 'DVD EXTRAS', value: ballStats.dvd },
            { label: 'FINAL CAREER BOX OFFICE', value: GameState.formatMillions(run.score) }
        ];

        let sy = statsY + 60;
        runStats.forEach(stat => {
            this.add.text(frameX - 250, sy, stat.label, { fontSize: '24px', fontFamily: '"VT323", monospace', color: '#aaaaaa' });
            this.add.text(frameX + 250, sy, stat.value, { fontSize: '24px', fontFamily: '"VT323", monospace', color: '#ffffff', align: 'right' }).setOrigin(1, 0);
            sy += 40;
        });

        // Main Menu Button
        UI.createChunkyButton(this, frameX, height - 160, 420, 90, 'BACK TO MAIN MENU', () => {
            this.cameras.main.fadeOut(800, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                GameState.resetCurrentRun();
                this.scene.start('MenuScene');
            });
        }, 'CAREER PROGRESS SAVED');

        // ── Sidebar: Production History ─────────────────────────────────────────
        const sidebar = this.add.container(margin + boardWidth, margin);
        this._buildSidebar(sidebar, sidebarWidth, safeHeight, pad);

        // Save to gallery
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

        const run = GameState.currentRun;
        const statRows = [
            { label: 'TOTAL FILMS', value: `${run.currentFilmIndex}/${run.filmography?.length || 5}` },
            { label: 'TOTAL REELS', value: run.reelDrops || 0 },
            { label: 'LIFETIME BOX', value: GameState.formatMillions(run.score) }
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
            const film = run.filmography?.[i];
            const isCompleted = i < run.currentFilmIndex;
            const rowY = sy + i * (rowH + 10);
            
            sidebar.add(this.add.rectangle(width / 2, rowY + rowH / 2, width - pad * 2, rowH, 0x1a1a1a).setStrokeStyle(1, 0x333333));
            
            if (film) {
                const posterKey = `poster_${film.id}`;
                if (isCompleted && this.textures.exists(posterKey)) {
                    sidebar.add(this.add.image(pad + 35, rowY + rowH / 2, posterKey).setDisplaySize(thumbW, thumbH));
                }

                const titleText = isCompleted ? film.title.toUpperCase() : 'LOCKED';
                sidebar.add(this.add.text(pad + 75, rowY + 20, titleText, {
                    fontSize: '18px', fontFamily: '"VT323", monospace', color: isCompleted ? '#ffffff' : '#444444',
                    wordWrap: { width: width - pad * 2 - 100 }
                }));

                if (isCompleted) {
                    const savedFilm = run.completedFilms.find(f => f.id === film.id);
                    const rating = savedFilm?.rating || 0;
                    sidebar.add(this.add.text(width - pad - 10, rowY + 20, `${rating.toFixed(1)}`, {
                        fontSize: '22px', fontFamily: '"VT323", monospace', color: '#ffcc00'
                    }).setOrigin(1, 0));
                }
            }
        }
    }
}
