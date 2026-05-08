import Phaser from 'phaser';
import { GameState } from '../GameState.js';
import { UI } from '../utils/UI.js';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
        this.hasMenuImpact = false;
        this.menuIntroStarted = false;
        this.menuButtonsRevealed = false;
    }

    preload() {
        this.load.image('tcc_logo', '/assets/images/Logo.jpg');
        this.load.image('gametitle', '/assets/images/gametitle.png');
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

        this.titleBumper = this.bgScene.matter.add.rectangle(width / 2, height - 210, 300, 110, {
            isStatic: true,
            restitution: 0.92,
            friction: 0.05,
            label: 'menu_bumper'
        });
        this.titleLogo = this.bgScene.matter.add.image(width / 2, -300, 'tcc_logo', null, {
            restitution: 0.7,
            friction: 0.03,
            frictionAir: 0.002,
            density: 0.0012,
            label: 'menu_logo'
        });
        this.titleLogo.setOrigin(0.5);
        this.logoScale = 240 / this.titleLogo.width;
        this.titleLogo.setScale(this.logoScale);
        this.titleLogo.setDepth(95);
        this.titleLogo.setAngularVelocity(Phaser.Math.FloatBetween(-0.15, 0.15));
        this.titleLogo.setVelocity(
            Phaser.Math.FloatBetween(-3, 3),
            Phaser.Math.FloatBetween(6, 12) // Faster drop
        );

        this.setupMenuImpactListener();
        this.buildRunMemoryPanel(width, height);
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
        
        // Add physics to buttons in the Background world
        this.bgScene.matter.add.gameObject(this.startBtnContainer, { restitution: 0.6, friction: 0.1 }).setFixedRotation();
        this.bgScene.matter.add.gameObject(this.memoryBtnContainer, { restitution: 0.6, friction: 0.1 }).setFixedRotation();
        
        this.setButtonEnabled(this.startBtnContainer, false);
        this.setButtonEnabled(this.memoryBtnContainer, false);

        // TRIGGER INTRO IMMEDIATELY
        this.playMenuIntroSequence();

        this.events.once('shutdown', () => {
            if (this.menuImpactHandler && this.bgScene && this.bgScene.matter && this.bgScene.matter.world) {
                this.bgScene.matter.world.off('collisionstart', this.menuImpactHandler);
            }
        });
    }

    cleanupPersistentMenuBodies() {
        if (!this.bgScene?.matter?.world?.localWorld) {
            return;
        }

        const MatterLib = Phaser.Physics.Matter.Matter;
        const bodies = MatterLib.Composite.allBodies(this.bgScene.matter.world.localWorld);
        const removableLabels = new Set(['menu_logo', 'menu_bumper']);

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
            this.matter.world.remove(this.startButtonBody);
            this.startButtonBody = null;
        }

        if (this.memoryButtonBody) {
            this.matter.world.remove(this.memoryButtonBody);
            this.memoryButtonBody = null;
        }

        if (this.startButtonSpacer) {
            this.matter.world.remove(this.startButtonSpacer);
            this.startButtonSpacer = null;
        }

        if (this.memoryButtonSpacer) {
            this.matter.world.remove(this.memoryButtonSpacer);
            this.memoryButtonSpacer = null;
        }
    }

    createMenuBounds(width, height) {
        const invisible = { isStatic: true, render: { visible: false } };
        const thickness = 60; // Match CabinetScene bezel
        this.bgScene.matter.add.rectangle(width / 2, height - thickness + 10, width + 400, 40, { ...invisible, label: 'menu_floor' });
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
                const hitLanding = ['menu_floor', 'menu_bumper'].includes(labelA) || ['menu_floor', 'menu_bumper'].includes(labelB);

                if (hitTitle && hitLanding) {
                    this.hasMenuImpact = true;
                    this.cameras.main.shake(150, 0.01);
                    this.playMenuIntroSequence();
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
            onComplete: () => this.createButtonPhysicsBodies(height)
        });
    }

    createButtonPhysicsBodies(height) {
        const startY = height * 0.66;
        const memoryY = height * 0.66 + 110;
        const centerX = this.scale.width / 2;

        if (!this.startButtonBody) {
            this.startButtonBody = this.matter.add.rectangle(centerX, startY, 340, 92, {
                isStatic: true,
                restitution: 0.95,
                friction: 0,
                frictionStatic: 0,
                label: 'menu_button'
            });
        } else {
            this.matter.body.setPosition(this.startButtonBody, { x: centerX, y: startY });
        }

        if (!this.memoryButtonBody) {
            this.memoryButtonBody = this.matter.add.rectangle(centerX, memoryY, 280, 76, {
                isStatic: true,
                restitution: 0.95,
                friction: 0,
                frictionStatic: 0,
                label: 'menu_button'
            });
        } else {
            this.matter.body.setPosition(this.memoryButtonBody, { x: centerX, y: memoryY });
        }

        if (!this.startButtonSpacer) {
            this.startButtonSpacer = this.matter.add.rectangle(centerX, startY + 56, 430, 14, {
                isStatic: true,
                restitution: 0.98,
                friction: 0,
                frictionStatic: 0,
                label: 'menu_button_spacer',
                render: { visible: false }
            });
        } else {
            this.matter.body.setPosition(this.startButtonSpacer, { x: centerX, y: startY + 56 });
        }

        if (!this.memoryButtonSpacer) {
            this.memoryButtonSpacer = this.matter.add.rectangle(centerX, memoryY - 48, 360, 14, {
                isStatic: true,
                restitution: 0.98,
                friction: 0,
                frictionStatic: 0,
                label: 'menu_button_spacer',
                render: { visible: false }
            });
        } else {
            this.matter.body.setPosition(this.memoryButtonSpacer, { x: centerX, y: memoryY - 48 });
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

        this.memoryCardItems = [];
        this.memoryCardIndex = 0;

        const bg = this.add.rectangle(0, 0, width, height, 0x111111, 0.98).setOrigin(0, 0);
        const title = this.add.text(width / 2, 80, 'REEL ARCHIVE', {
            fontSize: '80px',
            fontFamily: '"VT323", monospace',
            color: '#ffcc00'
        }).setOrigin(0.5);

        const stats = GameState.persistentStats;
        const statsPanelBg = this.add.graphics();
        statsPanelBg.fillStyle(0x000000, 0.7);
        statsPanelBg.fillRoundedRect(width / 2 - 410, 150, 820, 210, 16);

        const statsText = this.add.text(width / 2, 220,
            `LIFETIME SCORE: ${GameState.formatMillions(stats.lifetimeScore || 0)}   |   BEST PRODUCTION: ${GameState.formatMillions(GameState.getBestProduction())}\n` +
            `FILMS COMPLETED: ${stats.totalFilmsCompleted || 0}   |   REELS DROPPED: ${stats.totalReelsDropped || 0}\n` +
            `RUNS: ${stats.totalRuns}   |   WINS: ${stats.wins}   |   DIRECTORS WITH MILESTONES: ${Object.keys(stats.directorProgress || {}).filter((name) => GameState.getDirectorMilestoneCount(name) > 0).length}`, {
                fontSize: '30px',
                fontFamily: '"VT323", monospace',
                color: '#ffcc00',
                align: 'center',
                stroke: '#000000',
                strokeThickness: 3,
                lineSpacing: 10
            }).setOrigin(0.5);

        const galleryTitle = this.add.text(width / 2, 410, 'CAREER HIGHLIGHTS', {
            fontSize: '54px',
            fontFamily: '"VT323", monospace',
            color: '#ffffff',
            stroke: '#552200',
            strokeThickness: 4
        }).setOrigin(0.5);

        const galleryHint = this.add.text(width / 2, 458, 'CLICK AN UNLOCKED DIRECTOR OR FILM', {
            fontSize: '24px',
            fontFamily: '"VT323", monospace',
            color: '#ffb347'
        }).setOrigin(0.5);

        const galleryGrid = this.add.container(0, 0);
        const allDirectors = this.buildDirectorMemoryCards();
        const unlockedFilms = GameState.persistentGallery.map((film) => ({
            type: 'film',
            title: film.title,
            subtitle: film.directorName || 'UNLOCKED FILM',
            body: this.truncateOverview(film.overview || film.cinematicFact || 'Recovered from your filmography archive.'),
            posterPath: film.posterPath
                || (film.poster_path
                    ? `https://image.tmdb.org/t/p/w500${film.poster_path}`
                    : null),
            fact: this.truncateOverview(film.overview || film.cinematicFact || 'Recovered from your filmography archive.'),
            film
        }));

        this.memoryCardItems = [...allDirectors, ...unlockedFilms];

        const cards = [];
        const columns = 4;
        const startX = width / 2 - 330;
        const startY = 560;
        const cardW = 150;
        const cardH = 180;
        const gapX = 220;
        const gapY = 220;
        const gridItems = this.memoryCardItems.length > 0
            ? this.memoryCardItems
            : [{ type: 'empty', title: 'NO UNLOCKS YET', subtitle: 'Complete a production to fill the archive.' }];

        gridItems.forEach((item, index) => {
            const col = index % columns;
            const row = Math.floor(index / columns);
            const x = startX + (col * gapX);
            const y = startY + (row * gapY);
            const card = this.createMemoryGridCard(x, y, cardW, cardH, item, index);
            cards.push(card);
            galleryGrid.add(card);
        });

        if (gridItems.length === 1 && gridItems[0].type === 'empty') {
            galleryGrid.list[0].disableInteractive?.();
        }

        const brandText = this.add.text(width / 2, height - 250, 'Made by Tuesday Cinema Club', {
            fontSize: '32px',
            fontFamily: '"VT323", monospace',
            color: '#ffcc00'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        brandText.on('pointerdown', () => window.open('http://linktr.ee/Tuesday_Cinema_Club', '_blank'));

        const closeBtnContainer = UI.createChunkyButton(this, width / 2, height - 120, 300, 80, 'CLOSE', () => {
            this.toggleRunMemory(width, height);
        });

        this.buildMemoryOverlay(width, height);

        this.runMemoryContainer.add([bg, title, statsPanelBg, statsText, galleryTitle, galleryHint, galleryGrid, brandText, closeBtnContainer, this.memoryOverlay]);
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
        this.settingsBtn = UI.createSettingsButton(this, width - 140, 140, () => {
            const settings = GameState.getAudioSettings(this);
            if (!this.sound.mute && this.cache.audio.exists('sfx_gear')) {
                this.sound.play('sfx_gear', { volume: 0.8 * (settings.sfxVolume ?? 1) });
            }
            this.settingsOverlay.openModal();
        });

        this.uiContainer.add(this.settingsBtn);
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
        const unlocked = item.type !== 'empty';
        const bg = this.add.rectangle(0, 0, width, height, unlocked ? 0x23140a : 0x222222, 0.95)
            .setStrokeStyle(4, unlocked ? 0xffaa00 : 0x666666);
        const header = this.add.rectangle(0, -height / 2 + 20, width, 40, unlocked ? 0xff8800 : 0x444444, 1);
        const title = this.add.text(0, -height / 2 + 20, this.fitTitle(item.title || 'ARCHIVE'), {
            fontSize: '22px',
            fontFamily: '"VT323", monospace',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: width - 16 }
        }).setOrigin(0.5);
        const body = this.add.text(0, 10, item.subtitle || '', {
            fontSize: '22px',
            fontFamily: '"VT323", monospace',
            color: unlocked ? '#ffe7a8' : '#aaaaaa',
            align: 'center',
            wordWrap: { width: width - 20 }
        }).setOrigin(0.5);

        container.add([bg, header, title, body]);
        container.setSize(width, height);
        container.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);
        UI.makeSquishyButton(this, container, () => {
            if (!unlocked) {
                return;
            }
            this.openMemoryCard(index);
        }, { suppressAutoSfx: false });
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

        this.memoryPrevBtn = UI.createChunkyButton(this, -210, 420, 110, 60, '<', () => this.stepMemoryCard(-1));
        this.memoryNextBtn = UI.createChunkyButton(this, 210, 420, 110, 60, '>', () => this.stepMemoryCard(1));
        const closeBtn = UI.createChunkyButton(this, 0, 420, 220, 60, 'CLOSE', () => {
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

    renderMemoryCard() {
        const item = this.memoryCardItems[this.memoryCardIndex];
        if (!item) {
            return;
        }

        this.memoryCardTitle.setText(item.title || 'ARCHIVE ENTRY');
        this.memoryCardSubtitle.setText(item.subtitle || '');
        this.memoryCardBody.setText(item.body || item.fact || 'No note recorded.');

        if (this.memoryPosterImage) {
            this.memoryPosterImage.destroy();
            this.memoryPosterImage = null;
        }

        if (item.posterPath) {
            const key = `memory_card_${item.type}_${item.film?.id || item.title}`;
            if (!this.textures.exists(key)) {
                this.load.image(key, item.posterPath);
                this.load.once('complete', () => {
                    if (this.memoryCardItems[this.memoryCardIndex] === item) {
                        this.renderMemoryCard();
                    }
                });
                this.load.start();
            } else {
                this.memoryPosterImage = this.add.image(0, -120, key).setOrigin(0.5);
                const scale = Math.min(300 / this.memoryPosterImage.width, 430 / this.memoryPosterImage.height);
                this.memoryPosterImage.setScale(scale);
                this.memoryOverlay.addAt(this.memoryPosterImage, 5);
            }
            this.memoryCardPoster.setVisible(true);
            this.memoryCardPosterText.setText('');
        } else {
            this.memoryCardPoster.setVisible(true);
            this.memoryCardPosterText.setText(item.type === 'director' ? 'DIRECTOR CARD' : 'FILM CARD');
        }
    }

    fitTitle(title) {
        if (title.length <= 18) {
            return title.toUpperCase();
        }
        return `${title.slice(0, 16).toUpperCase()}...`;
    }

    truncateOverview(text) {
        const clean = (text || '').replace(/\s+/g, ' ').trim();
        if (clean.length <= 220) {
            return clean;
        }
        return `${clean.slice(0, 217).trim()}...`;
    }
}
