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

        // ── Board area: section title ─────────────────────────────────────────────
        this.add.text(margin + boardWidth / 2, margin + 50, 'PRE-PRODUCTION UPGRADES', {
            fontSize: '42px',
            fontFamily: '"VT323", monospace',
            color: '#ffcc00',
            align: 'center'
        }).setOrigin(0.5, 0).setDepth(10);

        // ── Board area: upgrade cards ─────────────────────────────────────────────
        const cardWidth = Math.min(520, boardWidth - 120);
        const cardHeight = 140; // Tightened from 180
        const cardGap = 20;    // Tightened from 30
        const firstCardCenter = margin + 130 + cardHeight / 2;

        this.offeredUpgrades.forEach((upgrade, index) => {
            const cardY = firstCardCenter + index * (cardHeight + cardGap);
            const container = this.add.container(margin + boardWidth / 2, cardY);

            const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x222222).setStrokeStyle(4, 0x444444);
            const filmStrip = this.add.rectangle(0, -cardHeight / 2 + 18, cardWidth, 36, 0x000000);
            const title = this.add.text(-cardWidth / 2 + 28, -cardHeight / 2 + 52, upgrade.title, {
                fontSize: '28px', fontFamily: '"VT323", monospace', color: '#ffcc00', align: 'left',
                wordWrap: { width: cardWidth - 210 }
            }).setOrigin(0, 0.5);
            const desc = this.add.text(-cardWidth / 2 + 28, 8, upgrade.desc, {
                fontSize: '20px', fontFamily: '"VT323", monospace', color: '#cccccc', align: 'left',
                wordWrap: { width: cardWidth - 210 }
            }).setOrigin(0, 0.5);

            const costBtn = UI.createChunkyButton(this, cardWidth / 2 - 110, 0, 180, 60,
                GameState.formatMillions(upgrade.cost), () => this.purchaseUpgrade(upgrade, container));

            container.add([bg, filmStrip, title, desc, costBtn]);
            container.costBtn = costBtn;
            container.setDepth(10);
            container.setScale(0);

            this.tweens.add({
                targets: container,
                scaleX: 1, scaleY: 1,
                duration: 600,
                delay: index * 200,
                ease: 'Back.easeOut',
                onStart: () => {
                    if (!this.sound.mute && this.cache.audio.exists('sfx_click')) {
                        this.sound.play('sfx_click', { volume: 0.5 * (GameState.getAudioSettings(this).sfxVolume ?? 1) });
                    }
                }
            });
        });

        // ── "NEXT FILMING >" — anchored below last card ───────────────────────────
        const lastCardBottom = firstCardCenter + 2 * (cardHeight + cardGap) + cardHeight / 2;
        const nextBtnY = lastCardBottom + 60;

        const nextBtn = UI.createChunkyButton(this, margin + boardWidth / 2, nextBtnY, 300, 70, 'NEXT FILMING >', () => {
            if (this.scale.fullscreenSupported && !this.scale.isFullscreen) {
                this.scale.startFullscreen();
            }
            this.scene.start('PachinkoScene');
        }).setDepth(10);

        // ── Board area: Large Director Section ──────────────────────────────────
        const directorY = nextBtnY + 180;
        const directorBoxW = 600;
        const portraitW = 160;
        const portraitH = 210;

        // Director Frame (Larger)
        const frameX = margin + boardWidth / 2;
        const portraitCard = this.add.rectangle(frameX, directorY, portraitW + 30, portraitH + 40, 0x20150b, 1)
            .setStrokeStyle(4, 0xffd27a).setDepth(10);
        const portraitMatte = this.add.rectangle(frameX, directorY - 10, portraitW + 10, portraitH + 10, 0x111111, 1)
            .setStrokeStyle(2, 0xffaa00).setDepth(10);

        // Add Director Sprite
        if (this.textures.exists('director_portraits')) {
            const frameToken = this._resolveDirectorPortraitFrame(run);
            const portrait = this.add.sprite(frameX, directorY - 25, 'director_portraits');
            portrait.setTexture('director_portraits', frameToken);
            portrait.setDisplaySize(portraitW, portraitH + 20);
            portrait.setDepth(11);
        }

        // Blue Box beneath director
        const blueBoxY = directorY + 160;
        const blueBox = this.add.rectangle(frameX, blueBoxY, directorBoxW, 110, 0x003366, 0.9)
            .setStrokeStyle(3, 0x66ccff).setDepth(10);
        
        const directorName = this.add.text(frameX, blueBoxY - 35, (run.directorName || 'UNKNOWN').toUpperCase(), {
            fontSize: '28px', fontFamily: '"VT323", monospace', color: '#ffcc00', align: 'center'
        }).setOrigin(0.5).setDepth(11);

        const ratio = run.lastRating || 0;
        const dialogue = this._getDialogue(ratio, run.directorName);
        const traitLine = run.traitLines?.[0] || '';
        
        const infoText = this.add.text(frameX, blueBoxY + 10, `"${dialogue}"\n${traitLine}`, {
            fontSize: '20px', fontFamily: '"VT323", monospace', color: '#ffffff', align: 'center',
            wordWrap: { width: directorBoxW - 40 }
        }).setOrigin(0.5).setDepth(11);

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
                this.scene.start('DirectorCutScene', GameState.createRunRecap({ abandoned: true }));
            }
        });

        const settingsPosition = UI.getSettingsButtonPositionInContainer(this, margin + boardWidth, margin);
        const settingsBtn = UI.createSettingsButton(this, settingsPosition.x, settingsPosition.y, () => {
            if (!this.sound.mute && this.cache.audio.exists('sfx_gear')) {
                this.sound.play('sfx_gear', { volume: 0.8 * (GameState.getAudioSettings(this).sfxVolume ?? 1) });
            }
            settingsOverlay.openModal();
        });

        this._buildRunRecap(sidebar, run, nextFilm, nextPosterKey, sidebarWidth, innerSidebarW, pad);

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

    _buildRunRecap(sidebar, run, nextFilm, nextPosterKey, sidebarWidth, innerSidebarW, pad) {
        const ratio = run.lastRating || 0;
        const rating = this._getRatingInfo(ratio);
        const filmsCompleted = run.currentFilmIndex || 0;
        const totalFilms = run.filmography?.length || 5;
        const suggestion = this._getSuggestion(ratio, run.reelDrops || 0);
        const dialogue = this._getDialogue(ratio, run.directorName);

        // Sidebar background
        const { height } = this.scale;
        const safeHeight = height - 120;
        sidebar.add(this.add.rectangle(sidebarWidth / 2, safeHeight / 2, sidebarWidth, safeHeight, 0x0d0d0d, 1));

        let sy = 178;

        // ── Header ───────────────────────────────────────────────────────────────
        sidebar.add(this.add.text(sidebarWidth / 2, sy, 'PRODUCTION WRAP', {
            fontSize: '30px', fontFamily: '"VT323", monospace', color: '#ffaa00', align: 'center'
        }).setOrigin(0.5, 0));
        sy += 42;

        sidebar.add(this._divider(pad, sy, sidebarWidth - pad));
        sy += 14;

        // ── Rating Stamp ─────────────────────────────────────────────────────────
        const stampH = 84;
        const stampW = sidebarWidth - pad * 2;
        const stampG = this.add.graphics();
        stampG.fillStyle(rating.bg, 1);
        stampG.fillRect(pad, sy, stampW, stampH);
        stampG.lineStyle(3, rating.border, 1);
        stampG.strokeRect(pad, sy, stampW, stampH);
        stampG.lineStyle(1, rating.border, 0.3);
        stampG.strokeRect(pad + 4, sy + 4, stampW - 8, stampH - 8);
        sidebar.add(stampG);

        const ratingFs = rating.label.length > 11 ? '28px' : '38px';
        sidebar.add(this.add.text(sidebarWidth / 2, sy + stampH / 2, rating.label, {
            fontSize: ratingFs, fontFamily: '"VT323", monospace', color: rating.color, align: 'center'
        }).setOrigin(0.5));
        sy += stampH + 14;

        sidebar.add(this._divider(pad, sy, sidebarWidth - pad));
        sy += 14;

        // ── Stat Block ────────────────────────────────────────────────────────────
        const statRows = [
            { label: 'TARGET', value: GameState.formatMillions(run.lastTargetScore || 0), color: '#aaaaaa' },
            { label: 'GROSS', value: GameState.formatMillions(run.lastGrossRoundScore || run.lastRoundScore || 0), color: '#66f2ff' },
            { label: 'COSTS', value: GameState.formatMillions(run.lastProductionCost || 0), color: '#ff9c7a' },
            { label: 'NET', value: GameState.formatMillions(run.lastNetRoundScore || run.lastRoundScore || 0), color: ratio >= 1.0 ? '#66ff88' : '#ff7777' },
            { label: 'FILMS',  value: `${filmsCompleted}/${totalFilms}`, color: '#ffffff' }
        ];

        const statBoxH = statRows.length * 32 + 18;
        const statBoxG = this.add.graphics();
        statBoxG.fillStyle(0x0f0f0f, 1);
        statBoxG.fillRect(pad, sy, sidebarWidth - pad * 2, statBoxH);
        statBoxG.lineStyle(1, 0x333333, 1);
        statBoxG.strokeRect(pad, sy, sidebarWidth - pad * 2, statBoxH);
        sidebar.add(statBoxG);

        sy += 8;
        statRows.forEach(row => {
            sidebar.add(this.add.text(pad + 8, sy, row.label, {
                fontSize: '24px', fontFamily: '"VT323", monospace', color: '#666666'
            }).setOrigin(0, 0));
            sidebar.add(this.add.text(sidebarWidth - pad - 8, sy, row.value, {
                fontSize: '24px', fontFamily: '"VT323", monospace', color: row.color, align: 'right'
            }).setOrigin(1, 0));
            sy += 32;
        });
        sy += 20;

        // ── Suggestion ────────────────────────────────────────────────────────────
        if (suggestion) {
            sidebar.add(this._divider(pad, sy, sidebarWidth - pad));
            sy += 12;

            sidebar.add(this.add.text(sidebarWidth / 2, sy, 'DIRECTOR SUGGESTS', {
                fontSize: '20px', fontFamily: '"VT323", monospace', color: '#888888', align: 'center'
            }).setOrigin(0.5, 0));
            sy += 26;

            const sgG = this.add.graphics();
            sgG.fillStyle(0x181818, 1);
            sgG.fillRect(pad, sy, innerSidebarW, 66);
            sgG.lineStyle(1, 0x444444, 1);
            sgG.strokeRect(pad, sy, innerSidebarW, 66);
            sgG.lineStyle(3, rating.border, 0.6);
            sgG.lineBetween(pad, sy, pad, sy + 66);
            sidebar.add(sgG);

            sidebar.add(this.add.text(pad + 10, sy + 6, suggestion.title, {
                fontSize: '22px', fontFamily: '"VT323", monospace', color: rating.color
            }).setOrigin(0, 0));
            sidebar.add(this.add.text(pad + 10, sy + 27, suggestion.desc, {
                fontSize: '17px', fontFamily: '"VT323", monospace', color: '#777777',
                wordWrap: { width: innerSidebarW - 16 }
            }).setOrigin(0, 0));
            sy += 84;
        }

        // ── Next Feature ──────────────────────────────────────────────────────────
        if (nextFilm) {
            sidebar.add(this._divider(pad, sy, sidebarWidth - pad));
            sy += 16;

            sidebar.add(this.add.text(sidebarWidth / 2, sy, 'NEXT FEATURE', {
                fontSize: '22px', fontFamily: '"VT323", monospace', color: '#66f2ff', align: 'center'
            }).setOrigin(0.5, 0));
            sy += 38;

            const posterW = innerSidebarW - 8;
            const posterH = Math.min(324, Math.round(posterW * 1.5));
            const posterFrame = this.add.rectangle(sidebarWidth / 2, sy + posterH / 2, innerSidebarW, posterH, 0x0a0a0a)
                .setStrokeStyle(2, 0x445566);
            sidebar.add(posterFrame);

            if (nextPosterKey && this.textures.exists(nextPosterKey)) {
                const poster = this.add.image(sidebarWidth / 2, sy + posterH / 2, nextPosterKey);
                this._fitImageWithin(poster, posterW, posterH - 10);
                sidebar.add(poster);
            } else {
                sidebar.add(this.add.text(sidebarWidth / 2, sy + posterH / 2, 'COMING SOON', {
                    fontSize: '22px', fontFamily: '"VT323", monospace', color: '#333333', align: 'center'
                }).setOrigin(0.5));
            }
            sy += posterH + 14;

            sidebar.add(this.add.text(sidebarWidth / 2, sy, (nextFilm.title || '').toUpperCase(), {
                fontSize: '21px', fontFamily: '"VT323", monospace', color: '#cccccc', align: 'center',
                wordWrap: { width: innerSidebarW }
            }).setOrigin(0.5, 0));
            sy += 58;
        }
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
