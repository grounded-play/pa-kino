import Phaser from 'phaser';
import { UI } from '../utils/UI.js';
import { GameState } from '../GameState.js';
import { TMDB } from '../utils/TMDB.js';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        const { width, height } = this.scale;
        this.loadingComplete = false;

        // --- Loading screen background (visible during preload) ---
        const loadBg = this.add.graphics();
        loadBg.fillStyle(0x0d0a05, 1);
        loadBg.fillRect(0, 0, width, height);

        const loadTitle = this.add.text(width / 2, height / 2 - 220, 'PA-KINO!', {
            fontSize: '140px',
            fontFamily: '"VT323", monospace',
            color: '#ff8800',
            stroke: '#000000',
            strokeThickness: 10
        }).setOrigin(0.5).setDepth(10);

        // --- Progress bar ---
        const barW = Math.min(560, width - 80);
        const barH = 26;
        const barX = width / 2 - barW / 2;
        const barY = height / 2 + 70;

        const barBg = this.add.graphics().setDepth(10);
        barBg.fillStyle(0x1a1a1a, 1);
        barBg.fillRoundedRect(barX - 2, barY - 2, barW + 4, barH + 4, 10);
        barBg.lineStyle(2, 0x444444, 1);
        barBg.strokeRoundedRect(barX - 2, barY - 2, barW + 4, barH + 4, 10);

        this.loadBarFill = this.add.graphics().setDepth(11);

        this.tickerText = this.add.text(width / 2, barY + barH + 18, 'INITIALIZING REEL...', {
            fontSize: '22px',
            fontFamily: '"VT323", monospace',
            color: '#555555',
            align: 'center'
        }).setOrigin(0.5, 0).setDepth(11);
        this.startTickerScroll(width);

        // Collect transient loading UI — destroyed in create() once scene is built
        this._loadUiGroup = [loadBg, loadTitle, barBg, this.loadBarFill, this.tickerText];

        // --- PLAY GAME button — disabled until loading completes ---
        this.playBtn = UI.createChunkyButton(
            this,
            width / 2,
            height / 2 - 60,
            450,
            110,
            'PLAY GAME',
            () => this.handleStartGame(),
            null,
            {
                suppressAutoSfx: true,
                beforeClick: () => this.handleUserGestureUnlock()
            }
        );
        this.playBtn.setDepth(20);
        this.playBtn.setAlpha(0.4);
        this.playBtn.disableInteractive();

        // --- Loader event listeners ---
        this.load.on('filecomplete-spritesheet-director_portraits', (key) => {
            console.log('Spritesheet Load Success:', key);
            // Register named frame aliases so scenes can do sprite.setTexture('portrait_akira_kurosawa')
            const texture = this.textures.get('director_portraits');
            TMDB.getHardcodedDirectors().forEach((d) => {
                if (d.portraitKey && !texture.has(d.portraitKey)) {
                    const f = texture.get(d.portraitFrame);
                    if (f) {
                        texture.add(d.portraitKey, 0, f.cutX, f.cutY, f.cutWidth, f.cutHeight);
                    }
                }
            });
        });

        this.load.on('loaderror', (file) => {
            console.error('LOAD ERROR FOR:', file.src);
        });

        this.load.on('progress', (value) => {
            if (!this.loadBarFill) return;
            this.loadBarFill.clear();
            this.loadBarFill.fillStyle(0xff8800, 1);
            this.loadBarFill.fillRoundedRect(barX, barY, barW * value, barH, 8);
        });

        this.load.on('filecomplete', (key) => {
            if (!this.tickerText) return;
            const assetLabel = String(key).replace(/_/g, ' ').toUpperCase();
            this.tickerText.setText(`ASSIGNING CREW: [${assetLabel}]...`);
            this.restartTickerScroll(width);
        });

        this.load.on('complete', () => {
            this.loadingComplete = true;
            // Green full bar = all done
            if (this.loadBarFill) {
                this.loadBarFill.clear();
                this.loadBarFill.fillStyle(0x44cc66, 1);
                this.loadBarFill.fillRoundedRect(barX, barY, barW, barH, 8);
            }
            if (this.tickerText) {
                this.tickerText.setText('ALL ASSETS LOADED — PRESS PLAY!');
                this.tickerText.setColor('#ffcc00');
                this.tickerText.setX(width / 2);
            }
            // Unlock button with a pop animation
            if (this.playBtn) {
                this.playBtn.setAlpha(1.0);
                this.playBtn.setInteractive();
                this.tweens.add({
                    targets: this.playBtn,
                    scaleX: 1.1,
                    scaleY: 1.1,
                    duration: 280,
                    yoyo: true,
                    ease: 'Back.easeOut'
                });
            }
        });

        // --- Audio ---
        this.load.audio('bgm', '/assets/sounds/mainsong.mp3');
        this.load.audio('tick', '/assets/sounds/clickslow.wav');
        this.load.audio('click_fast', '/assets/sounds/clickfast.wav');
        this.load.audio('click_slow', '/assets/sounds/clickslow.wav');
        this.load.audio('sfx_oscar', '/assets/sounds/oscar.wav');
        this.load.audio('sfx_gear', '/assets/sounds/gear.wav');
        this.load.audio('sfx_title', '/assets/sounds/title.wav');
        this.load.audio('sfx_abandon', '/assets/sounds/badpress.wav');
        this.load.audio('sfx_click', '/assets/sounds/goodpress.wav');
        this.load.audio('sfx_explosion', '/assets/sounds/explosion.wav');
        this.load.audio('sfx_win1', '/assets/sounds/win1.wav');
        this.load.audio('sfx_win2', '/assets/sounds/win2.wav');
        this.load.audio('sfx_win3', '/assets/sounds/win3.wav');
        this.load.audio('sfx_win4', '/assets/sounds/win4.wav');

        this.load.spritesheet('director_portraits', '/src/assets/images/spritesheet.fixed.png', {
            frameWidth: 204,
            frameHeight: 286,
            margin: 0,
            spacing: 0
        });
    }

    create() {
        const { width, height } = this.scale;
        GameState.ensureAudibleAudio(this);
        GameState.syncAudioRegistry(this);
        this.createPlaceholderPortraitTexture();
        this.tickerTween?.stop();

        // Destroy transient loading-screen graphics (the button persists)
        this._loadUiGroup?.forEach(obj => obj?.destroy());
        this._loadUiGroup = null;
        this.loadBarFill = null;
        this.tickerText = null;

        // 1. Cinematic gradient background
        const bgGraphics = this.add.graphics();
        bgGraphics.fillGradientStyle(0x1a0a00, 0x1a0a00, 0x050200, 0x050200, 1);
        bgGraphics.fillRect(0, 0, width, height);

        // 2. Faded rotating logo watermark
        if (this.textures.exists('tcc_logo')) {
            const bgLogo = this.add.image(width / 2, height / 2, 'tcc_logo');
            bgLogo.setAlpha(0.08);
            bgLogo.setScale((width * 1.5) / bgLogo.width);
            bgLogo.setTint(0xff8800);
            this.tweens.add({
                targets: bgLogo,
                rotation: Math.PI * 2,
                duration: 120000,
                repeat: -1
            });
        }

        // 3. Atmospheric dust particles
        if (!this.textures.exists('dust_particle')) {
            const dp = this.make.graphics({ x: 0, y: 0, add: false });
            dp.fillStyle(0xffffff, 1);
            dp.fillCircle(2, 2, 2);
            dp.generateTexture('dust_particle', 4, 4);
        }

        this.scene.launch('BackgroundScene');
        this.scene.sendToBack('BackgroundScene');
        this.scene.launch('CabinetScene');
        this.scene.bringToTop('CabinetScene');

        this.add.particles(0, 0, 'dust_particle', {
            x: { min: 0, max: width },
            y: { min: 0, max: height },
            lifespan: { min: 5000, max: 10000 },
            speed: { min: 5, max: 15 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5, end: 1.5 },
            alpha: { start: 0, end: 0.2, yoyo: true },
            tint: 0xffcc00,
            quantity: 1,
            frequency: 100,
            blendMode: 'ADD'
        });

        this.refreshScanlines();

        // 4. Attach pulse tween and extended tap-target to the pre-created button
        if (this.playBtn) {
            const hitW = 510;
            const hitH = 170;
            this.playBtn.setInteractive(
                new Phaser.Geom.Rectangle(-hitW / 2, -hitH / 2, hitW, hitH),
                Phaser.Geom.Rectangle.Contains
            );

            this.pulseTween = this.tweens.add({
                targets: this.playBtn,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            this.playBtn.on('pointerover', () => {
                this.pulseTween?.pause();
                this.tweens.add({
                    targets: this.playBtn,
                    scaleX: 1.1,
                    scaleY: 1.1,
                    duration: 200,
                    ease: 'Back.easeOut'
                });
            });

            this.playBtn.on('pointerout', () => {
                this.tweens.add({
                    targets: this.playBtn,
                    scaleX: 1.0,
                    scaleY: 1.0,
                    duration: 200,
                    onComplete: () => this.pulseTween?.resume()
                });
            });
        }
    }

    handleUserGestureUnlock() {
        if (this.gameStarting) return;

        const startBootAudio = () => {
            if (this.bootAudioStarted) return;
            this.bootAudioStarted = true;
            GameState.applyAudioSettings(this);

            const { sfxVolume } = GameState.getAudioSettings(this);
            const bgm = this.sound.get('bgm');

            if (bgm && !this.sound.mute) {
                try {
                    if (bgm.isPaused) {
                        bgm.resume();
                    } else if (!bgm.isPlaying) {
                        bgm.play();
                    }
                } catch (e) {
                    console.warn('BGM play failed during gesture:', e);
                }
            }

            if (this.cache.audio.exists('sfx_click') && !this.sound.mute) {
                try {
                    this.sound.play('sfx_click', { volume: 0.8 * (sfxVolume || 1) });
                } catch (e) {
                    console.warn('Click SFX failed during gesture:', e);
                }
            }
        };

        // Both calls execute in the same pointerdown block to satisfy
        // autoplay/fullscreen policy before scene transition begins.
        if (this.scale.fullscreenSupported && !this.scale.isFullscreen) {
            this.scale.startFullscreen();
        }

        if (this.sound.context) {
            this.sound.context.resume()
                .then(() => {
                    console.log(`Audio context state: ${this.sound.context.state}`);
                    startBootAudio();
                })
                .catch(e => console.warn('Audio context resume failed:', e));
        } else {
            startBootAudio();
        }

        if (this.sound.locked) {
            this.sound.once('unlocked', startBootAudio);
            if (typeof this.sound.unlock === 'function') this.sound.unlock();
        }
    }

    handleStartGame() {
        if (this.gameStarting) return;
        this.gameStarting = true;

        this.cameras.main.flash(600, 255, 255, 255);
        this.time.delayedCall(300, () => this.scene.start('MenuScene'));
    }

    createPlaceholderPortraitTexture() {
        if (this.textures.exists('placeholder_box')) return;

        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0x767676, 1);
        graphics.fillRoundedRect(0, 0, 256, 512, 24);
        graphics.lineStyle(8, 0xbdbdbd, 1);
        graphics.strokeRoundedRect(4, 4, 248, 504, 24);
        graphics.generateTexture('placeholder_box', 256, 512);
        graphics.destroy();
    }

    startTickerScroll(width) {
        if (!this.tickerText) {
            return;
        }

        this.tickerText.setX(width + 220);
        this.tickerTween = this.tweens.add({
            targets: this.tickerText,
            x: -220,
            duration: 2400,
            repeat: -1,
            ease: 'Linear'
        });
    }

    restartTickerScroll(width) {
        if (this.loadingComplete || !this.tickerText) {
            return;
        }

        this.tickerTween?.stop();
        this.startTickerScroll(width);
    }

    refreshScanlines() {
        if (!this.scanlines) return;
        this.scanlines.setVisible(GameState.getDisplaySettings(this).scanlinesEnabled);
    }
}
