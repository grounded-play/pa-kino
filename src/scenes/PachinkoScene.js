import Phaser from 'phaser';
import { GameState, MAX_RUN_BUDGET } from '../GameState.js';
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
        this.backgroundPlatformMirrors = new Map();
        this.levelReelsDropped = 0;
        this.nextBallId = 1;
        this.readyToWrap = false;
        this.funnelVelocityX = 0;
        this.funnelVelocityY = 0;
        this.lastFunnelX = null;
        this.lastFunnelY = null;
    }

    clampCurrentScore(nextScore = this.currentScore) {
        const maxScore = Math.max(0, MAX_RUN_BUDGET - this.runScoreBase);
        const safeScore = Math.max(0, Number(nextScore) || 0);
        this.currentScore = Math.min(safeScore, maxScore);
        this.syncRunEconomy();
        return this.currentScore;
    }

    getCurrentProductionCost(reelsDropped = this.levelReelsDropped) {
        const baseCost = this.levelData?.productionBaseCost || 0;
        const extraCost = this.levelData?.extraReelCost || 0;
        const expectedReels = this.levelData?.expectedReels || 1;
        const reelsOver = Math.max(0, reelsDropped - expectedReels);
        return baseCost + (reelsOver * extraCost);
    }

    getCurrentNetScore() {
        return Math.max(0, this.currentScore - this.getCurrentProductionCost());
    }

    syncRunEconomy() {
        const productionCost = this.getCurrentProductionCost();
        const netRoundScore = this.getCurrentNetScore();
        GameState.currentRun.productionCosts = productionCost;
        GameState.currentRun.score = Math.min(this.runScoreBase + netRoundScore, MAX_RUN_BUDGET);
        return netRoundScore;
    }

    getBallCurrentPotential(ball) {
        const maxBucket = this.maxBucketScore || 500;
        const multiplier = Math.max(1, Number(ball?.scoreMultiplier) || 1);
        const oscarMult = ball?.isOscarBall ? 2.5 : 1;
        return Math.max(0, Math.round((ball?.pendingValue || 0) + (maxBucket * multiplier * oscarMult)));
    }

    getReelLifetimeMs() {
        const levelIndex = GameState.currentRun.currentFilmIndex || 0;
        return Math.max(10000, 30000 - (levelIndex * 2500));
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
        this.currentPosterKey = this.rawFilmData?.id ? `poster_${this.rawFilmData.id}` : 'current_poster';
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
        // Carry-over budget is preserved in runScoreBase so GameState stays accurate,
        // but each level's win condition measures only what is earned THIS level.
        this.runScoreBase = Number(GameState.currentRun.score || 0);
        this.currentScore = 0;
        this.levelReelsDropped = 0;
    }

    preload() {
        this.load.crossOrigin = 'anonymous';
        this.load.on('loaderror', (fileObj) => {
            console.error(`Asset failed to load: ${fileObj?.src || fileObj?.url || fileObj?.key || 'unknown asset'}`);
        });

        // All posters are preloaded in BootScene.js to ensure stability.
        // Lead cast is still fetched on the fly as it is director-specific and large.

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
        this.bgScene = this.scene.get('BackgroundScene');
        this.bgScene?.setClickRipplesEnabled(false);
        this.bgScene?.setBallsVisible(false);

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
            this.bgScene?.setBallsVisible(true);
            const matterWorld = this.matter?.world;
            this.backgroundPlatformMirrors.forEach(({ body }) => {
                if (matterWorld && body) {
                    matterWorld.remove(body);
                }
            });
            this.backgroundPlatformMirrors.clear();
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

    syncBackgroundPlatforms() {
        if (!this.bgScene?.boxes) {
            return;
        }

        const activeKeys = new Set();
        const marginX = this.margin;
        const marginY = this.margin;
        const boardLeft = marginX;
        const boardTop = marginY;
        const boardRight = marginX + this.boardWidth;
        const boardBottom = marginY + this.boardHeight;
        const halfWidth = this.bgScene.cubeHalfWidth;
        const halfHeight = this.bgScene.cubeHalfHeight;

        this.bgScene.boxes.forEach((box) => {
            const screenX = box.x + halfWidth;
            const screenY = box.y + halfHeight;
            if (screenX < boardLeft - halfWidth || screenX > boardRight + halfWidth || screenY < boardTop - halfHeight || screenY > boardBottom + halfHeight) {
                return;
            }

            const key = String(box.body?.id || `${screenX}:${screenY}`);
            activeKeys.add(key);
            const localX = screenX - marginX;
            const localY = screenY - marginY;

            let mirror = this.backgroundPlatformMirrors.get(key);
            if (!mirror) {
                const body = this.matter.add.fromVertices(
                    localX,
                    localY,
                    [
                        { x: 0, y: -halfHeight },
                        { x: halfWidth, y: 0 },
                        { x: 0, y: halfHeight },
                        { x: -halfWidth, y: 0 }
                    ],
                    {
                        isStatic: true,
                        friction: 0,
                        frictionStatic: 0,
                        restitution: 0.95,
                        label: 'bg_platform'
                    }
                );
                mirror = { body };
                this.backgroundPlatformMirrors.set(key, mirror);
            } else {
                this.matter.body.setPosition(mirror.body, { x: localX, y: localY });
            }
        });

        [...this.backgroundPlatformMirrors.entries()].forEach(([key, mirror]) => {
            if (activeKeys.has(key)) {
                return;
            }
            this.matter.world.remove(mirror.body);
            this.backgroundPlatformMirrors.delete(key);
        });
    }

    createOrganicLayout() {
        const rows = 12;
        const spacingX = this.boardWidth / 10;
        const startY = 240;
        const endY = this.boardHeight - 330;
        const spacingY = (endY - startY) / Math.max(1, rows - 1);
        const warmPegColor = 0xf2c46d;
        const featurePegColor = 0xff981f;
        const lowerPegColor = 0xffb14a;
        const pegStrokeColor = 0x3a1700;
        const labelStrokeColor = 0xfff0c7;

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
                let baseColor = warmPegColor;

                const hasNoMultiplier = this.directorModifiers.noMultiplier;

                const centerDist = Math.abs(x - (this.boardWidth / 2));
                if (centerDist < 50) {
                    size = 18;
                    multiplier = 5;
                    baseColor = featurePegColor;
                } else if (row === rows - 1) {
                    size = 14;
                    multiplier = 2;
                    baseColor = lowerPegColor;
                }

                const isRotatingBouncer = (row + col) % 7 === 0;
                const pegVisual = isRotatingBouncer
                    ? this.add.rectangle(x, y, size * 2.3, size * 0.95, baseColor).setStrokeStyle(3, pegStrokeColor).setAngle(35).setDepth(5)
                    : this.add.circle(x, y, size, baseColor).setStrokeStyle(3, pegStrokeColor).setDepth(5);
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
                        stroke: `#${labelStrokeColor.toString(16).padStart(6, '0')}`,
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
        this.funnel = this.add.triangle(this.boardWidth / 2, 68, 0, 0, 60, 0, 30, 40, 0xff8800).setOrigin(0.5);
        this.boardContainer.add(this.funnel);
        this.lastFunnelX = this.funnel.x;
        this.lastFunnelY = this.funnel.y;

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

    getFunnelTipPosition() {
        if (!this.funnel) {
            return { x: this.boardWidth / 2, y: 92 };
        }

        return {
            x: this.funnel.x,
            y: this.funnel.y + (this.funnel.displayHeight * 0.5)
        };
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
        this.maxBucketScore = Math.max(...bucketScores);
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
        const levelIndex = GameState.currentRun.currentFilmIndex;
        const stealerCount = Math.max(0, levelIndex);
        const orbitCenterX = this.boardWidth / 2;
        const orbitCenterY = this.boardHeight * 0.56;
        const orbitBaseRadius = Math.min(this.boardWidth * 0.24, 170);

        for (let index = 0; index < stealerCount; index++) {
            const orbitAngle = (Math.PI * 2 * index) / stealerCount;
            const orbitRadiusX = orbitBaseRadius + ((index % 2) * 18);
            const orbitRadiusY = orbitRadiusX * 0.7;
            const eaterX = orbitCenterX + Math.cos(orbitAngle) * orbitRadiusX;
            const eaterY = orbitCenterY + Math.sin(orbitAngle) * orbitRadiusY;
            const visual = this.add.circle(eaterX, eaterY, 24, 0x771111).setStrokeStyle(4, 0xff4444).setDepth(12);
            const xMark = this.add.text(eaterX, eaterY, 'X', {
                fontSize: '34px',
                fontFamily: '"VT323", monospace',
                color: '#ffd7d7'
            }).setOrigin(0.5).setDepth(13);
            this.boardContainer.add([visual, xMark]);
            const body = this.matter.add.circle(eaterX, eaterY, 24, {
                isStatic: true,
                isSensor: true,
                label: 'ball_eater'
            });
            body.visual = visual;
            body.labelText = xMark;
            body.orbitCenterX = orbitCenterX;
            body.orbitCenterY = orbitCenterY;
            body.orbitRadiusX = orbitRadiusX;
            body.orbitRadiusY = orbitRadiusY;
            body.orbitAngle = orbitAngle;
            body.orbitSpeed = 0.005 + (index * 0.0009);
            this.ballEaters.push(body);
        }

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

        const sideBg = this.add.rectangle(sidebarWidth / 2, this.boardHeight / 2, sidebarWidth, this.boardHeight, 0x0d0d0d, 1);
        this.sidebar.add(sideBg);

        // Sidebar Clipping Mask
        const maskShape = this.make.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect(this.margin + this.boardWidth, this.margin, sidebarWidth, this.boardHeight);
        const sidebarMask = maskShape.createGeometryMask();
        this.sidebar.setMask(sidebarMask);

        let currentY = 128;

        this.createSidebarAudioControls();

        this.sidebar.add(this.add.text(sidebarWidth / 2, currentY, 'CURRENT FEATURE', {
            fontSize: '22px',
            fontFamily: '"VT323", monospace',
            color: '#ffaa00',
            align: 'center'
        }).setOrigin(0.5, 0));
        currentY += 30;

        const sectionDivider = this.add.graphics();
        sectionDivider.lineStyle(1, 0x444444, 0.8);
        sectionDivider.lineBetween(padding, currentY, sidebarWidth - padding, currentY);
        this.sidebar.add(sectionDivider);
        currentY += 16;

        const posterHeight = Math.min(334, Math.round((innerWidth - 20) * 1.42));
        const posterCenterY = currentY + posterHeight / 2;
        this.posterFrame = this.add.rectangle(sidebarWidth / 2, posterCenterY, innerWidth, posterHeight, 0x111111, 1)
            .setStrokeStyle(3, 0xffaa00);
        this.sidebar.add(this.posterFrame);

        if (this.textures.exists(this.currentPosterKey)) {
            this.posterImage = this.add.image(sidebarWidth / 2, posterCenterY, this.currentPosterKey).setOrigin(0.5);
            this.posterImage.setDisplaySize(innerWidth - 14, posterHeight - 14);
            this.posterImage.setAlpha(0.96);
            this.sidebar.add(this.posterImage);
        } else {
            const posterFallback = this.add.rectangle(sidebarWidth / 2, posterCenterY, innerWidth - 16, posterHeight - 16, 0x333333, 1)
                .setStrokeStyle(2, 0x666666);
            const posterFallbackText = this.add.text(sidebarWidth / 2, posterCenterY, 'POSTER\nUNAVAILABLE', {
                fontSize: '28px',
                fontFamily: '"VT323", monospace',
                color: '#888888',
                align: 'center'
            }).setOrigin(0.5);
            this.sidebar.add([posterFallback, posterFallbackText]);
        }
        currentY += posterHeight + 14;

        this.featureTitleText = this.add.text(sidebarWidth / 2, currentY, (this.rawFilmData?.title || 'UNTITLED FEATURE').toUpperCase(), {
            fontSize: '24px',
            fontFamily: '"VT323", monospace',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: innerWidth }
        }).setOrigin(0.5, 0);
        this.sidebar.add(this.featureTitleText);
        currentY += this.featureTitleText.height + 12;

        const directorCardHeight = 128;
        const directorCard = this.add.rectangle(sidebarWidth / 2, currentY + directorCardHeight / 2, innerWidth, directorCardHeight, 0x111111, 1)
            .setStrokeStyle(2, 0xffaa00, 0.6);
        this.sidebar.add(directorCard);

        const directorTextCenterX = sidebarWidth / 2;
        this.sidebar.add(this.add.text(directorTextCenterX, currentY + 14, 'DIRECTOR', {
            fontSize: '18px',
            fontFamily: '"VT323", monospace',
            color: '#666666',
            align: 'center'
        }).setOrigin(0.5, 0));

        this.directorNameText = this.add.text(directorTextCenterX, currentY + 34, this.directorData.name.toUpperCase(), {
            fontSize: '26px',
            fontFamily: '"VT323", monospace',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: innerWidth - 24 }
        }).setOrigin(0.5, 0);
        this.sidebar.add(this.directorNameText);

        this.directorFlavorText = this.add.text(directorTextCenterX, currentY + 64, this.directorData.cinematicFact || 'Every director bends the set to their own strange rhythm.', {
            fontSize: '15px',
            fontFamily: '"VT323", monospace',
            color: '#a7a7a7',
            align: 'center',
            wordWrap: { width: innerWidth - 40 }
        }).setOrigin(0.5, 0);
        this.sidebar.add(this.directorFlavorText);

        const traitBox = this.add.rectangle(directorTextCenterX, currentY + 108, innerWidth - 44, 32, 0x1e1e1e, 1)
            .setStrokeStyle(1, 0xffaa00, 0.6);
        this.sidebar.add(traitBox);
        const traitTextStr = this.directorData.traitLines?.[0] || 'STANDARD PRODUCTION';
        this.traitText = this.add.text(directorTextCenterX, currentY + 108, traitTextStr, {
            fontSize: '17px',
            fontFamily: '"VT323", monospace',
            color: '#ffaa00',
            align: 'center',
            wordWrap: { width: innerWidth - 56 }
        }).setOrigin(0.5);
        this.sidebar.add(this.traitText);
        currentY += directorCardHeight + 14;

        const statsBoxHeight = 338;
        const statsBox = this.add.rectangle(sidebarWidth / 2, currentY + statsBoxHeight / 2, innerWidth, statsBoxHeight, 0x0f0f0f, 1)
            .setStrokeStyle(2, 0xffaa00, 0.55)
            .setOrigin(0.5);
        this.sidebar.add(this.add.text(padding + 8, currentY + 8, 'PRODUCTION VALUES', {
            fontSize: '18px',
            fontFamily: '"VT323", monospace',
            color: '#666666'
        }).setOrigin(0, 0));
        this.productionCostLabel = this.add.text(padding + 8, currentY + 34, 'COSTS: $0M', {
            fontSize: '21px',
            fontFamily: '"VT323", monospace',
            color: '#ff9c7a'
        }).setOrigin(0, 0);
        this.netBudgetLabel = this.add.text(padding + 8, currentY + 62, 'NET: $0M', {
            fontSize: '24px',
            fontFamily: '"VT323", monospace',
            color: '#66ff88'
        }).setOrigin(0, 0);
        this.ratingHUD = this.add.text(padding + 8, currentY + 92, 'GOAL: 0%', {
            fontSize: '22px',
            fontFamily: '"VT323", monospace',
            color: '#f5c518'
        }).setOrigin(0, 0);
        this.scoreLabel = this.add.text(padding + 8, currentY + 120, 'LANDED: $0.0M', {
            fontSize: '20px',
            fontFamily: '"VT323", monospace',
            color: '#8cff98'
        }).setOrigin(0, 0);
        this.ballLabel = this.add.text(padding + 8, currentY + 148, 'REELS: 10', {
            fontSize: '22px',
            fontFamily: '"VT323", monospace',
            color: '#ffd2d2'
        }).setOrigin(0, 0);
        this.droppedLabel = this.add.text(padding + 8, currentY + 176, 'DROPPED: 0', {
            fontSize: '22px',
            fontFamily: '"VT323", monospace',
            color: '#ffe08a'
        }).setOrigin(0, 0);
        this.expectedReelsLabel = this.add.text(padding + 8, currentY + 204, 'PLAN: 5 REELS', {
            fontSize: '22px',
            fontFamily: '"VT323", monospace',
            color: '#ffaa00'
        }).setOrigin(0, 0);
        this.padInventoryLabel = this.add.text(padding + 8, currentY + 232, 'PADS: 0 READY', {
            fontSize: '22px',
            fontFamily: '"VT323", monospace',
            color: '#66f2ff'
        }).setOrigin(0, 0);
        this.liveTakeValueLabel = this.add.text(padding + 8, currentY + 260, 'LIVE TAKE: $0M', {
            fontSize: '20px',
            fontFamily: '"VT323", monospace',
            color: '#66f2ff',
            wordWrap: { width: innerWidth - 24 }
        }).setOrigin(0, 0);
        this.projectionLabel = this.add.text(padding + 8, currentY + 286, 'LANDED + POSSIBLE: $0M / 0%', {
            fontSize: '19px',
            fontFamily: '"VT323", monospace',
            color: '#f5c518',
            wordWrap: { width: innerWidth - 24 }
        }).setOrigin(0, 0);
        this.activeReelValuesText = this.add.text(padding + 8, currentY + 312, 'REELS LIVE: none', {
            fontSize: '15px',
            fontFamily: '"VT323", monospace',
            color: '#aaaaaa',
            wordWrap: { width: innerWidth - 24 }
        }).setOrigin(0, 0);
        const budgetBarWidth = innerWidth - 26;
        const budgetBarHeight = 28;
        const budgetBarY = currentY + 370;
        this.progressFrame = this.add.rectangle(sidebarWidth / 2, budgetBarY, budgetBarWidth, budgetBarHeight, 0x060606, 1)
            .setStrokeStyle(2, 0xffaa00);
        this.progressFill = this.add.rectangle(
            sidebarWidth / 2 - (budgetBarWidth / 2) + 4,
            budgetBarY,
            0,
            budgetBarHeight - 8,
            0x66f2ff,
            1
        ).setOrigin(0, 0.5);
        this.sidebar.add([statsBox, this.productionCostLabel, this.netBudgetLabel, this.ratingHUD, this.scoreLabel, this.ballLabel, this.droppedLabel, this.expectedReelsLabel, this.padInventoryLabel, this.liveTakeValueLabel, this.projectionLabel, this.activeReelValuesText, this.progressFrame, this.progressFill]);
        currentY += statsBoxHeight + 16;

        this.padModeButton = UI.createChunkyButton(this, sidebarWidth / 2, currentY + 28, sidebarWidth - 36, 56, 'PLACE PADS', () => {
            this.togglePadMode();
        }, 'TACTICAL SETUP');
        this.sidebar.add(this.padModeButton);
        currentY += 72;

        this.wrapButton = UI.createChunkyButton(this, sidebarWidth / 2, currentY + 24, sidebarWidth - 56, 48, 'SELL EXTRAS', () => {
            this.handleSellExtras();
        }, 'WRAP THE SHOOT');
        this.sidebar.add(this.wrapButton);
        this.wrapButton.setAlpha(0.45);
        this.wrapButton.disableInteractive?.();
        currentY += 56;

        this.lockStatusText = this.add.text(sidebarWidth / 2, currentY, '', {
            fontSize: '18px',
            fontFamily: '"VT323", monospace',
            color: '#ffef9a',
            align: 'center',
            wordWrap: { width: innerWidth - 10 }
        }).setOrigin(0.5, 0);
        this.sidebar.add(this.lockStatusText);
        currentY += 48;

        const castSectionY = Math.max(currentY - 10, this.boardHeight - 214);
        this.castSectionY = castSectionY;
        const portraitFrame = this.resolveDirectorPortraitFrame();
        const directorPortraitCard = this.createPortraitCard({
            x: sidebarWidth / 2,
            y: castSectionY - 228,
            texture: this.textures.exists('director_portraits') ? 'director_portraits' : null,
            frame: portraitFrame,
            width: 184,
            height: 252,
            footerLabel: '',
            fallbackText: this.directorData.name.split(' ').map((part) => part[0]).join(''),
            showFooter: false,
            imageOffsetY: -6
        });
        this.sidebar.add(directorPortraitCard.container);
        this.directorAvatar = directorPortraitCard.container;
        this.popPortrait(directorPortraitCard.container, directorPortraitCard.sprite, 'sfx_win1');
        this.barkAnchorPoint = {
            x: directorPortraitCard.container.x,
            y: directorPortraitCard.container.y + 160
        };

        const castDividerY = castSectionY + 34;
        const castDivider = this.add.graphics();
        castDivider.lineStyle(1, 0x444444, 0.8);
        castDivider.lineBetween(padding, castDividerY, sidebarWidth - padding, castDividerY);
        this.sidebar.add(castDivider);

        this.sidebar.add(this.add.text(sidebarWidth / 2, castDividerY + 10, 'ENSEMBLE BOARD', {
            fontSize: '22px',
            fontFamily: '"VT323", monospace',
            color: '#ffaa00',
            align: 'center'
        }).setOrigin(0.5, 0));

        this.castListText = this.add.text(sidebarWidth / 2, castDividerY + 38, 'Waiting on the ensemble...', {
            fontSize: '16px',
            fontFamily: '"VT323", monospace',
            color: '#888888',
            align: 'center',
            wordWrap: { width: innerWidth - 10 }
        }).setOrigin(0.5, 0);
        this.sidebar.add(this.castListText);

        this.castRowY = castDividerY + 84;
        this.castAnchorPositions = [sidebarWidth / 2 - 64, sidebarWidth / 2, sidebarWidth / 2 + 64];
        this.castSlotLights = this.castAnchorPositions.map((x) => {
            const light = this.add.circle(x, castDividerY + 72, 7, 0x443300, 0.95).setStrokeStyle(2, 0x775500);
            this.sidebar.add(light);
            return light;
        });
        this.updateUI();
    }

    createPortraitCard({ x, y, texture, frame = undefined, width = 150, height = 210, footerLabel = '', fallbackText = null, showFooter = true, imageOffsetY = 0 }) {
        const container = this.add.container(x, y);
        const footerHeight = showFooter ? 34 : 0;
        const cardHeight = height + 24 + footerHeight;
        const cardCenterY = showFooter ? 0 : -12;
        const imageY = cardCenterY + (showFooter ? -10 : 0) + imageOffsetY;
        const outer = this.add.rectangle(0, cardCenterY, width + 24, cardHeight, 0x20150b).setStrokeStyle(4, 0xffd27a);
        const matte = this.add.rectangle(0, imageY, width, height, 0x111111).setStrokeStyle(2, 0xffaa00);
        let sprite;
        let fallbackLabel = null;

        if (texture && this.textures.exists(texture) && (frame === undefined || this.textures.get(texture).has(frame))) {
            sprite = this.add.sprite(0, imageY, texture);
            if (frame !== undefined) {
                sprite.setTexture(texture, frame);
            }
            const availableWidth = width - 8;
            const availableHeight = height - 8;
            sprite.setDisplaySize(availableWidth, availableHeight);
            if (typeof sprite.setInterpolation === 'function') {
                sprite.setInterpolation('pixelated');
            }
            sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        } else {
            sprite = this.add.image(0, imageY, 'placeholder_box');
            sprite.setDisplaySize(width - 8, height - 8);
            sprite.setTint(0x8a8a8a);
            if (fallbackText) {
                fallbackLabel = this.add.text(0, imageY, fallbackText, {
                    fontSize: `${Math.max(18, Math.floor(width * 0.22))}px`,
                    fontFamily: '"VT323", monospace',
                    color: '#f5f5f5',
                    align: 'center'
                }).setOrigin(0.5);
            }
        }

        sprite.setAlpha(0);
        sprite.setData('restScaleX', sprite.scaleX);
        sprite.setData('restScaleY', sprite.scaleY);
        sprite.setScale(sprite.scaleX * 0.84, sprite.scaleY * 0.84);

        container.add([outer, matte, sprite]);
        if (showFooter && footerLabel) {
            const label = this.add.text(0, height / 2 + 18, footerLabel, {
                fontSize: '18px',
                fontFamily: '"VT323", monospace',
                color: '#ffe6b5',
                letterSpacing: 2
            }).setOrigin(0.5);
            container.add(label);
        }
        if (fallbackLabel) {
            container.add(fallbackLabel);
        }
        return { container, sprite };
    }

    popPortrait(container, sprite, soundKey = 'sfx_win1') {
        container.setAlpha(1);
        sprite.setAlpha(0);
        const restScaleX = sprite.getData('restScaleX') ?? 1;
        const restScaleY = sprite.getData('restScaleY') ?? 1;
        sprite.setScale(restScaleX * 0.84, restScaleY * 0.84);

        if (!this.sound.mute && this.cache.audio.exists(soundKey)) {
            this.sound.play(soundKey, { volume: 0.75 * (GameState.getAudioSettings(this).sfxVolume ?? 1) });
        }

        this.tweens.add({
            targets: sprite,
            alpha: 1,
            scaleX: restScaleX * 1.08,
            scaleY: restScaleY * 1.08,
            duration: 320,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: sprite,
                    scaleX: restScaleX,
                    scaleY: restScaleY,
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
        const reelsDropped = GameState.currentRun.reelDrops || 0;
        const liveTakePotential = this.getLiveTakePotential();

        this.clampCurrentScore(this.currentScore);
        const productionCost = this.getCurrentProductionCost();
        const expectedReels = this.levelData?.expectedReels || 1;
        const reelsOver = Math.max(0, this.levelReelsDropped - expectedReels);
        const netScore = this.getCurrentNetScore();
        const projectedNet = Math.max(0, netScore + liveTakePotential);
        const projectedPercent = Phaser.Math.Clamp(Math.floor((projectedNet / safeTarget) * 100), 0, 999);
        this.scoreLabel.setText(`LANDED: ${GameState.formatMillions(this.currentScore)}`);
        if (this.netBudgetLabel) {
            this.netBudgetLabel.setText(`NET: ${GameState.formatMillions(netScore)}`);
            this.netBudgetLabel.setColor(netScore >= safeTarget ? '#66ff88' : '#8cff98');
        }
        this.ballLabel.setText(`REELS: ${safeBallsRemaining}`);
        if (this.droppedLabel) {
            this.droppedLabel.setText(`DROPPED: ${reelsDropped}`);
        }
        if (this.expectedReelsLabel) {
            this.expectedReelsLabel.setText(`PLAN: ${expectedReels} REEL${expectedReels === 1 ? '' : 'S'}${reelsOver > 0 ? `  (+${reelsOver} OVER)` : ''}`);
            this.expectedReelsLabel.setColor(reelsOver > 0 ? '#ff8f66' : '#ffaa00');
        }
        if (this.padInventoryLabel) {
            const padCount = GameState.currentRun.inventory.bouncePads || 0;
            this.padInventoryLabel.setText(`PADS: ${padCount} READY`);
            this.padInventoryLabel.setColor(padCount > 0 ? '#66f2ff' : '#666666');
        }
        if (this.productionCostLabel) {
            this.productionCostLabel.setText(`COSTS: ${GameState.formatMillions(productionCost)}   NET: ${GameState.formatMillions(netScore)}`);
            this.productionCostLabel.setColor(productionCost > 0 ? '#ff9c7a' : '#666666');
        }
        if (this.liveTakeValueLabel) {
            this.liveTakeValueLabel.setText(`LIVE TAKE: ${GameState.formatMillions(liveTakePotential)}`);
            this.liveTakeValueLabel.setColor(liveTakePotential > 0 ? '#66f2ff' : '#666666');
        }
        if (this.projectionLabel) {
            this.projectionLabel.setText(`LANDED + POSSIBLE: ${GameState.formatMillions(projectedNet)} / ${projectedPercent}%`);
            this.projectionLabel.setColor(projectedNet >= safeTarget ? '#66ff88' : '#f5c518');
        }
        if (this.activeReelValuesText) {
            const liveReels = this.activeBalls.map((ball) => `R${ball.ballId}: ${GameState.formatMillions(this.getBallCurrentPotential(ball))}`);
            if (!liveReels.length) {
                this.activeReelValuesText.setText('REELS LIVE: none');
            } else {
                const reelLines = [];
                for (let i = 0; i < liveReels.length; i += 2) {
                    reelLines.push(liveReels.slice(i, i + 2).join('  |  '));
                }
                this.activeReelValuesText.setText(`REELS LIVE:\n${reelLines.join('\n')}`);
            }
        }

        const percentage = Phaser.Math.Clamp(Math.floor((netScore / safeTarget) * 100), 0, 100);
        this.ratingHUD.setText(`GOAL: ${percentage}%`);
        if (this.progressFill) {
            const maxWidth = this.progressFrame.width - 8;
            const fillWidth = Phaser.Math.Clamp(maxWidth * (percentage / 100), 0, maxWidth);
            this.progressFill.width = fillWidth;
        }

        [0.25, 0.5, 0.75].forEach((threshold, index) => {
            if ((netScore / safeTarget) >= threshold && !this.activeCast.includes(index)) {
                this.hireActor(index);
            }
        });

        if (this.padModeButton?.list?.[1]) {
            this.padModeButton.list[1].setText(this.padModeActive ? 'EDIT SET: ON' : 'PLACE PADS');
        }
        if (this.padModeButton?.list?.[2]) {
            this.padModeButton.list[2].setText(this.padModeActive ? 'TAP THE BOARD TO PLACE' : 'TACTICAL SETUP');
        }
        if (this.wrapButton) {
            const canWrap = this.readyToWrap && this.activeBalls.length === 0 && this.ballsRemaining > 0;
            this.wrapButton.setAlpha(canWrap ? 1 : 0.45);
            if (canWrap) {
                this.wrapButton.setInteractive?.();
            } else {
                this.wrapButton.disableInteractive?.();
            }
            if (this.wrapButton.list?.[1]) {
                this.wrapButton.list[1].setText(`SELL ${this.ballsRemaining} REELS`);
            }
            if (this.wrapButton.list?.[2]) {
                const saleValue = this.ballsRemaining * (this.levelData?.reelSaleValue || 0);
                this.wrapButton.list[2].setText(canWrap ? `BONUS ${GameState.formatMillions(saleValue)}` : 'CLEAR GOAL TO CASH OUT');
            }
        }

        if (this.activeBalls.length > 0) {
            this.lockStatusText?.setText(`LIVE TAKE\n${this.activeBalls.length} reel(s) in motion`);
            this.lockStatusText?.setColor('#ffcf66');
        } else if (this.readyToWrap && this.ballsRemaining > 0) {
            this.lockStatusText?.setText('GOAL CLEARED\nSell extras or keep shooting');
            this.lockStatusText?.setColor('#66ff88');
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
        const actorW = 44;
        const actorH = 60;
        const portrait = this.createPortraitCard({
            x: this.castAnchorPositions?.[index] ?? (this.sidebarWidth / 2),
            y: this.castRowY,
            texture: this.textures.exists(`actor_profile_${index}`) ? `actor_profile_${index}` : null,
            width: actorW,
            height: actorH,
            footerLabel: actor.name.split(' ')[0].toUpperCase(),
            fallbackText: actor.name.split(' ').map((part) => part[0]).join('')
        });

        this.sidebar.add(portrait.container);
        this.castPortraits.push(portrait.container);
        if (this.castSlotLights?.[index]) {
            this.castSlotLights[index].setFillStyle(0xf5c518, 1);
            this.castSlotLights[index].setStrokeStyle(2, 0xfff0a0);
        }
        this.popPortrait(portrait.container, portrait.sprite, 'sfx_win2');
        this.addBark(`${actor.name.split(' ')[0]} ready`, portrait.container);
        this.updateCastList();
    }

    updateCastList() {
        if (!this.castListText) {
            return;
        }

        const names = this.activeCast.map((index) => this.leadCast[index].name.split(' ')[0].toUpperCase());
        this.castListText.setText(names.length ? names.join('  •  ') : 'Waiting on the ensemble...');
    }

    resolveDirectorPortraitFrame() {
        if (!this.textures.exists('director_portraits')) {
            return this.directorData.portraitFrame ?? 0;
        }

        const texture = this.textures.get('director_portraits');
        const portraitToken = this.resolveDirectorPortraitToken();
        if (texture.has(portraitToken)) {
            return portraitToken;
        }

        const numericFrame = this.directorData.portraitFrame ?? 0;
        return texture.has(numericFrame) ? numericFrame : 0;
    }

    resolveDirectorPortraitToken() {
        const candidates = [
            this.directorData.portraitKey,
            this.directorData.portraitFrame
        ];
        const hardcodedMatch = TMDB.getHardcodedDirectors().find((director) => {
            return director.id === this.directorData.id || director.name === this.directorData.name;
        });
        if (hardcodedMatch) {
            candidates.push(hardcodedMatch.portraitKey, hardcodedMatch.portraitFrame);
        }
        return candidates.find((candidate) => candidate !== undefined && candidate !== null) ?? 0;
    }

    getLiveTakePotential() {
        return this.activeBalls.reduce((sum, ball) => sum + this.getBallCurrentPotential(ball), 0);
    }

    createSidebarAudioControls() {
        this.settingsOverlay = UI.createSettingsOverlay(this, {
            showAbandon: true,
            onAbandon: () => this.handleAbandonProduction(),
            onClose: () => this.matter.world.resume()
        });

        const { x, y } = UI.getSettingsButtonPositionInContainer(this, this.margin + this.boardWidth, this.margin);
        this.settingsBtn = UI.createSettingsButton(this, x, y, () => {
            const settings = GameState.getAudioSettings(this);
            if (!this.sound.mute && this.cache.audio.exists('sfx_gear')) {
                this.sound.play('sfx_gear', { volume: 0.8 * (settings.sfxVolume ?? 1) });
            }
            this.matter.world.pause();
            this.settingsOverlay.openModal();
        });
        this.sidebar.add(this.settingsBtn);
        if (typeof this.sidebar.bringToTop === 'function') {
            this.sidebar.bringToTop(this.settingsBtn);
        }
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

            this.dropBall();
        });
    }

    dropBall() {
        if (this.ballsRemaining <= 0) {
            return;
        }

        const funnelTip = this.getFunnelTipPosition();
        const spawnX = Phaser.Math.Clamp(funnelTip.x, 80, this.boardWidth - 80);
        const spawnY = funnelTip.y;
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
        ball.pendingValue = 0;
        ball.ballId = this.nextBallId++;
        ball.expireAt = this.time.now + this.getReelLifetimeMs();

        // Dampen inherited velocity from the funnel so it feels responsive but controlled
        const inheritedX = Phaser.Math.Clamp(this.funnelVelocityX * 0.15, -12, 12);
        const inheritedY = Phaser.Math.Clamp(this.funnelVelocityY * 0.15, 0, 10);

        this.matter.body.setVelocity(ball, {
            x: inheritedX,
            y: inheritedY + 2 // Slight downward push to ensure it leaves the funnel cleanly
        });

        this.activeBalls.push(ball);
        this.ballsRemaining -= 1;
        this.levelReelsDropped += 1;
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
                    this.checkOscarCollision(ball);
                } else if (other.label === 'ball_eater') {
                    this.handleBallEaterCollision(ball, other);
                } else if (other.label === 'gutter') {
                    this.handleGutterCollision(ball);
                }
            });
        });
    }

    handlePegCollision(ball, peg) {
        // --- Visuals always fire ---
        if (peg.visual) {
            this.tweens.add({ targets: peg.visual, scaleX: 1.5, scaleY: 1.5, duration: 100, yoyo: true });
        }
        if (peg.isRotatingBouncer) peg.rotationSpeed *= -1;
        this.game.events.emit('game-impact', 0.5);
        if (!this.sound.mute && this.cache.audio.exists('tick')) {
            this.sound.play('tick', {
                volume: 0.1 * (GameState.getAudioSettings(this).sfxVolume ?? 1),
                rate: Phaser.Math.FloatBetween(0.8, 1.2)
            });
        }

        // --- Economy debounce: 100ms cooldown per ball between scored peg hits ---
        const now = this.time.now;
        const PEG_COOLDOWN_MS = 100;
        if ((now - (ball.lastPegHitTime || 0)) < PEG_COOLDOWN_MS) return;
        ball.lastPegHitTime = now;

        peg.bounceCount = (peg.bounceCount || 0) + 1;

        // Cap multiplier at 16× to prevent exponential runaway
        const MAX_MULTIPLIER = 16;
        ball.scoreMultiplier = Math.min((ball.scoreMultiplier || 1) * (peg.multiplier || 1), MAX_MULTIPLIER);
        const bounceValue = Math.max(8, Math.round((12 + ((peg.multiplier || 1) * 10)) * Math.pow(0.9, Math.min(peg.bounceCount - 1, 5))));
        ball.pendingValue = (ball.pendingValue || 0) + bounceValue;
        this.spawnValueBurst(ball.position.x, ball.position.y - 12, `+${bounceValue}`);

        this.spawnExposureDot(ball.position.x, ball.position.y);
        this.updateUI();
    }

    checkBallBucketCollision(ball, bucket) {
        // Guard against duplicate sensor firings for the same ball
        if (ball.bucketTriggered) return;
        ball.bucketTriggered = true;

        const scoreStr = bucket.label.split('_')[1];
        const rawPoints = Number(scoreStr) * (ball.scoreMultiplier || 1) * (ball.isOscarBall ? 2.5 : 1) + (ball.pendingValue || 0);
        // Cap a single drop at 50% of the level target to prevent runaway scoring
        const points = Math.min(rawPoints, (this.levelData?.targetScore || 10000) * 0.5);
        this.clampCurrentScore(this.currentScore + points);
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
        this.addBark('Ball eater! Take lost.', eater.visual);
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

    checkOscarCollision(ball) {
        if (!this.oscar || !ball) {
            return;
        }

        const pickupMult = this.directorModifiers.oscarBonusMult || 1;
        ball.scoreMultiplier = Math.min((ball.scoreMultiplier || 1) * (2 * pickupMult), 16);
        
        // Trigger scanline reactive jitter for Oscar!
        this.game.events.emit('game-impact', 2.5);

        const bonusTxt = this.add.text(this.oscar.visual.x, this.oscar.visual.y, 'OSCAR BOOST!', {
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

        this.addBark('Oscar boost ready!');
        this.oscar.visual.destroy();
        this.oscar.stars.destroy();
        this.matter.world.remove(this.oscar.body);
        this.oscar = null;
        this.updateUI();
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

    handleSellExtras() {
        if (!this.readyToWrap || this.activeBalls.length > 0 || this.ballsRemaining <= 0) {
            return;
        }

        const saleValue = this.ballsRemaining * (this.levelData?.reelSaleValue || 0);
        this.clampCurrentScore(this.currentScore + saleValue);
        this.addBark(`Sold extras for ${GameState.formatMillions(saleValue)}`);
        this.ballsRemaining = 0;
        this.updateUI();
        this.handleLevelWin();
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

        const barkX = anchor ? target.x : (this.barkAnchorPoint?.x ?? target.x + 78);
        const barkY = anchor ? target.y - 72 : (this.barkAnchorPoint?.y ?? target.y - 108);
        const bark = this.add.container(barkX, barkY).setDepth(500);
        const bg = this.add.rectangle(0, 0, 172, 40, 0x18110a).setStrokeStyle(2, 0xffaa00);
        const accent = this.add.rectangle(-78, 0, 8, 40, 0xf5c518, 1);
        const txt = this.add.text(0, 0, textStr, {
            fontSize: '18px',
            color: '#fff0c9',
            fontFamily: '"VT323", monospace'
        }).setOrigin(0.5);
        bark.add([bg, accent, txt]);
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

    spawnValueBurst(x, y, valueText) {
        const burst = this.add.text(x, y, valueText, {
            fontSize: '18px',
            fontFamily: '"VT323", monospace',
            color: '#ffef9a',
            stroke: '#2b1400',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(40);
        this.boardContainer.add(burst);
        this.tweens.add({
            targets: burst,
            y: y - 26,
            alpha: 0,
            duration: 650,
            ease: 'Sine.easeOut',
            onComplete: () => burst.destroy()
        });
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

        if (this.getCurrentNetScore() >= this.levelData.targetScore) {
            this.readyToWrap = true;
            if (this.activeBalls.length === 0 && this.ballsRemaining <= 0) {
                this.handleLevelWin();
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
        const productionCost = this.getCurrentProductionCost();
        const netRoundScore = this.getCurrentNetScore();
        GameState.currentRun.lastGrossRoundScore = this.currentScore;
        GameState.currentRun.lastProductionCost = productionCost;
        GameState.currentRun.lastNetRoundScore = netRoundScore;
        GameState.currentRun.lastExpectedReels = this.levelData.expectedReels || 1;
        GameState.currentRun.lastReelsOver = Math.max(0, this.levelReelsDropped - (this.levelData.expectedReels || 1));
        GameState.currentRun.lastRoundScore = netRoundScore;
        GameState.currentRun.lastTargetScore = this.levelData.targetScore;
        GameState.currentRun.lastRating = Math.max(0, Math.round((netRoundScore / this.levelData.targetScore) * 10) / 10);

        // IMDb Ranking Connection
        const isDeepCut = GameState.currentRun.currentFilmIndex === 4;
        const projectedRating = (netRoundScore / this.levelData.targetScore) * 9.2;
        
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

        this.syncBackgroundPlatforms();

        if (this.funnel) {
            if (this.lastFunnelX === null || this.lastFunnelY === null) {
                this.lastFunnelX = this.funnel.x;
                this.lastFunnelY = this.funnel.y;
            } else {
                const deltaSeconds = Math.max(0.001, this.game.loop.delta / 1000);
                this.funnelVelocityX = (this.funnel.x - this.lastFunnelX) / deltaSeconds;
                this.funnelVelocityY = (this.funnel.y - this.lastFunnelY) / deltaSeconds;
                this.lastFunnelX = this.funnel.x;
                this.lastFunnelY = this.funnel.y;
            }
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

            if (time >= (ball.expireAt || Infinity)) {
                this.addBark(`Reel ${ball.ballId} timed out`);
                this.removeBall(ball);
                return;
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

        this.ballEaters.forEach((eater, index) => {
            if (!eater?.visual || !eater?.labelText) {
                return;
            }
            eater.orbitAngle += eater.orbitSpeed;
            const eaterX = eater.orbitCenterX + Math.cos(eater.orbitAngle) * eater.orbitRadiusX;
            const eaterY = eater.orbitCenterY + Math.sin(eater.orbitAngle) * eater.orbitRadiusY;
            this.matter.body.setPosition(eater, { x: eaterX, y: eaterY });
            eater.visual.setPosition(eaterX, eaterY);
            eater.labelText.setPosition(eaterX, eaterY);
            eater.visual.rotation += 0.02 + (index * 0.002);
        });

        this.exposureDots = this.exposureDots.filter((dot) => {
            if (dot.alpha <= 0.02) {
                dot.destroy();
                return false;
            }
            dot.setAlpha(dot.alpha * 0.985);
            return true;
        });

    }

    configureLevelData() {
        this.levelData = this.rawFilmData
            ? TMDB.getLevelDataFromFilm(this.rawFilmData)
            : { title: 'LOADING ERROR', targetScore: 2000, balls: 10, friction: 0.001, themeColor: 0x222222, releaseYear: 'N/A' };

        const levelIndex = GameState.currentRun.currentFilmIndex;
        this.levelData.targetScore = Math.round((2000 + (levelIndex * 900)) * (this.directorModifiers.targetScoreMult ?? 1));
        this.levelData.expectedReels = Math.max(1, 5 - levelIndex);
        this.levelData.productionBaseCost = 200 + (levelIndex * 150);
        this.levelData.extraReelCost = 180 + (levelIndex * 140);
        this.levelData.reelSaleValue = 140 + (levelIndex * 60);
        this.ballsRemaining = Math.max(
            1,
            10 + (this.directorModifiers.startingBalls || 0) - (GameState.draftingPenalty || 0)
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
