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
        this.bgScene = this.scene.get('BackgroundScene');
        if (!this.bgScene || !this.bgScene.scene.isActive()) {
            this.scene.launch('BackgroundScene');
            this.bgScene = this.scene.get('BackgroundScene');
        }

        this.cleanupPersistentMenuBodies();

        GameState.applyAudioSettings(this);
        this.hasMenuImpact = false;

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
            if (this.scale.fullscreenSupported && !this.scale.isFullscreen) {
                this.scale.startFullscreen();
            }
            this.scene.start('DirectorSelectScene');
        });
        this.memoryBtnContainer = UI.createChunkyButton(this, width / 2, -360, 280, 76, 'RUN MEMORY', () => {
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

        if (!this.startButtonBody) {
            this.startButtonBody = this.matter.add.rectangle(this.scale.width / 2, startY, 340, 92, {
                isStatic: true,
                restitution: 0.95,
                friction: 0,
                frictionStatic: 0,
                label: 'menu_button'
            });
        } else {
            this.matter.body.setPosition(this.startButtonBody, { x: this.scale.width / 2, y: startY });
        }

        if (!this.memoryButtonBody) {
            this.memoryButtonBody = this.matter.add.rectangle(this.scale.width / 2, memoryY, 280, 76, {
                isStatic: true,
                restitution: 0.95,
                friction: 0,
                frictionStatic: 0,
                label: 'menu_button'
            });
        } else {
            this.matter.body.setPosition(this.memoryButtonBody, { x: this.scale.width / 2, y: memoryY });
        }
    }

    setButtonEnabled(button, enabled) {
        if (button?.input) {
            button.input.enabled = enabled;
        }
    }

    buildRunMemoryPanel(width, height) {
        this.runMemoryContainer = this.add.container(width, 0);
        this.runMemoryContainer.setDepth(200);
        this.runMemoryContainer.setVisible(false);
        this.memoryOpen = false;

        const bg = this.add.rectangle(0, 0, width, height, 0x111111, 0.98).setOrigin(0, 0);
        const title = this.add.text(width / 2, 80, 'RUN MEMORY', {
            fontSize: '80px',
            fontFamily: '"VT323", monospace',
            color: '#ffcc00'
        }).setOrigin(0.5);

        const stats = GameState.persistentStats;
        const statsPanelBg = this.add.graphics();
        statsPanelBg.fillStyle(0x000000, 0.7);
        statsPanelBg.fillRoundedRect(width / 2 - 350, 150, 700, 160, 16);

        const statsText = this.add.text(width / 2, 230,
            `RUNS: ${stats.totalRuns} | BEST: ${stats.bestScore} | WINS: ${stats.wins}\nDIRECTORS UNLOCKED: ${stats.unlockedDirectors.length}`, {
                fontSize: '36px',
                fontFamily: '"VT323", monospace',
                color: '#ffcc00',
                align: 'center',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5);

        let textList = "UNLOCKED FILMS:\n\n";
        if (GameState.persistentGallery.length === 0) {
            textList += "(None yet. Complete a run to unlock films!)";
        } else {
            GameState.persistentGallery.forEach((film) => {
                textList += `- ${film.title}\n`;
            });
        }

        const list = this.add.text(width / 2, 350, textList, {
            fontSize: '32px',
            fontFamily: '"VT323", monospace',
            color: '#fff',
            wordWrap: { width: width - 200 },
            align: 'center'
        }).setOrigin(0.5, 0);

        const brandText = this.add.text(width / 2, height - 250, 'Made by Tuesday Cinema Club', {
            fontSize: '32px',
            fontFamily: '"VT323", monospace',
            color: '#ffcc00'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        brandText.on('pointerdown', () => window.open('http://linktr.ee/Tuesday_Cinema_Club', '_blank'));

        const closeBtnContainer = UI.createChunkyButton(this, width / 2, height - 120, 300, 80, 'CLOSE', () => {
            this.toggleRunMemory(width, height);
        });

        this.runMemoryContainer.add([bg, title, statsPanelBg, statsText, list, brandText, closeBtnContainer]);
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
}
