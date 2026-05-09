import Phaser from 'phaser';
import { GameState, ACHIEVEMENTS } from '../GameState.js';
import { UI } from '../utils/UI.js';
import { TMDB } from '../utils/TMDB.js';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
        this.hasMenuImpact = false;
        this.menuIntroStarted = false;
        this.menuButtonsRevealed = false;
    }

    preload() {
        this.load.image('tcc_logo', 'assets/images/Logo.jpg');
        this.load.image('gametitle', 'assets/images/gametitle.png');
    }

    create() {
        const { width, height } = this.scale;
        const margin = 40;
        const safeHeight = height - (margin * 2);
        this.hasMenuImpact = false;
        this.menuIntroStarted = false;
        this.menuButtonsRevealed = false;
        this.titlePulseStarted = false;
        this.memoryOpen = false;

        GameState.resetCurrentRun();
        this.bgScene = this.scene.get('BackgroundScene');
        if (!this.bgScene || !this.bgScene.scene.isActive()) {
            this.scene.launch('BackgroundScene');
            this.bgScene = this.scene.get('BackgroundScene');
        }
        this.bgScene?.setBgWheelVisible(false);
        this.bgScene?.setWheelVortex(width / 2, margin + (safeHeight * 0.3), 300, 0);
        this.bgScene?.syncBgWheel(0);

        this.cleanupPersistentMenuBodies();
        this.cleanupMenuWorldBodies();

        GameState.applyAudioSettings(this);

        this.add.rectangle(0, 0, width, height, 0x000000, 0.38).setOrigin(0, 0).setDepth(60);

        this.createDustParticles(width, height);
        this.createMenuBounds(width, height);

        this.uiContainer = this.add.container(0, 0);
        this.uiContainer.setDepth(100);

        this.titleImage = this.add.image(width / 2, 420, 'gametitle').setOrigin(0.5);
        const titleSource = this.textures.get('gametitle').getSourceImage();
        const targetWidth = Math.min(800, width - 100);
        this.titleScale = targetWidth / titleSource.width;
        this.titleImage.setScale(0);
        this.titleImage.setPipeline('ChromaKey');
        this.titleImage.setDepth(92);


        this.titleLogo = this.bgScene.matter.add.image(width / 2, -300, 'tcc_logo', null, {
            restitution: 0.7,
            friction: 0.03,
            frictionAir: 0.002,
            density: 0.0012,
            label: 'menu_logo',
            collisionFilter: {
                category: this.bgScene.CAT_LOGO,
                mask: 0xFFFFFFFF
            }
        });
        this.titleLogo.setOrigin(0.5);
        this.logoScale = 180 / this.titleLogo.width;
        this.titleLogo.setScale(this.logoScale);
        this.titleLogo.setDepth(95);
        this.titleLogo.setAngularVelocity(Phaser.Math.FloatBetween(-0.15, 0.15));
        this.titleLogo.setVelocity(
            Phaser.Math.FloatBetween(-3, 3),
            Phaser.Math.FloatBetween(6, 12)
        );
        this.titleLogo.setInteractive({ useHandCursor: true });
        this.titleLogo.on('pointerdown', () => {
            this.aboutOverlay?.openModal();
        });
        this.titleLogo.on('pointerover', () => {
            this.tweens.killTweensOf(this.titleLogo);
            this.tweens.add({
                targets: this.titleLogo,
                scaleX: this.logoScale * 1.04,
                scaleY: this.logoScale * 1.04,
                duration: 180,
                ease: 'Sine.easeOut'
            });
        });
        this.titleLogo.on('pointerout', () => {
            this.tweens.killTweensOf(this.titleLogo);
            this.tweens.add({
                targets: this.titleLogo,
                scaleX: this.logoScale,
                scaleY: this.logoScale,
                duration: 180,
                ease: 'Sine.easeOut'
            });
        });

        this.setupMenuImpactListener();
        this.buildRunMemoryPanel(width, height);
        this.buildAboutOverlay(width, height);
        this.createAudioSettings(width, height);

        this.startBtnContainer = UI.createChunkyButton(this, width / 2, -220, 340, 92, 'NEW RUN', () => {
            UI.enterImmersiveFullscreen(this);
            this.scene.start('DirectorSelectScene');
        });
        this.memoryBtnContainer = UI.createChunkyButton(this, width / 2, -360, 300, 76, 'REEL ARCHIVE', () => {
            this.toggleRunMemory(width, height);
        });

        this.uiContainer.add([this.startBtnContainer, this.memoryBtnContainer]);
        this.startBtnContainer.setAlpha(0);
        this.memoryBtnContainer.setAlpha(0);

        this.startButtonVisualBody = this.bgScene.matter.add.gameObject(this.startBtnContainer, {
            restitution: 0.72,
            friction: 0.02,
            frictionAir: 0.015,
            density: 0.0015,
            collisionFilter: {
                category: this.bgScene.CAT_UI,
                mask: this.bgScene.CAT_UI | this.bgScene.CAT_BALL // Collide with stoppers and balls (if we want them to hit)
            }
        }).setFixedRotation();
        this.memoryButtonVisualBody = this.bgScene.matter.add.gameObject(this.memoryBtnContainer, {
            restitution: 0.72,
            friction: 0.02,
            frictionAir: 0.015,
            density: 0.0015,
            collisionFilter: {
                category: this.bgScene.CAT_UI,
                mask: this.bgScene.CAT_UI | this.bgScene.CAT_BALL // Collide with stoppers and balls
            }
        }).setFixedRotation();

        this.setButtonEnabled(this.startBtnContainer, false);
        this.setButtonEnabled(this.memoryBtnContainer, false);

        // TRIGGER INTRO IMMEDIATELY
        this.playMenuIntroSequence();

        this.events.once('shutdown', () => {
            this.cleanupPersistentMenuBodies();
            this.cleanupMenuWorldBodies();
            
            if (this.menuImpactHandler && this.bgScene && this.bgScene.matter && this.bgScene.matter.world) {
                this.bgScene.matter.world.off('collisionstart', this.menuImpactHandler);
            }
            this.startButtonVisualBody = null;
            this.memoryButtonVisualBody = null;
            this.titleLogo?.removeAllListeners();
            this.titleLogo?.destroy();
        });
    }

    cleanupPersistentMenuBodies() {
        if (!this.bgScene?.matter?.world?.localWorld) {
            return;
        }

        const MatterLib = Phaser.Physics.Matter.Matter;
        const bodies = MatterLib.Composite.allBodies(this.bgScene.matter.world.localWorld);
        const removableLabels = new Set(['menu_logo']);

        bodies.forEach((body) => {
            if (!removableLabels.has(body.label)) {
                return;
            }

            const gameObject = body.gameObject;
            if (gameObject && !gameObject.destroyed) {
                gameObject.destroy();
            } else {
                this.bgScene.matter.world.remove(body);
            }
        });
    }

    cleanupMenuWorldBodies() {
        if (this.startButtonBody) {
            this.bgScene?.matter?.world?.remove(this.startButtonBody);
            this.startButtonBody = null;
        }

        if (this.memoryButtonBody) {
            this.bgScene?.matter?.world?.remove(this.memoryButtonBody);
            this.memoryButtonBody = null;
        }
    }

    createMenuBounds(width, height) {
        const invisible = { isStatic: true, render: { visible: false } };
        const thickness = 60; // Match CabinetScene bezel
        this.bgScene.matter.add.rectangle(width / 2, height - 10, width + 400, 40, { ...invisible, label: 'menu_floor' });
        this.bgScene.matter.add.rectangle(thickness - 10, height / 2, 40, height * 2, { ...invisible, label: 'menu_wall' });
        this.bgScene.matter.add.rectangle(width - thickness + 10, height / 2, 40, height * 2, { ...invisible, label: 'menu_wall' });
    }

    createDustParticles(width, height) {
        if (!this.textures.exists('menu_dust_square')) {
            const dustGraphic = this.make.graphics({ x: 0, y: 0, add: false });
            dustGraphic.fillStyle(0xffffff, 1);
            dustGraphic.fillRect(0, 0, 6, 6);
            dustGraphic.generateTexture('menu_dust_square', 6, 6);
        }

        this.dustEmitter = this.add.particles(0, 0, 'menu_dust_square', {
            x: { min: 0, max: width },
            y: height + 24,
            lifespan: 7000,
            speedY: { min: -28, max: -10 },
            speedX: { min: -8, max: 8 },
            angle: { min: 250, max: 290 },
            scale: { start: 1.2, end: 0.2 },
            alpha: { start: 0.32, end: 0 },
            tint: [0xff8800, 0xffaa33, 0xffd166],
            quantity: 1,
            frequency: 180,
            blendMode: Phaser.BlendModes.ADD
        });
        this.dustEmitter.setDepth(70);
    }

    setupMenuImpactListener() {
        this.menuImpactHandler = (event) => {
            if (this.hasMenuImpact) {
                return;
            }

            for (const pair of event.pairs) {
                const labelA = pair.bodyA.label;
                const labelB = pair.bodyB.label;
                const hitTitle = labelA === 'menu_logo' || labelB === 'menu_logo';
                const hitLanding = labelA === 'menu_floor' || labelB === 'menu_floor';

                if (hitTitle && hitLanding) {
                    this.hasMenuImpact = true;
                    this.cameras.main.shake(150, 0.01);
                    return;
                }
            }
        };

        this.bgScene.matter.world.on('collisionstart', this.menuImpactHandler);
    }

    playMenuIntroSequence() {
        if (this.menuIntroStarted) {
            return;
        }

        this.menuIntroStarted = true;
        const settings = GameState.getAudioSettings(this);
        const bgm = this.sound.get('bgm');
        if (!this.sound.mute && this.cache.audio.exists('sfx_title')) {
            this.sound.play('sfx_title', { volume: 0.9 * (settings.sfxVolume ?? 1) });
        }

        if (bgm && !this.sound.mute) {
            if (bgm.isPaused) {
                bgm.resume();
            } else if (!bgm.isPlaying) {
                bgm.play();
            }
        }

        this.tweens.add({
            targets: this.titleImage,
            scaleX: this.titleScale,
            scaleY: this.titleScale,
            duration: 300,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                this.revealMenuButtons(this.scale.height);
                this.startSubtlePulse();
            }
        });
    }

    startSubtlePulse() {
        if (this.titlePulseStarted) return;
        this.titlePulseStarted = true;

        this.tweens.add({
            targets: this.titleLogo,
            scaleX: this.logoScale * 1.02,
            scaleY: this.logoScale * 1.02,
            duration: 2500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.tweens.add({
            targets: this.titleImage,
            scaleX: this.titleScale * 1.01,
            scaleY: this.titleScale * 1.01,
            duration: 2600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    update() {
        if (this.titleLogo?.body && !this.titleLogo.body.isStatic) {
            const velocity = this.titleLogo.body.velocity;
            const speed = Math.sqrt((velocity.x ** 2) + (velocity.y ** 2));

            if (speed < 2.5) {
                const boostAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                this.titleLogo.applyForce({
                    x: Math.cos(boostAngle) * 0.0025,
                    y: Math.sin(boostAngle) * 0.0025
                });
            }
        }
    }

    revealMenuButtons(height) {
        if (this.menuButtonsRevealed) {
            return;
        }

        this.menuButtonsRevealed = true;
        this.setButtonEnabled(this.startBtnContainer, true);
        this.setButtonEnabled(this.memoryBtnContainer, true);

        if (this.startButtonVisualBody) {
            this.startButtonVisualBody.setVelocity(Phaser.Math.FloatBetween(-1.2, 1.2), Phaser.Math.FloatBetween(0.8, 2.2));
            this.startButtonVisualBody.setAngularVelocity(Phaser.Math.FloatBetween(-0.01, 0.01));
        }
        if (this.memoryButtonVisualBody) {
            this.memoryButtonVisualBody.setVelocity(Phaser.Math.FloatBetween(-1.2, 1.2), Phaser.Math.FloatBetween(0.8, 2.2));
            this.memoryButtonVisualBody.setAngularVelocity(Phaser.Math.FloatBetween(-0.01, 0.01));
        }

        this.tweens.add({
            targets: this.startBtnContainer,
            alpha: 1,
            y: height * 0.66,
            duration: 500, // Faster
            ease: 'Cubic.easeOut'
        });

        this.tweens.add({
            targets: this.memoryBtnContainer,
            alpha: 1,
            y: height * 0.66 + 110,
            duration: 550, // Faster
            delay: 100,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                this.createButtonPhysicsBodies(height);
                this.syncMenuButtonBodies(height);
            }
        });
    }

    createButtonPhysicsBodies(height) {
        const startY = height * 0.66;
        const memoryY = height * 0.66 + 110;
        const centerX = this.scale.width / 2;

        if (!this.startButtonBody) {
            this.startButtonBody = this.bgScene.matter.add.rectangle(centerX, startY, 340, 92, {
                isStatic: true,
                restitution: 0.95,
                friction: 0,
                frictionStatic: 0,
                label: 'menu_button',
                collisionFilter: {
                    category: this.bgScene.CAT_UI,
                    mask: this.bgScene.CAT_UI // ONLY collide with visual buttons
                }
            });
        } else {
            this.bgScene.matter.body.setPosition(this.startButtonBody, { x: centerX, y: startY });
        }

        if (!this.memoryButtonBody) {
            this.memoryButtonBody = this.bgScene.matter.add.rectangle(centerX, memoryY, 280, 76, {
                isStatic: true,
                restitution: 0.95,
                friction: 0,
                frictionStatic: 0,
                label: 'menu_button',
                collisionFilter: {
                    category: this.bgScene.CAT_UI,
                    mask: this.bgScene.CAT_UI // ONLY collide with visual buttons
                }
            });
        } else {
            this.bgScene.matter.body.setPosition(this.memoryButtonBody, { x: centerX, y: memoryY });
        }
    }

    syncMenuButtonBodies(height) {
        const startY = height * 0.66;
        const memoryY = height * 0.66 + 110;
        const centerX = this.scale.width / 2;

        if (this.startButtonVisualBody?.body) {
            this.bgScene.matter.body.setPosition(this.startButtonVisualBody.body, { x: centerX, y: startY - 120 });
            this.bgScene.matter.body.setVelocity(this.startButtonVisualBody.body, { x: Phaser.Math.FloatBetween(-0.8, 0.8), y: 1.8 });
        }

        if (this.memoryButtonVisualBody?.body) {
            this.bgScene.matter.body.setPosition(this.memoryButtonVisualBody.body, { x: centerX, y: memoryY - 140 });
            this.bgScene.matter.body.setVelocity(this.memoryButtonVisualBody.body, { x: Phaser.Math.FloatBetween(-0.8, 0.8), y: 2.1 });
        }
    }

    setButtonEnabled(button, enabled) {
        const hitTarget = button?.hitTarget || button;

        if (hitTarget?.input) {
            hitTarget.input.enabled = enabled;
        }
    }

    buildRunMemoryPanel(width, height) {
        this.runMemoryContainer = this.add.container(width, 0);
        this.runMemoryContainer.setDepth(200);
        this.runMemoryContainer.setVisible(false);
        this.memoryOpen = false;
        this.currentArchiveTab = 'library';

        this.memoryCardItems = [];
        this.memoryCardIndex = 0;

        const bg = this.add.rectangle(0, 0, width, height, 0x050505, 0.995).setOrigin(0, 0);

        const title = this.add.text(width / 2, 110, 'REEL ARCHIVE', {
            fontSize: '72px',
            fontFamily: '"VT323", monospace',
            color: '#ffcc00',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5);

        // Tab Buttons
        const tabY = 190;
        this.libraryTabBtn = UI.createChunkyButton(this, width / 2 - 160, tabY, 300, 60, 'FILM LIBRARY', () => {
            this.switchArchiveTab('library');
        });
        this.achievementsTabBtn = UI.createChunkyButton(this, width / 2 + 160, tabY, 300, 60, 'ACHIEVEMENTS', () => {
            this.switchArchiveTab('achievements');
        });

        // Tab Indicators (Underlines)
        this.libraryTabIndicator = this.add.rectangle(width / 2 - 160, tabY + 35, 280, 4, 0xffcc00).setVisible(true);
        this.achievementsTabIndicator = this.add.rectangle(width / 2 + 160, tabY + 35, 280, 4, 0xffcc00).setVisible(false);

        const stats = GameState.persistentStats;
        this.archiveStatsText = this.add.text(width / 2, 260,
            `FILMS CAPTURED: ${stats.totalFilmsCompleted || 0}/50   |   WINS: ${stats.wins}`, {
                fontSize: '28px',
                fontFamily: '"VT323", monospace',
                color: '#66f2ff',
                align: 'center'
            }).setOrigin(0.5);

        // 1. Library View
        this.libraryContainer = this.add.container(width / 2, 390);
        this.buildLibraryGrid(this.libraryContainer, width, height);

        // 2. Achievements View
        this.achievementsContainer = this.add.container(width / 2, 390).setVisible(false);
        this.buildAchievementsGrid(this.achievementsContainer, width, height);

        const closeBtnContainer = UI.createChunkyButton(this, width / 2, height - 140, 240, 70, 'CLOSE', () => {
            this.toggleRunMemory(width, height);
        });

        this.buildMemoryOverlay(width, height);
        this.buildAchievementOverlay(width, height);

        this.runMemoryContainer.add([
            bg, title, this.libraryTabBtn, this.achievementsTabBtn, 
            this.libraryTabIndicator, this.achievementsTabIndicator,
            this.archiveStatsText,
            this.libraryContainer, this.achievementsContainer,
            closeBtnContainer, 
            this.memoryOverlay,
            this.achievementOverlay
        ]);

        this.runMemoryContainer.setDepth(4500);
        this.runArchiveTabUpdate();
    }

    switchArchiveTab(tab) {
        if (this.currentArchiveTab === tab) return;
        this.currentArchiveTab = tab;
        this.runArchiveTabUpdate();
        
        const settings = GameState.getAudioSettings(this);
        if (!this.sound.mute && this.cache.audio.exists('sfx_ui_click')) {
            this.sound.play('sfx_ui_click', { volume: 0.5 * (settings.sfxVolume ?? 1) });
        }
    }

    runArchiveTabUpdate() {
        const isLib = this.currentArchiveTab === 'library';
        this.libraryContainer.setVisible(isLib);
        this.achievementsContainer.setVisible(!isLib);
        
        // Update indicators
        this.libraryTabIndicator.setVisible(isLib);
        this.achievementsTabIndicator.setVisible(!isLib);

        const stats = GameState.persistentStats;
        if (isLib) {
            this.archiveStatsText.setText(`FILMS CAPTURED: ${stats.totalFilmsCompleted || 0}/50   |   WINS: ${stats.wins}`);
        } else {
            const unlockedCount = Object.keys(stats.achievements || {}).length;
            this.archiveStatsText.setText(`ACHIEVEMENTS: ${unlockedCount}/${ACHIEVEMENTS.length}   |   LEGEND STATUS: ${Math.floor((unlockedCount/ACHIEVEMENTS.length)*100)}%`);
        }
    }

    buildLibraryGrid(container, width, height) {
        this.memoryCardItems = [];
        const directors = TMDB.getHardcodedDirectors();
        const campaignData = TMDB.CAMPAIGN_DATA;
        const persistentGallery = GameState.persistentGallery;

        const colWidth = 100; 
        const rowHeight = 135;
        const startX = -((6 * colWidth) / 2) + (colWidth / 2);
        const startY = 10;

        directors.forEach((director, dirIndex) => {
            const dirY = startY + (dirIndex * (rowHeight + 6));
            const films = campaignData[director.name] || [];
            const capturedCount = films.filter(f => persistentGallery.some(g => g.id === f.id)).length;
            
            const dirItem = {
                type: 'director',
                title: director.name,
                capturedCount: capturedCount,
                unlocked: capturedCount > 0,
                directorData: director,
                body: director.cinematicFact || `A legend of the silver screen.`,
                fact: director.cinematicFact
            };
            
            const dirCard = this.createMemoryGridCard(startX, dirY, colWidth - 8, rowHeight, dirItem, this.memoryCardItems.length);
            this.memoryCardItems.push(dirItem);
            container.add(dirCard);

            films.forEach((film, filmIndex) => {
                const unlocked = persistentGallery.some(g => g.id === film.id);
                const x = startX + ((filmIndex + 1) * colWidth);
                const item = {
                    type: 'film',
                    title: film.title,
                    subtitle: director.name,
                    id: film.id,
                    unlocked: unlocked,
                    body: film.overview || `A ${director.name} production.`,
                    posterPath: film.poster_path ? (film.poster_path.startsWith('http') ? film.poster_path : `https://image.tmdb.org/t/p/w500${film.poster_path}`) : null,
                    film: film
                };

                const card = this.createMemoryGridCard(x, dirY, colWidth - 8, rowHeight, item, this.memoryCardItems.length);
                this.memoryCardItems.push(item);
                container.add(card);
            });
        });
    }

    buildAchievementsGrid(container, width, height) {
        const stats = GameState.persistentStats;
        const colWidth = 155;
        const rowHeight = 175;
        const cols = 6;
        const startX = -((cols * colWidth) / 2) + (colWidth / 2);
        const startY = 10;

        ACHIEVEMENTS.forEach((ach, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            const x = startX + (col * colWidth);
            const y = startY + (row * (rowHeight + 10));
            
            const unlocked = Boolean(stats.achievements[ach.id]);
            const card = this.createAchievementCard(x, y, colWidth - 10, rowHeight, ach, unlocked);
            container.add(card);
        });
    }

    createAchievementCard(x, y, width, height, ach, unlocked) {
        const container = this.add.container(x, y);
        const bg = this.add.rectangle(0, 0, width, height, unlocked ? 0x221100 : 0x111111, 0.95)
            .setStrokeStyle(3, unlocked ? 0xffcc00 : 0x333333);
        
        const icon = this.add.circle(0, -30, 40, unlocked ? 0xffcc00 : 0x222222)
            .setStrokeStyle(4, unlocked ? 0xffffff : 0x444444);
        
        const iconLabel = this.add.text(0, -30, ach.id.includes('DIR') ? 'DIR' : '★', {
            fontSize: '32px',
            fontFamily: '"VT323", monospace',
            color: unlocked ? '#000000' : '#444444'
        }).setOrigin(0.5);

        const titleText = this.add.text(0, 45, (unlocked ? ach.title : '????').toUpperCase(), {
            fontSize: '14px',
            fontFamily: '"VT323", monospace',
            color: unlocked ? '#ffffff' : '#666666',
            align: 'center',
            wordWrap: { width: width - 10 }
        }).setOrigin(0.5);

        const hitArea = this.add.rectangle(0, 0, width, height, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
        
        container.add([bg, icon, iconLabel, titleText, hitArea]);
        
        UI.makeSquishyButton(this, container, () => {
            this.openAchievementDetails(ach, unlocked);
        }, { hitTarget: hitArea });

        return container;
    }

    buildAchievementOverlay(width, height) {
        this.achievementOverlay = this.add.container(width / 2, height / 2).setDepth(5100).setVisible(false);
        const dim = this.add.rectangle(0, 0, width * 2, height * 2, 0x000000, 0.9).setInteractive();
        const panel = this.add.rectangle(0, 0, 600, 400, 0x17110b, 0.98).setStrokeStyle(5, 0xffaa00);
        
        this.achDetailTitle = this.add.text(0, -120, '', {
            fontSize: '48px',
            fontFamily: '"VT323", monospace',
            color: '#ffcc00',
            align: 'center',
            wordWrap: { width: 500 }
        }).setOrigin(0.5);

        this.achDetailDesc = this.add.text(0, 20, '', {
            fontSize: '32px',
            fontFamily: '"VT323", monospace',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: 500 }
        }).setOrigin(0.5);

        this.achDetailStatus = this.add.text(0, 100, '', {
            fontSize: '24px',
            fontFamily: '"VT323", monospace',
            color: '#ffaa00'
        }).setOrigin(0.5);

        const closeBtn = UI.createChunkyButton(this, 0, 160, 180, 60, 'CLOSE', () => {
            this.achievementOverlay.setVisible(false);
        });

        dim.on('pointerdown', () => this.achievementOverlay.setVisible(false));
        this.achievementOverlay.add([dim, panel, this.achDetailTitle, this.achDetailDesc, this.achDetailStatus, closeBtn]);
    }

    openAchievementDetails(ach, unlocked) {
        this.achDetailTitle.setText((unlocked ? ach.title : 'LOCKED ACHIEVEMENT').toUpperCase());
        this.achDetailDesc.setText(unlocked ? ach.desc : 'Condition has not yet been met.');
        
        if (unlocked) {
            const date = new Date(GameState.persistentStats.achievements[ach.id]);
            this.achDetailStatus.setText(`UNLOCKED: ${date.toLocaleDateString()}`);
            this.achDetailStatus.setColor('#00ff88');
        } else {
            this.achDetailStatus.setText('STATUS: ENCRYPTED');
            this.achDetailStatus.setColor('#ff4444');
        }

        this.achievementOverlay.setVisible(true);
        
        const settings = GameState.getAudioSettings(this);
        if (!this.sound.mute && this.cache.audio.exists('sfx_ui_click')) {
            this.sound.play('sfx_ui_click', { volume: 0.6 * (settings.sfxVolume ?? 1) });
        }
    }

    toggleRunMemory(width, height) {
        this.memoryOpen = !this.memoryOpen;

        if (this.memoryOpen) {
            this.runMemoryContainer.setVisible(true);
        }

        this.tweens.add({
            targets: this.runMemoryContainer,
            x: this.memoryOpen ? 0 : width,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                if (!this.memoryOpen) {
                    this.runMemoryContainer.setVisible(false);
                }
            }
        });
    }

    createAudioSettings(width, height) {
        this.settingsOverlay = UI.createSettingsOverlay(this);
        const { x, y } = UI.getSettingsButtonPosition(this);
        this.settingsBtn = UI.createSettingsButton(this, x, y, () => {
            const settings = GameState.getAudioSettings(this);
            if (!this.sound.mute && this.cache.audio.exists('sfx_gear')) {
                this.sound.play('sfx_gear', { volume: 0.8 * (settings.sfxVolume ?? 1) });
            }
            this.settingsOverlay.openModal();
        });

        this.uiContainer.add(this.settingsBtn);
    }

    buildAboutOverlay(width, height) {
        const container = this.add.container(width / 2, height / 2).setDepth(4600).setVisible(false);
        const backdrop = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.86)
            .setInteractive()
            .setDepth(4599)
            .setVisible(false);

        const panel = this.add.rectangle(0, 0, 620, 540, 0x120b06).setStrokeStyle(4, 0xffaa00);
        const title = this.add.text(0, -220, 'pa-kino SUPER', {
            fontSize: '48px',
            fontFamily: '"VT323", monospace',
            color: '#ffcc00'
        }).setOrigin(0.5);

        const body = this.add.text(0, -70,
            'Tuesday Cinema Games presents pa-kino SUPER: a high-stakes Cinematic Pachinko Roguelite. Draft legendary directors, manage your production budget, and master the physics of the "Oscar" pegs in a quest for cinematic immortality.', {
                fontSize: '28px',
                fontFamily: '"VT323", monospace',
                color: '#f0e4c8',
                align: 'center',
                lineSpacing: 8,
                wordWrap: { width: 520 }
            }).setOrigin(0.5);

        const linkLabel = this.add.text(0, 60, 'LINK:', {
            fontSize: '24px',
            fontFamily: '"VT323", monospace',
            color: '#66f2ff'
        }).setOrigin(0.5);

        const linkBtn = UI.createChunkyButton(this, 0, 120, 430, 70, 'TUESDAY CINEMA CLUB', () => {
            window.open('https://linktr.ee/Tuesday_Cinema_Club', '_blank', 'noopener,noreferrer');
        }, 'OPEN LINKTR.EE');

        const closeBtn = UI.createChunkyButton(this, 0, 200, 220, 60, 'CLOSE', () => {
            container.closeModal();
        });

        container.add([panel, title, body, linkLabel, linkBtn, closeBtn]);
        container.bg = backdrop;
        container.openModal = () => {
            backdrop.setVisible(true);
            container.setVisible(true);
        };
        container.closeModal = () => {
            backdrop.setVisible(false);
            container.setVisible(false);
        };
        backdrop.on('pointerdown', () => container.closeModal());
        this.aboutOverlay = container;
    }

    buildDirectorMemoryCards() {
        const cinematicFacts = {
            'Akira Kurosawa': 'Built action through weather, movement, and dynamic blocking.',
            'Agnès Varda': 'Turned observation into play, intimacy, and cinematic essay.',
            'Satyajit Ray': 'Found emotional scale in human detail and quiet rhythm.',
            'Spike Lee': 'Charged frames with political urgency and direct address.',
            'Jane Campion': 'Balances raw interiority with tactile, dangerous beauty.',
            'Bong Joon-ho': 'Slides between genre gears without losing human stakes.',
            'Guillermo del Toro': 'Makes monsters tender and fairy tales bruised.',
            'John Singleton': 'Brought neighborhood specificity to mainstream scale.',
            'Ava DuVernay': 'Builds moral momentum through ensemble clarity and focus.',
            'Chloe Zhao': 'Lets landscape and performance breathe into each other.'
        };

        return Object.entries(cinematicFacts)
            .filter(([directorName]) => GameState.getDirectorMilestoneCount(directorName) > 0)
            .map(([directorName, fact]) => ({
                type: 'director',
                title: directorName,
                subtitle: `${GameState.getDirectorMilestoneCount(directorName)}/5 DOSSIER DOTS`,
                body: fact,
                fact
            }));
    }

    createMemoryGridCard(x, y, width, height, item, index) {
        const container = this.add.container(x, y);
        const unlocked = item.unlocked;
        const isDirector = item.type === 'director';
        const capturedCount = item.capturedCount || 0;
        
        // Background with better contrast
        const bg = this.add.rectangle(0, 0, width, height, 
            isDirector ? (unlocked ? 0x331100 : 0x111) : (unlocked ? 0x000 : 0x151515), 
            0.95)
            .setStrokeStyle(isDirector ? 4 : 2, unlocked ? (isDirector ? 0xffcc00 : 0xffaa00) : 0x333333);
        
        const hitArea = this.add.rectangle(0, 0, width, height, 0xffffff, 0.001);
        
        // Progression logic for Director Card
        let displayText = '';
        if (isDirector) {
            if (capturedCount > 0) {
                // Reveal full name as soon as any film is unlocked
                displayText = item.title;
                
                // Add biographical lines based on progression
                if (capturedCount >= 2) displayText += `\n${item.directorData?.born || ''}`;
                if (capturedCount >= 3) displayText += `\n${item.directorData?.place || ''}`;
                if (capturedCount >= 4) displayText += `\nBIO UNLOCKED`;
                
                // If nothing else to show, show progress
                if (capturedCount < 4) {
                    displayText += `\nREELS: ${capturedCount}/5`;
                }
            } else {
                displayText = '????';
            }
        } else if (unlocked) {
            // No truncation, use full title with wrapping
            displayText = item.title;
        } else {
            displayText = '????';
        }

        const titleText = this.add.text(0, 0, displayText.toUpperCase(), {
            fontSize: '12px',
            fontFamily: '"VT323", monospace',
            color: (isDirector ? (capturedCount > 0) : unlocked) ? '#ffffff' : '#444444',
            align: 'center',
            wordWrap: { width: width - 10 }
        }).setOrigin(0.5).setDepth(30);

        // Thumbnail for unlocked films or 5/5 directors
        const showThumb = (!isDirector && unlocked && item.posterPath) || (isDirector && capturedCount >= 5);
        if (showThumb) {
            // Prefer the BootScene-preloaded texture (poster_<id>) to avoid re-fetching
            const preloadedKey = item.id ? `poster_${item.id}` : null;
            const thumbKey = isDirector
                ? 'director_portraits'
                : (preloadedKey && this.textures.exists(preloadedKey) ? preloadedKey : `thumb_${item.id || item.title}`);

            const handleThumbReady = () => {
                if (container && container.scene) {
                    // Safety check to ensure we don't add duplicate thumbs
                    if (container.getData('hasThumb')) return;

                    const thumb = this.add.sprite(0, 0, isDirector ? 'director_portraits' : thumbKey);
                    if (isDirector) {
                        thumb.setFrame(item.directorData.portraitFrame || 0);
                    }
                    thumb.setDisplaySize(width, height).setAlpha(isDirector ? 1 : 0.85);
                    container.add(thumb);
                    thumb.setDepth(5);
                    container.setData('hasThumb', true);

                    titleText.setStroke('#000', 8);
                    if (isDirector) {
                        titleText.setY(height/2 - 18);
                        titleText.setFontSize('9px');
                    }
                }
            };

            if (isDirector || this.textures.exists(thumbKey)) {
                handleThumbReady();
            } else if (item.posterPath) {
                this.load.crossOrigin = 'anonymous';
                this.load.image(thumbKey, item.posterPath);
                this.load.once(`filecomplete-image-${thumbKey}`, handleThumbReady);
                this.load.start();
            }
        }

        // Indicators for captured films
        if (isDirector) {
            // Move dots to the TOP of the card for maximum visibility
            for (let i = 0; i < 5; i++) {
                const dotX = -width/2 + 25 + (i * 12);
                const dotY = -height/2 + 15; // Top of card
                const active = i < capturedCount;
                const dot = this.add.circle(dotX, dotY, 4, active ? 0xffea00 : 0x000000)
                    .setStrokeStyle(2, 0xffffff)
                    .setDepth(20);
                container.add(dot);
            }
        } else if (unlocked) {
            const indicator = this.add.circle(width / 2 - 8, -height / 2 + 8, 4, 0x00ff88)
                .setStrokeStyle(1, 0x000000)
                .setDepth(20);
            container.add(indicator);
        }

        container.add([bg, hitArea, titleText]);
        container.setSize(width, height);
        
        hitArea.setInteractive({ useHandCursor: true });
        
        UI.makeSquishyButton(this, container, () => {
            if (!unlocked) {
                this.cameras.main.shake(80, 0.001);
                return;
            }
            this.openMemoryCard(index);
        }, { hitTarget: hitArea, suppressAutoSfx: false });

        return container;
    }

    buildMemoryOverlay(width, height) {
        this.memoryOverlay = this.add.container(width / 2, height / 2).setDepth(5000).setVisible(false);
        const dim = this.add.rectangle(0, 0, width * 2, height * 2, 0x000000, 0.88).setInteractive();
        const panel = this.add.rectangle(0, 0, 760, 980, 0x17110b, 0.98).setStrokeStyle(5, 0xffaa00);
        this.memoryCardTitle = this.add.text(0, -420, '', {
            fontSize: '52px',
            fontFamily: '"VT323", monospace',
            color: '#ffcc00',
            align: 'center',
            wordWrap: { width: 620 }
        }).setOrigin(0.5);
        this.memoryCardSubtitle = this.add.text(0, -360, '', {
            fontSize: '28px',
            fontFamily: '"VT323", monospace',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        this.memoryCardPoster = this.add.rectangle(0, -120, 320, 460, 0x2a2a2a).setStrokeStyle(4, 0xffcc66);
        this.memoryCardPosterText = this.add.text(0, -120, '', {
            fontSize: '28px',
            fontFamily: '"VT323", monospace',
            color: '#221100',
            align: 'center',
            wordWrap: { width: 260 }
        }).setOrigin(0.5);
        this.memoryCardBody = this.add.text(0, 250, '', {
            fontSize: '28px',
            fontFamily: '"VT323", monospace',
            color: '#f5e7c5',
            align: 'center',
            wordWrap: { width: 620 },
            lineSpacing: 10
        }).setOrigin(0.5, 0.5);

        this.memoryPrevBtn = UI.createChunkyButton(this, -180, 420, 80, 60, '<', () => this.stepMemoryCard(-1));
        this.memoryNextBtn = UI.createChunkyButton(this, 180, 420, 80, 60, '>', () => this.stepMemoryCard(1));
        
        this.memoryPrevUnlockedBtn = UI.createChunkyButton(this, -290, 420, 100, 60, '<< UNL', () => this.stepUnlockedMemoryCard(-1));
        this.memoryNextUnlockedBtn = UI.createChunkyButton(this, 290, 420, 100, 60, 'UNL >>', () => this.stepUnlockedMemoryCard(1));
        
        const closeBtn = UI.createChunkyButton(this, 0, 420, 180, 60, 'CLOSE', () => {
            this.memoryOverlay.setVisible(false);
        });

        dim.on('pointerdown', () => this.memoryOverlay.setVisible(false));
        this.memoryOverlay.add([
            dim,
            panel,
            this.memoryCardTitle,
            this.memoryCardSubtitle,
            this.memoryCardPoster,
            this.memoryCardPosterText,
            this.memoryCardBody,
            this.memoryPrevBtn,
            this.memoryNextBtn,
            this.memoryPrevUnlockedBtn,
            this.memoryNextUnlockedBtn,
            closeBtn
        ]);
    }

    openMemoryCard(index) {
        if (!this.memoryCardItems.length) {
            return;
        }
        this.memoryCardIndex = Phaser.Math.Wrap(index, 0, this.memoryCardItems.length);
        this.renderMemoryCard();
        this.memoryOverlay.setVisible(true);
    }

    stepMemoryCard(direction) {
        if (!this.memoryCardItems.length) {
            return;
        }
        this.memoryCardIndex = Phaser.Math.Wrap(this.memoryCardIndex + direction, 0, this.memoryCardItems.length);
        this.renderMemoryCard();
    }

    stepUnlockedMemoryCard(direction) {
        if (!this.memoryCardItems.length) {
            return;
        }

        let nextIndex = this.memoryCardIndex;
        for (let i = 0; i < this.memoryCardItems.length; i++) {
            nextIndex = Phaser.Math.Wrap(nextIndex + direction, 0, this.memoryCardItems.length);
            if (this.memoryCardItems[nextIndex].unlocked) {
                this.memoryCardIndex = nextIndex;
                this.renderMemoryCard();
                return;
            }
        }
    }

    renderMemoryCard() {
        const item = this.memoryCardItems[this.memoryCardIndex];
        if (!item) return;

        const isDirector = item.type === 'director';
        const capturedCount = item.capturedCount || 0;
        const isUnlocked = isDirector ? (capturedCount > 0) : item.unlocked;

        const countText = isDirector ? `[DIRECTOR]` : `[#${this.memoryCardIndex + 1}/50]`;
        const titleText = isUnlocked ? item.title.toUpperCase() : '????';
        
        this.memoryCardTitle.setText(`${countText} ${titleText}`);
        this.memoryCardSubtitle.setText(item.subtitle ? item.subtitle.toUpperCase() : '');
        
        let bodyText = item.body || item.fact || 'No note recorded.';
        if (isDirector) {
            // Progressive Dossier reveal
            const dob = capturedCount >= 2 ? (item.directorData?.born || '???') : '??????????';
            const place = capturedCount >= 3 ? (item.directorData?.place || '???') : '??????????';
            const bio = capturedCount >= 4 ? (item.directorData?.bio || item.body) : 'DATA ENCRYPTED - CAPTURE MORE REELS TO UNLOCK BIOGRAPHICAL RECORDS.';
            bodyText = `BORN: ${dob}\nLOCATION: ${place}\n\nDOSSIER:\n${bio}`;
        }
        this.memoryCardBody.setText(bodyText);

        if (this.memoryPosterImage) {
            this.memoryPosterImage.destroy();
            this.memoryPosterImage = null;
        }

        // Show photo for films OR mastered directors
        const showPhoto = (!isDirector && item.posterPath) || (isDirector && capturedCount >= 5);
        
        if (showPhoto) {
            if (isDirector) {
                this.memoryPosterImage = this.add.sprite(0, -120, 'director_portraits').setOrigin(0.5);
                this.memoryPosterImage.setFrame(item.directorData.portraitFrame || 0);
                this.memoryPosterImage.setDisplaySize(310, 450);
                this.memoryOverlay.add(this.memoryPosterImage);
                this.memoryCardPosterText.setText('');
            } else {
                // Prefer BootScene-preloaded texture (poster_<id>) before dynamic fetch
                const preloadedKey = item.film?.id ? `poster_${item.film.id}` : null;
                const key = (preloadedKey && this.textures.exists(preloadedKey))
                    ? preloadedKey
                    : `memory_card_${item.type}_${item.film?.id || item.title}`;

                if (!this.textures.exists(key)) {
                    this.load.crossOrigin = 'anonymous';
                    this.load.image(key, item.posterPath);
                    this.load.once('complete', () => {
                        if (this.memoryCardItems[this.memoryCardIndex] === item) {
                            this.renderMemoryCard();
                        }
                    });
                    this.load.start();
                    this.memoryCardPosterText.setText('LOADING...');
                    return;
                }

                this.memoryPosterImage = this.add.image(0, -120, key).setOrigin(0.5);
                const scale = Math.min(310 / this.memoryPosterImage.width, 450 / this.memoryPosterImage.height);
                this.memoryPosterImage.setScale(scale);
                this.memoryOverlay.add(this.memoryPosterImage);
                this.memoryCardPosterText.setText('');
            }
        } else {
            this.memoryCardPosterText.setText(isDirector ? 'PORTRAIT ENCRYPTED' : 'NO POSTER DATA');
        }
    }

    fitTitle(title, maxLen = 14) {
        if (title.length <= maxLen) {
            return title.toUpperCase();
        }
        return `${title.slice(0, maxLen - 2).toUpperCase()}..`;
    }

    truncateOverview(text) {
        const clean = (text || '').replace(/\s+/g, ' ').trim();
        if (clean.length <= 220) {
            return clean;
        }
        return `${clean.slice(0, 217).trim()}...`;
    }
}
