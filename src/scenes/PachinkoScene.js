import Phaser from 'phaser';
import { GameState } from '../GameState.js';
import { TMDB } from '../utils/TMDB.js';
import { ColorExtractor } from '../utils/ColorExtractor.js';
import { UI } from '../utils/UI.js';

export default class PachinkoScene extends Phaser.Scene {
    constructor() {
        super('PachinkoScene');
        this.resetSceneState();
    }

    resetSceneState() {
        this.activeBalls = [];
        this.pegEntries = [];
        this.bucketBodies = [];
        this.padBodies = [];
        this.padVisuals = [];
        this.multiplierLabels = [];
        this.leadCast = [];
        this.activeCast = [];
        this.castPortraits = [];
        this.currentScore = 0;
        this.padModeActive = false;
        this.levelTransitioning = false;
        this.isLevelActive = true;
        this.lastPlanningTintAlpha = 0;
        this.oscar = null;
        this.pirates = [];
        this.exposureDots = [];
        this.rotatingBouncers = [];
        this.ballEaters = [];
        this.pendingRoundWin = false;
    }

    init(data = {}) {
        this.resetSceneState();

        // If director was passed explicitly via scene.start, re-initialise the run
        if (data.director && !GameState.currentRun.directorId) {
            GameState.initRun(data.director, data.director.films);
        }

        this.directorModifiers = GameState.currentRun.modifiers || {};
        const run = GameState.currentRun;
        this.directorData = run.directorId
            ? {
                id: run.directorId,
                name: run.directorName,
                portraitFrame: run.directorPortraitFrame,
                portraitKey: run.directorPortraitKey || null,
                cinematicFact: run.cinematicFact,
                traitLines: run.traitLines
            }
            : TMDB.getHardcodedDirectors()[0];
        this.rawFilmData = GameState.getCurrentFilm();

        // Cast fetched non-blocking in create() — leadCast starts empty
        if (this.rawFilmData?.cast) {
            this.leadCast = this.rawFilmData.cast;
        }

        this.invalidRunData = !this.rawFilmData;
        this.currentPosterKey = GameState.currentRun.currentPosterKey || 'current_poster';
        const margin = 60;
        const GAME_WIDTH = this.scale.width;
        const safeWidth = GAME_WIDTH - (margin * 2);
        const safeHeight = this.scale.height - (margin * 2);

        this.sidebarWidth = Math.floor(safeWidth * 0.3);
        this.boardWidth = Math.floor(safeWidth * 0.7);
        this.boardHeight = safeHeight;
        this.margin = margin;
        this.explosionRadius = 100 * (this.directorModifiers.explosionRadiusMult || 1);
        this.dominantColor = 0x222222;
        this.configureLevelData();
        this.currentScore = Number(GameState.currentRun.score || 0);
    }

    preload() {
        this.load.crossOrigin = 'anonymous';
        this.load.on('loaderror', (fileObj) => {
            console.error(`Asset failed to load: ${fileObj?.src || fileObj?.url || fileObj?.key || 'unknown asset'}`);
        });

        if (this.levelData?.posterPath) {
            this.load.image(this.currentPosterKey, this.levelData.posterPath);
        }

        this.leadCast.forEach((actor, index) => {
            if (actor.profilePath) {
                this.load.image(`actor_profile_${index}`, actor.profilePath);
            }
        });

        this.load.svg('filmreel', '/assets/images/film.svg', { width: 30, height: 30 });
        this.load.svg('vhs', '/assets/images/vhs.svg', { width: 30, height: 30 });
        this.load.svg('dvd', '/assets/images/dvd.svg', { width: 30, height: 30 });
    }

    create() {
        const { width, height } = this.scale;
        console.log('Display Size:', this.scale.displaySize);
        this.bgScene = this.scene.get('BackgroundScene');
        this.bgScene?.setClickRipplesEnabled(false);

        if (this.invalidRunData) {
            this.add.rectangle(0, 0, width, height, 0x000000, 0.92).setOrigin(0, 0);
            this.add.text(width / 2, height / 2, 'TMDB DATA FAILED TO LOAD.\nRETURNING TO DRAFTING PHASE...', {
                fontSize: '44px',
                fontFamily: '"VT323", monospace',
                color: '#ffcc00',
                align: 'center'
            }).setOrigin(0.5);
            this.time.delayedCall(1200, () => this.scene.start('DirectorSelectScene'));
            return;
        }

        GameState.applyAudioSettings(this);

        // Non-blocking cast fetch — scene continues immediately, cast populates when ready
        if (this.rawFilmData && !this.rawFilmData.cast) {
            TMDB.getMovieCredits(this.rawFilmData.id)
                .then(cast => {
                    if (!this.sys.isActive()) return;
                    this.leadCast = cast;
                    this.updateUI();
                })
                .catch(() => {});
        }

        if (this.textures.exists(this.currentPosterKey)) {
            this.dominantColor = ColorExtractor.getAverageColor(this, this.currentPosterKey);
        }

        this.uiContainer = this.add.container(0, 0);
        this.boardContainer = this.add.container(this.margin, this.margin);
        
        // Global Borders
        const borders = this.add.graphics();
        borders.lineStyle(3, 0xff8800, 1);
        borders.strokeRect(this.margin, this.margin, this.boardWidth + this.sidebarWidth, this.boardHeight);
        borders.lineStyle(2, 0xff8800, 0.5);
        borders.lineBetween(this.margin + this.boardWidth, this.margin, this.margin + this.boardWidth, this.margin + this.boardHeight);
        this.uiContainer.add(borders);

        this.uiContainer.add(this.boardContainer);

        this.ensureOscarTexture();
        this.setupPhysicsBoundaries();
        this.createOrganicLayout();
        this.createBuckets();
        this.createSafetySystems();
        this.setupFunnel();
        this.setupUI();
        this.setupCollisions();
        this.setupInput();
        this.createOscar();

        // Apply Global Trait Modifiers
        if (this.directorModifiers.gravityMult) {
            this.matter.world.setGravity(0, 1 * this.directorModifiers.gravityMult);
        }
        if (this.directorModifiers.timeScale) {
            this.matter.world.localTimeScale = this.directorModifiers.timeScale;
        }

        UI.bouncyDropIn(this, this.uiContainer, -height, 0, 1500);

        this.events.once('shutdown', () => {
            this.bgScene?.setClickRipplesEnabled(true);
        });
    }

    ensureOscarTexture() {
        if (this.textures.exists('oscar_trophy')) {
            return;
        }

        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0xf5c518, 1);
        graphics.fillCircle(32, 18, 14);
        graphics.fillRect(24, 28, 16, 20);
        graphics.fillRect(20, 48, 24, 8);
        graphics.fillRect(18, 56, 28, 6);
        graphics.generateTexture('oscar_trophy', 64, 64);
        graphics.destroy();
    }

    setupPhysicsBoundaries() {
        const wallOptions = { isStatic: true, restitution: 0.8, friction: 0, label: 'wall' };
        const bezel = 60;
        this.matter.add.rectangle(this.boardWidth / 2, bezel - 10, this.boardWidth, 20, wallOptions);
        this.matter.add.rectangle(bezel - 10, this.boardHeight / 2, 20, this.boardHeight, wallOptions);
        this.matter.add.rectangle(this.boardWidth + 10, this.boardHeight / 2, 20, this.boardHeight, wallOptions);
        
        // Ensure Matter.js world bounds are strictly clamped to the visible board area
        this.matter.world.setBounds(bezel, bezel, this.boardWidth - bezel, this.boardHeight - bezel);
    }

    createOrganicLayout() {
        const rows = 9;
        const spacingX = this.boardWidth / 10;
        const spacingY = 90;
        const startY = 180;

        for (let row = 0; row < rows; row++) {
            const isEven = row % 2 === 0;
            const cols = isEven ? 9 : 10;
            const offsetX = isEven ? spacingX : spacingX / 2;

            for (let col = 0; col < cols; col++) {
                const x = offsetX + (col * spacingX) + Phaser.Math.Between(-18, 18);
                const y = startY + (row * spacingY) + Phaser.Math.Between(-12, 12);

                if (x > this.boardWidth - 40 || x < 40) {
                    continue;
                }

                let size = 9 * (this.directorModifiers.monsterPegs ? 2 : 1); // Scaled by 0.9
                let multiplier = 1;
                let baseColor = 0xffffff;

                const hasNoMultiplier = this.directorModifiers.noMultiplier;

                const centerDist = Math.abs(x - (this.boardWidth / 2));
                if (centerDist < 50) {
                    size = 18;
                    multiplier = 5;
                    baseColor = 0xffcc00;
                } else if (row === rows - 1) {
                    size = 14;
                    multiplier = 2;
                    baseColor = 0x88ccff;
                }

                const isRotatingBouncer = (row + col) % 7 === 0;
                const pegVisual = isRotatingBouncer
                    ? this.add.rectangle(x, y, size * 2.3, size * 0.95, baseColor).setStrokeStyle(3, 0x000000).setAngle(35).setDepth(5)
                    : this.add.circle(x, y, size, baseColor).setStrokeStyle(3, 0x000000).setDepth(5);
                this.boardContainer.add(pegVisual);

                const pegBody = isRotatingBouncer
                    ? this.matter.add.rectangle(x, y, size * 2.3, size * 0.95, {
                        isStatic: true,
                        angle: Phaser.Math.DegToRad(35),
                        restitution: this.pegRestitution + 0.08,
                        friction: this.pegFriction,
                        label: 'peg'
                    })
                    : this.matter.add.circle(x, y, size, {
                        isStatic: true,
                        restitution: this.pegRestitution,
                        friction: this.pegFriction,
                        label: 'peg'
                    });
                pegBody.visual = pegVisual;
                pegBody.multiplier = multiplier;
                pegBody.isRotatingBouncer = isRotatingBouncer;
                pegBody.rotationSpeed = Phaser.Math.FloatBetween(0.01, 0.018) * (Math.random() > 0.5 ? 1 : -1);

                if (isRotatingBouncer) {
                    this.rotatingBouncers.push(pegBody);
                }

                let multiplierLabel = null;
                if (multiplier > 1 && !hasNoMultiplier) {
                    multiplierLabel = this.add.text(x, y, `x${multiplier}`, {
                        fontSize: size >= 20 ? '18px' : '14px',
                        fontFamily: '"VT323", monospace',
                        color: '#2b1400',
                        stroke: '#fff5cf',
                        strokeThickness: 3
                    }).setOrigin(0.5).setDepth(6);
                    this.boardContainer.add(multiplierLabel);
                    this.multiplierLabels.push(multiplierLabel);
                }

                this.pegEntries.push({ body: pegBody, visual: pegVisual, label: multiplierLabel });
            }
        }
    }

    setupFunnel() {
        this.funnel = this.add.triangle(this.boardWidth / 2, 80, 0, 0, 60, 0, 30, 40, 0xff0000).setOrigin(0.5);
        this.boardContainer.add(this.funnel);

        if (this.directorModifiers.funnelSpeedStatic) {
            return;
        }

        this.tweens.add({
            targets: this.funnel,
            x: { from: 100, to: this.boardWidth - 100 },
            duration: 1500 / (this.directorModifiers.funnelSpeedMult || 1),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    createBuckets() {
        const numBuckets = 5;
        const margin = 20;
        const usableWidth = this.boardWidth - (margin * 2);
        const spacing = usableWidth / numBuckets;
        const bucketWidth = Math.min(spacing * (this.directorModifiers.bucketWidthMult || 1), usableWidth - (spacing * (numBuckets - 1)));
        const bucketHeight = 120;
        const bucketY = this.boardHeight - (bucketHeight / 2);
        const bucketScores = [100, 250, 500, 250, 100];
        const bucketColors = [0x4a4a4a, 0x6a6a6a, 0x8a8a8a, 0x6a6a6a, 0x4a4a4a];
        const startX = margin + ((usableWidth - ((spacing * (numBuckets - 1)) + bucketWidth)) / 2) + (bucketWidth / 2);

        for (let i = 0; i < numBuckets; i++) {
            const x = startX + (i * spacing);

            const isMystery = this.directorModifiers.mysteryBuckets;
            const bucketBg = this.add.rectangle(x, bucketY, bucketWidth - 4, bucketHeight, isMystery ? 0x222222 : bucketColors[i])
                .setAlpha(0.8)
                .setStrokeStyle(4, 0xffffff);
            const bucketTxt = this.add.text(x, bucketY, isMystery ? '???' : `${bucketScores[i]}`, {
                fontSize: '36px',
                fontFamily: '"VT323", monospace',
                color: isMystery ? '#aaaaaa' : '#fff'
            }).setOrigin(0.5);
            
            if (isMystery) {
                bucketBg.setData('realScore', bucketScores[i]);
                bucketBg.setData('realColor', bucketColors[i]);
            }
            this.boardContainer.add([bucketBg, bucketTxt]);

            const bucketBody = this.matter.add.rectangle(x, bucketY, bucketWidth - 10, bucketHeight, {
                isStatic: true,
                isSensor: true,
                label: `bucket_${bucketScores[i]}`
            });
            this.bucketBodies.push(bucketBody);

            if (i < numBuckets - 1) {
                const dividerX = x + (spacing / 2);
                const dividerBody = this.matter.add.rectangle(dividerX, bucketY - 50, 10, 100, {
                    isStatic: true,
                    restitution: 0.5,
                    friction: 0,
                    label: 'divider'
                });
                const dividerVisual = this.add.rectangle(dividerX, bucketY - 50, 10, 100, 0xffffff);
                dividerBody.visual = dividerVisual;
                this.boardContainer.add(dividerVisual);
            }
        }
    }

    createSafetySystems() {
        const eaterY = this.boardHeight - 210;
        [this.boardWidth * 0.28, this.boardWidth * 0.72].forEach((x) => {
            const visual = this.add.circle(x, eaterY, 34, 0x771111).setStrokeStyle(4, 0xff4444).setDepth(12);
            const xMark = this.add.text(x, eaterY, 'X', {
                fontSize: '44px',
                fontFamily: '"VT323", monospace',
                color: '#ffd7d7'
            }).setOrigin(0.5).setDepth(13);
            this.boardContainer.add([visual, xMark]);
            const body = this.matter.add.circle(x, eaterY, 34, {
                isStatic: true,
                isSensor: true,
                label: 'ball_eater'
            });
            body.visual = visual;
            body.labelText = xMark;
            this.ballEaters.push(body);
        });

        const gutterHeight = 36;
        const gutterY = this.boardHeight - 18;
        const gutterVisual = this.add.rectangle(this.boardWidth / 2, gutterY, this.boardWidth - 100, gutterHeight, 0x3b2a18, 0.95)
            .setStrokeStyle(3, 0xffaa00)
            .setDepth(4);
        const gutterText = this.add.text(this.boardWidth / 2, gutterY, 'SAFETY GUTTER', {
            fontSize: '20px',
            fontFamily: '"VT323", monospace',
            color: '#ffdd99'
        }).setOrigin(0.5).setDepth(5);
        this.boardContainer.add([gutterVisual, gutterText]);
        this.safetyGutterBody = this.matter.add.rectangle(this.boardWidth / 2, gutterY, this.boardWidth - 100, gutterHeight, {
            isStatic: true,
            isSensor: true,
            label: 'gutter'
        });
    }

    setupUI() {
        const sidebarWidth = this.sidebarWidth;
        const innerWidth = sidebarWidth - 36;
        const padding = 18;

        this.planningOverlay = this.add.rectangle(
            this.boardWidth / 2,
            this.boardHeight / 2,
            this.boardWidth,
            this.boardHeight,
            0xffc857,
            0
        ).setDepth(200).setBlendMode(Phaser.BlendModes.SCREEN);
        this.boardContainer.add(this.planningOverlay);

        this.sidebar = this.add.container(this.margin + this.boardWidth, this.margin).setDepth(100);

        const sideBg = this.add.rectangle(sidebarWidth / 2, this.scale.height / 2, sidebarWidth, this.scale.height, 0x1a1a1a, 1)
            .setStrokeStyle(6, 0xff9f1c);
        this.sidebar.add(sideBg);

        let currentY = 24;

        this.createSidebarAudioControls();

        this.posterFrame = this.add.rectangle(sidebarWidth / 2, currentY + 150, innerWidth, 280, 0x111111, 1)
            .setStrokeStyle(4, 0xffaa00);
        this.sidebar.add(this.posterFrame);

        if (this.textures.exists(this.currentPosterKey)) {
            this.posterImage = this.add.image(sidebarWidth / 2, currentY + 150, this.currentPosterKey).setOrigin(0.5);
            const posterScale = Math.min((innerWidth - 20) / this.posterImage.width, 260 / this.posterImage.height);
            this.posterImage.setScale(posterScale);
            this.posterImage.setTint(0xf8e7b9);
            this.posterImage.setAlpha(0.96);
            this.sidebar.add(this.posterImage);
        } else {
            const posterFallback = this.add.rectangle(sidebarWidth / 2, currentY + 150, innerWidth - 20, 250, 0x6f6f6f, 1)
                .setStrokeStyle(2, 0xbdbdbd);
            const posterFallbackText = this.add.text(sidebarWidth / 2, currentY + 150, 'POSTER\nUNAVAILABLE', {
                fontSize: '30px',
                fontFamily: '"VT323", monospace',
                color: '#f0f0f0',
                align: 'center'
            }).setOrigin(0.5);
            this.sidebar.add([posterFallback, posterFallbackText]);
        }
        currentY += 312;

        // Director Name
        this.directorNameText = this.add.text(sidebarWidth / 2, currentY, this.directorData.name.toUpperCase(), {
            fontSize: '28px',
            fontFamily: '"VT323", monospace',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5, 0);
        this.sidebar.add(this.directorNameText);
        currentY += this.directorNameText.height + 10;

        // Trait Box
        const traitBox = this.add.rectangle(sidebarWidth / 2, currentY + 24, innerWidth, 52, 0x333333, 1)
            .setStrokeStyle(2, 0xffaa00, 0.8);
        this.sidebar.add(traitBox);
        const traitTextStr = this.directorData.traitLines?.[0] || 'STANDARD PRODUCTION';
        this.traitText = this.add.text(sidebarWidth / 2, currentY + 24, traitTextStr, {
            fontSize: '22px',
            fontFamily: '"VT323", monospace',
            color: '#ffaa00',
            align: 'center',
            wordWrap: { width: innerWidth - 16 }
        }).setOrigin(0.5);
        this.sidebar.add(this.traitText);
        currentY += 62;

        // Budget / Score HUD
        const statsBox = this.add.rectangle(sidebarWidth / 2 - 28, currentY + 54, innerWidth - 70, 118, 0x121212, 0.96)
            .setStrokeStyle(3, 0xffaa00, 0.9)
            .setOrigin(0.5);
        this.ratingHUD = this.add.text(padding, currentY, 'PRODUCTION GOAL: 0%', {
            fontSize: '24px',
            fontFamily: '"VT323", monospace',
            color: '#f5c518'
        }).setOrigin(0, 0);
        this.scoreLabel = this.add.text(padding, currentY + 34, 'BUDGET: $0.0M', {
            fontSize: '24px',
            fontFamily: '"VT323", monospace',
            color: '#8cff98'
        }).setOrigin(0, 0);
        this.ballLabel = this.add.text(padding, currentY + 68, 'FILM STOCK: 10', {
            fontSize: '24px',
            fontFamily: '"VT323", monospace',
            color: '#ffd2d2'
        }).setOrigin(0, 0);
        this.progressFrame = this.add.rectangle(sidebarWidth - 34, currentY + 54, 20, 118, 0x060606, 1)
            .setStrokeStyle(3, 0xffaa00);
        this.progressFill = this.add.rectangle(sidebarWidth - 34, currentY + 109, 10, 0, 0x66f2ff, 1).setOrigin(0.5, 1);
        this.sidebar.add([statsBox, this.ratingHUD, this.scoreLabel, this.ballLabel, this.progressFrame, this.progressFill]);
        currentY += 110;

        this.padModeButton = UI.createChunkyButton(this, sidebarWidth / 2, currentY + 30, sidebarWidth - 36, 58, 'PLACE PADS', () => {
            this.togglePadMode();
        });
        this.sidebar.add(this.padModeButton);
        currentY += 80;

        this.lockStatusText = this.add.text(sidebarWidth / 2, currentY, '', {
            fontSize: '20px',
            fontFamily: '"VT323", monospace',
            color: '#ffef9a',
            align: 'center',
            wordWrap: { width: innerWidth - 10 }
        }).setOrigin(0.5, 0);
        this.sidebar.add(this.lockStatusText);
        currentY += 58;

        const bioStr = UI.getSafeSnippet(this.directorData.cinematicFact || '', 120);
        this.bioText = this.add.text(padding, currentY, bioStr, {
            fontSize: '18px',
            fontFamily: '"VT323", monospace',
            color: '#aaaaaa',
            wordWrap: { width: innerWidth },
            lineSpacing: 4
        }).setOrigin(0, 0);
        this.sidebar.add(this.bioText);

        this.castListText = this.add.text(padding, this.scale.height - 430, 'CAST: WAIT FOR IT...', {
            fontSize: '18px',
            fontFamily: '"VT323", monospace',
            color: '#dddddd',
            wordWrap: { width: innerWidth }
        }).setOrigin(0, 0);
        this.sidebar.add(this.castListText);

        this.castRowY = this.scale.height - 340;
        const directorPortraitCard = this.createPortraitCard({
            x: sidebarWidth / 2,
            y: this.scale.height - 150,
            texture: this.textures.exists('director_portraits') ? 'director_portraits' : null,
            frame: this.directorData.portraitFrame ?? 0,
            width: 110,
            height: 110,
            footerLabel: 'DIRECTOR',
            fallbackText: this.directorData.name.split(' ').map((part) => part[0]).join('')
        });
        this.sidebar.add(directorPortraitCard.container);
        this.directorAvatar = directorPortraitCard.container;
        this.popPortrait(directorPortraitCard.container, directorPortraitCard.sprite, 'sfx_win1');
        this.updateUI();
    }

    createPortraitCard({ x, y, texture, frame = undefined, width = 150, height = 210, footerLabel = '', fallbackText = null }) {
        const container = this.add.container(x, y);
        const outer = this.add.rectangle(0, 0, width + 26, height + 66, 0xf7f0e2).setStrokeStyle(5, 0x111111);
        const matte = this.add.rectangle(0, -12, width, height, 0x111111).setStrokeStyle(2, 0xffaa00);
        let sprite;
        let fallbackLabel = null;

        if (texture && this.textures.exists(texture) && (frame === undefined || this.textures.get(texture).has(frame))) {
            sprite = this.add.sprite(0, -12, texture, frame);
            sprite.setDisplaySize(width - 8, height - 8);
            if (typeof sprite.setInterpolation === 'function') {
                sprite.setInterpolation('pixelated');
            }
            sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        } else {
            sprite = this.add.image(0, -12, 'placeholder_box');
            sprite.setDisplaySize(width - 8, height - 8);
            sprite.setTint(0x8a8a8a);
            if (fallbackText) {
                fallbackLabel = this.add.text(0, -12, fallbackText, {
                    fontSize: `${Math.max(18, Math.floor(width * 0.22))}px`,
                    fontFamily: '"VT323", monospace',
                    color: '#f5f5f5',
                    align: 'center'
                }).setOrigin(0.5);
            }
        }

        sprite.setAlpha(0);
        sprite.setScale(0.5);

        const viewfinder = this.add.graphics();
        viewfinder.lineStyle(3, 0xffeab5, 0.95);
        viewfinder.strokeRect(-(width / 2), -12 - (height / 2), width, height);

        const label = this.add.text(0, height / 2 + 24, footerLabel, {
            fontSize: '18px',
            fontFamily: '"VT323", monospace',
            color: '#221100',
            letterSpacing: 2
        }).setOrigin(0.5);

        container.add([outer, matte, sprite, viewfinder, label]);
        if (fallbackLabel) {
            container.add(fallbackLabel);
        }
        return { container, sprite };
    }

    popPortrait(container, sprite, soundKey = 'sfx_win1') {
        container.setAlpha(1);
        sprite.setAlpha(0);
        sprite.setScale(0.5);

        if (!this.sound.mute && this.cache.audio.exists(soundKey)) {
            this.sound.play(soundKey, { volume: 0.75 * (GameState.getAudioSettings(this).sfxVolume ?? 1) });
        }

        this.tweens.add({
            targets: sprite,
            alpha: 1,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 320,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: sprite,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 90,
                    ease: 'Sine.easeOut'
                });
            }
        });
    }

    updateUI() {
        if (!this.scoreLabel || !this.ballLabel || !this.ratingHUD) {
            return;
        }

        const safeBallsRemaining = Number.isFinite(this.ballsRemaining) ? this.ballsRemaining : 0;
        const safeTarget = Math.max(1, this.levelData?.targetScore || 1);

        this.scoreLabel.setText(`BUDGET: ${GameState.formatMillions(this.currentScore)}`);
        this.ballLabel.setText(`FILM STOCK: ${safeBallsRemaining}`);

        const percentage = Math.min(100, Math.floor((this.currentScore / safeTarget) * 100));
        this.ratingHUD.setText(`PRODUCTION GOAL: ${percentage}%`);
        if (this.progressFill) {
            const maxHeight = 106;
            const fillHeight = Math.max(2, maxHeight * (percentage / 100));
            this.progressFill.height = fillHeight;
        }

        [0.25, 0.5, 0.75].forEach((threshold, index) => {
            if ((this.currentScore / safeTarget) >= threshold && !this.activeCast.includes(index)) {
                this.hireActor(index);
            }
        });

        if (this.padModeButton?.list?.[1]) {
            this.padModeButton.list[1].setText(this.padModeActive ? 'EDIT SET: ON' : 'PLACE PADS');
        }

        if (this.activeBalls.length > 0) {
            this.lockStatusText?.setText(`LIVE TAKE\n${this.activeBalls.length} reel(s) in motion`);
            this.lockStatusText?.setColor('#ffcf66');
        } else if (this.padModeActive) {
            this.lockStatusText?.setText('PLANNING PHASE\nTap the set to place a pad');
            this.lockStatusText?.setColor('#00ff99');
        } else {
            this.lockStatusText?.setText('LIVE TAKE\nTap the funnel lane to drop');
            this.lockStatusText?.setColor('#ffef9a');
        }

        const targetAlpha = this.padModeActive && this.activeBalls.length === 0 ? 0.18 : 0;
        if (this.planningOverlay && targetAlpha !== this.lastPlanningTintAlpha) {
            this.lastPlanningTintAlpha = targetAlpha;
            this.tweens.add({
                targets: this.planningOverlay,
                alpha: targetAlpha,
                duration: 180,
                ease: 'Sine.easeOut'
            });
        }
    }

    hireActor(index) {
        if (this.activeCast.includes(index) || !this.leadCast[index]) {
            return;
        }

        this.activeCast.push(index);
        this.ballsRemaining += 1;
        this.updateUI();

        if (!this.sound.mute && this.cache.audio.exists('sfx_win2')) {
            this.sound.play('sfx_win2', { volume: 0.6 * (GameState.getAudioSettings(this).sfxVolume ?? 1) });
        }

        const actor = this.leadCast[index];
        const portrait = this.createPortraitCard({
            x: 58 + (index * 96),
            y: this.castRowY,
            texture: this.textures.exists(`actor_profile_${index}`) ? `actor_profile_${index}` : null,
            width: 60,
            height: 80,
            footerLabel: actor.name.split(' ')[0].toUpperCase(),
            fallbackText: actor.name.split(' ').map((part) => part[0]).join('')
        });

        this.sidebar.add(portrait.container);
        this.castPortraits.push(portrait.container);
        this.popPortrait(portrait.container, portrait.sprite, 'sfx_win2');
        this.addBark(`${actor.name.split(' ')[0]} joined!`, portrait.container);
        this.updateCastList();
    }

    updateCastList() {
        if (!this.castListText) {
            return;
        }

        const names = this.activeCast.map((index) => this.leadCast[index].name);
        this.castListText.setText(`CAST: ${names.join(', ') || 'Wait for it...'}`);
    }

    createSidebarAudioControls() {
        this.settingsOverlay = UI.createSettingsOverlay(this, {
            showAbandon: true,
            onAbandon: () => this.handleAbandonProduction(),
            onClose: () => this.matter.world.resume()
        });

        this.settingsBtn = UI.createSettingsButton(this, this.sidebarWidth - 70, 58, () => {
            const settings = GameState.getAudioSettings(this);
            if (!this.sound.mute && this.cache.audio.exists('sfx_gear')) {
                this.sound.play('sfx_gear', { volume: 0.8 * (settings.sfxVolume ?? 1) });
            }
            this.matter.world.pause();
            this.settingsOverlay.openModal();
        });
        this.sidebar.add(this.settingsBtn);
        this.settingsBtn.setDepth(2000);
    }

    setupInput() {
        this.input.on('pointerdown', (pointer) => {
            if (!this.isLevelActive || this.levelTransitioning || pointer.x > this.boardWidth) {
                return;
            }

            if (this.padModeActive) {
                this.placePad(pointer.x, pointer.y);
                return;
            }

            this.dropBall(pointer.x);
        });
    }

    dropBall(pointerX) {
        if (this.ballsRemaining <= 0) {
            return;
        }

        const spawnX = Phaser.Math.Clamp(pointerX, 80, this.boardWidth - 80);
        const spawnY = 110;
        const isOscarBall = Math.random() < 0.1;
        const visualKey = isOscarBall ? 'filmreel' : Phaser.Utils.Array.GetRandom(['filmreel', 'vhs', 'dvd']);
        const visual = this.add.image(spawnX, spawnY, visualKey).setDisplaySize(44, 44).setDepth(15);
        if (visualKey === 'filmreel') {
            visual.setTint(isOscarBall ? 0xf5c518 : 0xffffff);
        }
        this.boardContainer.add(visual);

        const ball = this.matter.add.circle(spawnX, spawnY, 20, {
            restitution: 0.82,
            friction: 0.002,
            frictionAir: 0.003,
            label: 'ball'
        });
        ball.visual = visual;
        ball.scoreMultiplier = 1;
        ball.lastMovingTime = this.time.now;
        ball.lastExplosionTime = 0;
        ball.isOscarBall = isOscarBall;
        ball.ballType = visualKey === 'filmreel' ? 'reel' : visualKey;

        this.activeBalls.push(ball);
        this.ballsRemaining -= 1;
        GameState.currentRun.ballStats[ball.ballType] = (GameState.currentRun.ballStats[ball.ballType] || 0) + 1;
        GameState.currentRun.reelDrops += 1;
        this.updateUI();

        if (isOscarBall && !this.sound.mute && this.cache.audio.exists('sfx_oscar')) {
            this.sound.play('sfx_oscar', { volume: 0.6 * (GameState.getAudioSettings(this).sfxVolume ?? 1) });
        }

        // High Speed Trait
        if (this.directorModifiers.ballSpeedMult) {
            this.matter.body.setVelocity(ball, { 
                x: ball.velocity.x * this.directorModifiers.ballSpeedMult, 
                y: ball.velocity.y * this.directorModifiers.ballSpeedMult 
            });
        }
    }

    placePad(x, y) {
        if (this.activeBalls.length > 0 || (GameState.currentRun.inventory.bouncePads || 0) <= 0) {
            return;
        }

        const padX = Phaser.Math.Clamp(x, 60, this.boardWidth - 60);
        const padY = Phaser.Math.Clamp(y, 220, this.boardHeight - 220);
        const padAngle = Phaser.Math.DegToRad(Phaser.Math.Between(-18, 18));
        const padVisual = this.add.rectangle(padX, padY, 120, 20, 0x00e5ff).setStrokeStyle(3, 0xffffff).setDepth(18);
        padVisual.rotation = padAngle;
        this.boardContainer.add(padVisual);

        const padBody = this.matter.add.rectangle(padX, padY, 120, 20, {
            isStatic: true,
            angle: padAngle,
            restitution: 1.2,
            friction: 0,
            label: 'pad'
        });
        padBody.visual = padVisual;

        this.padBodies.push(padBody);
        this.padVisuals.push(padVisual);
        GameState.currentRun.inventory.bouncePads -= 1;
        this.padModeActive = false;
        this.addBark('Pad placed!');
        this.updateUI();
    }

    setupCollisions() {
        this.matter.world.on('collisionstart', (event) => {
            event.pairs.forEach((pair) => {
                const labelA = pair.bodyA.label;
                const labelB = pair.bodyB.label;

                if (labelA !== 'ball' && labelB !== 'ball') {
                    return;
                }

                const ball = labelA === 'ball' ? pair.bodyA : pair.bodyB;
                const other = labelA === 'ball' ? pair.bodyB : pair.bodyA;

                if (other.label === 'peg') {
                    this.handlePegCollision(ball, other);
                } else if (other.label.startsWith('bucket_')) {
                    this.checkBallBucketCollision(ball, other);
                } else if (other.label === 'oscar') {
                    this.checkOscarCollision();
                } else if (other.label === 'ball_eater') {
                    this.handleBallEaterCollision(ball, other);
                } else if (other.label === 'gutter') {
                    this.handleGutterCollision(ball);
                }
            });
        });
    }

    handlePegCollision(ball, peg) {
        ball.scoreMultiplier *= (peg.multiplier || 1);
        this.currentScore += 10;
        GameState.currentRun.score = this.currentScore;
        this.spawnExposureDot(ball.position.x, ball.position.y);

        if (peg.visual) {
            this.tweens.add({
                targets: peg.visual,
                scaleX: 1.5,
                scaleY: 1.5,
                duration: 100,
                yoyo: true
            });
        }

        if (peg.isRotatingBouncer) {
            peg.rotationSpeed *= -1;
        }

        // Trigger scanline reactive jitter
        this.game.events.emit('game-impact', 0.5);

        if (!this.sound.mute && this.cache.audio.exists('tick')) {
            this.sound.play('tick', {
                volume: 0.1 * (GameState.getAudioSettings(this).sfxVolume ?? 1),
                rate: Phaser.Math.FloatBetween(0.8, 1.2)
            });
        }
        this.updateUI();
    }

    checkBallBucketCollision(ball, bucket) {
        const scoreStr = bucket.label.split('_')[1];
        const points = Number(scoreStr) * (ball.scoreMultiplier || 1) * (ball.isOscarBall ? 2.5 : 1);
        this.currentScore += points;
        GameState.currentRun.score = this.currentScore;
        this.updateUI();
        this.cameras.main.shake(100, 0.01);

        // Mystery Bucket Reveal
        if (this.directorModifiers.mysteryBuckets) {
            const visual = this.boardContainer.list.find(obj => obj.type === 'Rectangle' && obj.x === bucket.position.x);
            const text = this.boardContainer.list.find(obj => obj.type === 'Text' && obj.x === bucket.position.x);
            if (visual && text) {
                visual.setFillStyle(visual.getData('realColor'));
                text.setText(`${visual.getData('realScore')}`);
                text.setColor('#fff');
            }
        }
        
        // Trigger scanline reactive jitter for scoring
        this.game.events.emit('game-impact', 1.5);

        if (!this.sound.mute) {
            const winKey = Phaser.Utils.Array.GetRandom(['sfx_win1', 'sfx_win2', 'sfx_win3', 'sfx_win4']);
            if (this.cache.audio.exists(winKey)) {
                this.sound.play(winKey, { volume: 0.8 * (GameState.getAudioSettings(this).sfxVolume ?? 1) });
            }
        }

        if (points >= 500) {
            this.addBark('Brilliant shot!');
        }

        if (ball.isOscarBall) {
            this.addBark('Oscar bonus!');
            if (!this.sound.mute && this.cache.audio.exists('sfx_oscar')) {
                this.sound.play('sfx_oscar', { volume: 1.0 * (GameState.getAudioSettings(this).sfxVolume ?? 1) });
            }
        }

        this.removeBall(ball);
    }

    handleBallEaterCollision(ball, eater) {
        this.currentScore = Math.max(0, this.currentScore - 50);
        GameState.currentRun.score = this.currentScore;
        this.updateUI();
        this.addBark('Ball eater! -$50M', eater.visual);
        this.removeBall(ball);
    }

    handleGutterCollision(ball) {
        this.addBark('Saved by the gutter!');
        this.removeBall(ball);
    }

    createOscar() {
        const x = Phaser.Math.Between(100, this.boardWidth - 100);
        const y = Phaser.Math.Between(150, 450);
        const visual = this.add.image(x, y, 'oscar_trophy').setDisplaySize(64, 64).setDepth(20);
        this.boardContainer.add(visual);

        const body = this.matter.add.circle(x, y, 32, {
            isStatic: true,
            isSensor: true,
            label: 'oscar'
        });

        const stars = this.add.particles(0, 0, 'oscar_trophy', {
            speed: { min: 20, max: 50 },
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.5, end: 0 },
            lifespan: 800,
            frequency: 100,
            blendMode: 'ADD',
            follow: visual
        });
        this.boardContainer.add(stars);

        this.oscar = { visual, body, stars, startTime: this.time.now, startY: y };
    }

    checkOscarCollision() {
        if (!this.oscar) {
            return;
        }

        const isEnsemble = this.activeCast.length === 3;
        let bonus = 5000 + (this.currentScore * 0.1);
        bonus *= this.directorModifiers.oscarBonusMult || 1;
        if (isEnsemble) {
            bonus *= 2;
        }
        bonus = Math.round(bonus);

        this.currentScore += bonus;
        GameState.currentRun.score = this.currentScore;
        this.updateUI();
        
        // Trigger scanline reactive jitter for Oscar!
        this.game.events.emit('game-impact', 2.5);

        const bonusTxt = this.add.text(this.oscar.visual.x, this.oscar.visual.y, `+$${bonus}M! ${isEnsemble ? 'CAST BONUS!' : ''}`, {
            fontSize: '36px',
            fontFamily: '"VT323", monospace',
            color: '#f5c518',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5);
        this.boardContainer.add(bonusTxt);

        this.tweens.add({
            targets: bonusTxt,
            y: bonusTxt.y - 100,
            alpha: 0,
            duration: 1500,
            onComplete: () => bonusTxt.destroy()
        });

        this.cameras.main.flash(500, 255, 200, 0, 0.2);

        if (!this.sound.mute && this.cache.audio.exists('sfx_oscar')) {
            this.sound.play('sfx_oscar', { volume: 1.2 * (GameState.getAudioSettings(this).sfxVolume ?? 1) });
        }

        this.ensembleCheer();
        this.oscar.visual.destroy();
        this.oscar.stars.destroy();
        this.matter.world.remove(this.oscar.body);
        this.oscar = null;
    }

    ensembleCheer() {
        const targets = [...this.castPortraits];
        if (this.directorAvatar) {
            targets.push(this.directorAvatar);
        }

        targets.forEach((target) => {
            this.tweens.add({
                targets: target,
                y: target.y - 50,
                duration: 200,
                yoyo: true,
                ease: 'Power1'
            });
        });

        this.addBark(Phaser.Utils.Array.GetRandom(['GREAT TAKE!', "THAT'S A WRAP!", 'OSCAR-WORTHY!', 'BRILLIANT!', 'CUT! PERFECT!']));
    }

    handlePirateCollision(ball) {
        ball.scoreMultiplier = Math.max(1, Math.floor((ball.scoreMultiplier || 1) * 0.5));
        this.addBark('Pirates cut the take!');
    }

    togglePadMode() {
        this.padModeActive = !this.padModeActive;
        this.updateUI();
    }

    handleAbandonProduction() {
        if (!this.sound.mute && this.cache.audio.exists('sfx_abandon')) {
            this.sound.play('sfx_abandon', { volume: 0.9 * (GameState.getAudioSettings(this).sfxVolume ?? 1) });
        }
        this.scene.start('DirectorCutScene', GameState.createRunRecap({ abandoned: true }));
    }

    addBark(textStr, anchor = null) {
        const target = anchor || this.directorAvatar;
        if (!target) {
            return;
        }

        const bark = this.add.container(target.x, target.y - 100).setDepth(500);
        const bg = this.add.rectangle(0, 0, 200, 60, 0xffffff).setStrokeStyle(2, 0x000000);
        const txt = this.add.text(0, 0, textStr, {
            fontSize: '20px',
            color: '#000',
            fontFamily: '"VT323", monospace'
        }).setOrigin(0.5);
        bark.add([bg, txt]);
        this.sidebar.add(bark);

        this.tweens.add({
            targets: bark,
            y: bark.y - 20,
            alpha: 0,
            duration: 2000,
            onComplete: () => bark.destroy()
        });
    }

    removeBall(ball) {
        this.matter.world.remove(ball);
        ball.visual?.destroy();
        this.activeBalls = this.activeBalls.filter((candidate) => candidate !== ball);
        this.updateUI();
        this.checkRoundEnd();
    }

    triggerAntiStuck(ball) {
        ball.lastExplosionTime = this.time.now;

        if (!this.sound.mute && this.cache.audio.exists('sfx_explosion')) {
            this.sound.play('sfx_explosion', { volume: 0.9 * (GameState.getAudioSettings(this).sfxVolume ?? 1) });
        }

        this.cameras.main.shake(120, 0.008);
        this.destroyPegsNear(ball.position.x, ball.position.y, this.explosionRadius);
        this.addBark('Explosion assist!');
    }

    destroyPegsNear(x, y, radius) {
        this.pegEntries = this.pegEntries.filter((entry) => {
            const distance = Phaser.Math.Distance.Between(x, y, entry.body.position.x, entry.body.position.y);
            if (distance > radius) {
                return true;
            }

            entry.visual?.destroy();
            entry.label?.destroy();
            this.matter.world.remove(entry.body);
            return false;
        });
    }

    checkRoundEnd() {
        if (!this.isLevelActive || this.levelTransitioning) {
            return;
        }

        if (this.currentScore >= this.levelData.targetScore) {
            if (this.activeBalls.length === 0) {
                this.handleLevelWin();
            } else {
                this.pendingRoundWin = true;
            }
            return;
        }

        if (this.ballsRemaining <= 0 && this.activeBalls.length === 0) {
            this.isLevelActive = false;
            this.time.delayedCall(1500, () => this.scene.start('DirectorCutScene', GameState.createRunRecap({ win: false })));
        }
    }

    handleLevelWin() {
        this.isLevelActive = false;
        this.levelTransitioning = true;
        this.pendingRoundWin = false;
        GameState.currentRun.lastRoundScore = this.currentScore;
        GameState.currentRun.lastRating = Math.max(0, Math.round((this.currentScore / this.levelData.targetScore) * 10) / 10);

        // IMDb Ranking Connection
        const isDeepCut = GameState.currentRun.currentFilmIndex === 4;
        const projectedRating = (this.currentScore / this.levelData.targetScore) * 9.2;
        
        if (isDeepCut && projectedRating >= 9.0) {
            this.triggerMasterpieceAnimation();
        } else {
            this.time.delayedCall(1500, () => {
                const isFinalFilm = GameState.advanceFilm();
                if (isFinalFilm) {
                    this.scene.start('DirectorCutScene', GameState.createRunRecap({ win: true }));
                } else {
                    this.scene.start('ShopScene');
                }
            });
        }
    }

    triggerMasterpieceAnimation() {
        const { width, height } = this.scale;
        
        // Add a blackout flash
        this.cameras.main.flash(500, 255, 215, 0);
        
        const settings = GameState.getAudioSettings(this);
        if (!this.sound.mute && this.cache.audio.exists('sfx_oscar')) {
            this.sound.play('sfx_oscar', { volume: 1.0 * (settings.sfxVolume ?? 1) });
        }

        const trophy = this.add.image(width / 2, height / 2, 'oscar_trophy')
            .setScale(0)
            .setDepth(2000)
            .setTint(0xffd700);

        const masterText = this.add.text(width / 2, height / 2 + 160, 'MASTERPIECE UNLOCKED', {
            fontSize: '72px',
            fontFamily: '"VT323", monospace',
            color: '#ffd700',
            stroke: '#000',
            strokeThickness: 8
        }).setOrigin(0.5).setScale(0).setDepth(2000);

        this.tweens.add({
            targets: trophy,
            scale: 4,
            rotation: Math.PI * 2,
            duration: 1200,
            ease: 'Back.easeOut'
        });

        this.tweens.add({
            targets: masterText,
            scale: 1,
            delay: 600,
            duration: 1000,
            ease: 'Bounce.easeOut',
            onComplete: () => {
                this.time.delayedCall(2500, () => {
                    GameState.advanceFilm();
                    this.scene.start('DirectorCutScene', GameState.createRunRecap({ win: true }));
                });
            }
        });
    }

    update(time) {
        if (this.levelTransitioning) {
            return;
        }

        if (this.oscar?.visual) {
            const t = (time - this.oscar.startTime) / 1000;
            this.oscar.visual.y = this.oscar.startY + Math.sin(t * 2) * 50;
            this.matter.body.setPosition(this.oscar.body, { x: this.oscar.visual.x, y: this.oscar.visual.y });
        }

        this.rotatingBouncers.forEach((peg) => {
            if (!peg?.visual || !peg?.position) {
                return;
            }
            const nextAngle = (peg.angle || 0) + peg.rotationSpeed;
            this.matter.body.setAngle(peg, nextAngle);
            peg.visual.rotation = nextAngle;
        });

        this.activeBalls.slice().forEach((ball) => {
            if (ball.visual) {
                ball.visual.setPosition(ball.position.x, ball.position.y);
                ball.visual.rotation = ball.angle;
            }

            const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
            if (speed > 0.6) {
                ball.lastMovingTime = time;
            } else if (time - Math.max(ball.lastMovingTime || 0, ball.lastExplosionTime || 0) >= 2500) {
                this.triggerAntiStuck(ball);
            }

            if (ball.position.y > this.scale.height + 100) {
                this.removeBall(ball);
            }
        });

        this.exposureDots = this.exposureDots.filter((dot) => {
            if (dot.alpha <= 0.02) {
                dot.destroy();
                return false;
            }
            dot.setAlpha(dot.alpha * 0.985);
            return true;
        });

        if (this.pendingRoundWin && this.activeBalls.length === 0) {
            this.handleLevelWin();
        }
    }

    configureLevelData() {
        this.levelData = this.rawFilmData
            ? TMDB.getLevelDataFromFilm(this.rawFilmData)
            : { title: 'LOADING ERROR', targetScore: 2000, balls: 10, friction: 0.001, themeColor: 0x222222, releaseYear: 'N/A' };

        const levelIndex = GameState.currentRun.currentFilmIndex;
        this.levelData.targetScore = Math.round((2000 + (levelIndex * 900)) * (this.directorModifiers.targetScoreMult ?? 1));
        this.ballsRemaining = Math.max(
            1,
            this.levelData.balls + (this.directorModifiers.startingBalls || 0) - (GameState.draftingPenalty || 0)
        );
        this.pegRestitution = 0.8 + (this.directorModifiers.pegBounce || 0);
        this.pegFriction = (this.levelData.friction || 0.001) + (this.directorModifiers.pegFriction || 0);
    }

    spawnExposureDot(x, y) {
        const dot = this.add.circle(x, y, 4, 0xff8c1a, 0.9).setDepth(3);
        this.boardContainer.add(dot);
        this.exposureDots.push(dot);
    }
}
