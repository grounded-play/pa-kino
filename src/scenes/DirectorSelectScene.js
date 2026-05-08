import Phaser from 'phaser';
import { UI } from '../utils/UI.js';
import { TMDB } from '../utils/TMDB.js';
import { GameState } from '../GameState.js';

export default class DirectorSelectScene extends Phaser.Scene {
    constructor() {
        super('DirectorSelectScene');
    }

    create() {
        const { width, height } = this.scale;
        const margin = 40;
        const safeWidth = width - (margin * 2);
        const safeHeight = height - (margin * 2);

        this.wheelRadius = 300;
        this.wheelCenterY = margin + (safeHeight * 0.3);
        this.pointerAngle = -Math.PI / 2;

        this.isSpinning = false;
        this.wheelLocked = false;
        this.pendingSelection = null;
        this.selectedSliceIndex = null;

        // Background Sync
        this.bgScene = this.scene.get('BackgroundScene');
        this.bgScene?.setBgWheelVisible(true);
        this.bgScene?.updateWheelLayout(width / 2, this.wheelCenterY, this.wheelRadius);
        this.bgScene?.setWheelVortex(width / 2, this.wheelCenterY, this.wheelRadius, 0);

        // Background Dimming (Bottom layer)
        this.add.rectangle(0, 0, width, height, 0x000000, 0.4).setOrigin(0, 0);

        // Draw Global Safe Zone Border
        const border = this.add.graphics();
        border.lineStyle(3, 0xff8800, 1);
        border.strokeRect(margin, margin, safeWidth, safeHeight);

        this.uiContainer = this.add.container(0, 0);

        const title = this.add.text(width / 2, margin + 80, 'DRAFTING PHASE', {
            fontSize: '80px',
            fontFamily: '"VT323", monospace',
            color: '#ffffff',
            shadow: { offsetX: 3, offsetY: 3, color: '#000', fill: true }
        }).setOrigin(0.5);
        this.milestonesText = this.add.text(width / 2, margin + 140, `PRODUCTION MILESTONES: ${GameState.getTotalMilestones()}/50`, {
            fontSize: '30px',
            fontFamily: '"VT323", monospace',
            color: '#66f2ff',
            stroke: '#003344',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Status Panel (Positioned below the wheel)
        const panelY = this.wheelCenterY + this.wheelRadius + 30;
        const statusPanelBg = this.add.graphics();
        statusPanelBg.fillStyle(0x000000, 0.6);
        statusPanelBg.fillRoundedRect(width / 2 - 250, panelY, 500, 80, 16);
        this.uiContainer.add(statusPanelBg);

        this.statusText = this.add.text(width / 2, panelY + 40, 'TAP WHEEL TO SPIN', {
            fontSize: '40px',
            fontFamily: '"VT323", monospace',
            color: '#ffff00',
            align: 'center'
        }).setOrigin(0.5);

        this.penaltyText = this.add.text(width / 2, panelY + 115, 'STARTING BALLS: 10 BASE + 0 DIRECTOR - 0 RE-ROLL = 10', {
            fontSize: '24px',
            fontFamily: '"VT323", monospace',
            color: '#66f2ff',
            align: 'center'
        }).setOrigin(0.5);

        this.uiContainer.add([title, this.milestonesText, this.statusText, this.penaltyText]);
        this.refreshPenaltyText();
        this.createAudioToggle(width, height);

        this.directors = TMDB.getHardcodedDirectors();
        if (this.directors.length !== 10) {
            throw new Error(`Director wheel requires exactly 10 slices. Found ${this.directors.length}.`);
        }
        this.sliceAngle = (Math.PI * 2) / 10;
        this.wheelContainer = this.add.container(width / 2, this.wheelCenterY);

        // Draw wheel background (larger)
        this.wheelGraphic = this.add.graphics();
        this.wheelGraphic.fillStyle(0x331100, 1); // Tuesday Cinema Club dark tone
        this.wheelGraphic.lineStyle(6, 0xff8800, 1); // Tuesday Cinema Club orange
        this.wheelGraphic.fillCircle(0, 0, this.wheelRadius);
        this.wheelGraphic.strokeCircle(0, 0, this.wheelRadius);

        // Make graphic interactive to fix the hit area
        this.wheelGraphic.setInteractive(new Phaser.Geom.Circle(0, 0, this.wheelRadius), Phaser.Geom.Circle.Contains);
        this.wheelContainer.add(this.wheelGraphic);

        const sliceColor = 0x161c2b; // Dark blueish hue to match the portrait backgrounds

        // Add director names and portraits to wheel
        this.directors.forEach((dir, i) => {
            const angle = this.pointerAngle + (i * this.sliceAngle);
            const milestoneCount = GameState.getDirectorMilestoneCount(dir.name);

            // Draw slice background color
            const startAngle = angle - (this.sliceAngle / 2);
            const endAngle = angle + (this.sliceAngle / 2);
            const currentSliceColor = (milestoneCount > 0) ? 0x080f21 : 0x040810; // Fog of war logic
            this.wheelGraphic.fillStyle(currentSliceColor, 1);
            this.wheelGraphic.slice(0, 0, this.wheelRadius - 4, startAngle, endAngle, false);
            this.wheelGraphic.fillPath();

            // Draw segment divider line (centered between names)
            const dividerAngle = angle - (this.sliceAngle / 2);
            this.wheelGraphic.lineStyle(4, 0xff8800, 0.5);
            this.wheelGraphic.lineBetween(
                0, 0,
                Math.cos(dividerAngle) * this.wheelRadius,
                Math.sin(dividerAngle) * this.wheelRadius
            );

            // 1. Portrait on Wheel
            const portraitKey = dir.portraitKey || dir.portraitFrame || i;
            const portraitX = Math.cos(angle) * 185; // Moved in to avoid lights
            const portraitY = Math.sin(angle) * 185;
            if (this.textures.exists('director_portraits')) {
                const texture = this.textures.get('director_portraits');
                const safeFrame = texture.has(portraitKey) ? portraitKey : i;
                const wheelSprite = this.add.sprite(portraitX, portraitY, 'director_portraits', safeFrame);
                wheelSprite.setDisplaySize(82, 82); // Scaled down slightly
                wheelSprite.rotation = angle + Math.PI / 2;
                if (milestoneCount === 0) {
                    wheelSprite.setTint(0x666666);
                    wheelSprite.setAlpha(0.65);
                }
                this.wheelContainer.add(wheelSprite);
            } else {
                const fallback = this.add.graphics();
                fallback.fillStyle(0x7a7a7a, 1);
                fallback.fillRect(portraitX - 48, portraitY - 48, 96, 96);
                this.wheelContainer.add(fallback);
            }

            this.drawWheelProgressDots(angle, milestoneCount, dir.name.split(' ').pop().toUpperCase());
        });

        this.uiContainer.add(this.wheelContainer);

        const needle = this.add.triangle(width / 2, this.wheelCenterY - this.wheelRadius - 48, 0, 0, 80, 0, 40, 60, 0xff8800).setOrigin(0.5);
        const needlePin = this.add.circle(width / 2, this.wheelCenterY - this.wheelRadius - 48, 10, 0xffaa00);
        this.uiContainer.add([needle, needlePin]);

        this.uiGroup = this.add.container(0, 0);

        this.dossierContainer = this.add.container(width / 2, margin + (safeHeight * 0.68)).setDepth(20).setVisible(false);
        this.resultBackdrop = this.add.rectangle(0, 0, safeWidth, 470, 0x1a1a1a, 0.94).setStrokeStyle(4, 0xffaa00);
        this.resultBackdrop.setScale(1.0);

        this.avatarContainer = this.add.container(-300, 28);
        this.directorPortrait = null;
        this.placeholderPortrait = this.add.image(0, -8, 'placeholder_box');
        this.placeholderPortrait.setDisplaySize(190, 190);
        this.placeholderPortrait.setVisible(false);
        this.avatarContainer.add(this.placeholderPortrait);

        this.dossierTextContainer = this.add.container(100, -78);
        this.directorNameTextLarge = this.add.text(0, -110, '', {
            fontSize: '68px',
            fontFamily: '"VT323", monospace',
            color: '#ffffff',
            stroke: '#ff5500',
            strokeThickness: 6
        }).setOrigin(0.5, 0);

        this.traitBox = this.add.rectangle(0, -18, 360, 56, 0x101010, 0.95).setStrokeStyle(4, 0xffaa00);
        this.traitText = this.add.text(0, -18, '', {
            fontSize: '24px',
            fontFamily: '"VT323", monospace',
            color: '#ffdd99',
            align: 'center',
            wordWrap: { width: 320 }
        }).setOrigin(0.5);

        this.birthText = this.add.text(0, 30, '', {
            fontSize: '20px',
            fontFamily: '"VT323", monospace',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: 500 }
        }).setOrigin(0.5);

        this.bioSnippetText = this.add.text(0, 78, '', {
            fontSize: '20px',
            fontFamily: '"VT323", monospace',
            color: '#ffdd99',
            align: 'center',
            wordWrap: { width: 500 },
            lineSpacing: 4
        }).setOrigin(0.5);
        this.roadmapContainer = this.add.container(0, 150);
        this.dossierTextContainer.add([
            this.directorNameTextLarge,
            this.traitBox,
            this.traitText,
            this.birthText,
            this.bioSnippetText,
            this.roadmapContainer
        ]);

        this.startRunButton = UI.createChunkyButton(this, width / 2 + 180, margin + safeHeight - 210, 320, 96, 'START PRODUCTION', () => {
            this.beginRun();
        }, 'GO TO THE THEATER');

        // Add a pulsing effect to the primary action button
        this.tweens.add({
            targets: this.startRunButton,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.rerollButton = UI.createChunkyButton(this, width / 2 - 180, margin + safeHeight - 210, 260, 80, 'RE-ROLL', () => {
            this.handleReroll();
        }, '(-1 BALL PENALTY)');
        this.startRunButton.setAlpha(0);
        this.rerollButton.setAlpha(0);
        this.setActionButtonsEnabled(false);

        this.dossierContainer.add([
            this.resultBackdrop,
            this.avatarContainer,
            this.dossierTextContainer
        ]);

        this.uiGroup.add([this.dossierContainer, this.startRunButton, this.rerollButton]);
        this.uiContainer.add(this.uiGroup);

        // Spin Button logic (clicking the wheel)
        this.wheelGraphic.on('pointerdown', () => this.spinWheel());

        const backBtnContainer = UI.createChunkyButton(this, width / 2, margin + safeHeight - 104, 300, 60, '< BACK TO MENU', () => {
            GameState.draftingPenalty = 0; // Reset penalty when leaving
            this.scene.start('MenuScene');
        });

        this.uiGroup.add(backBtnContainer);

        // Bouncy entry
        UI.bouncyDropIn(this, this.uiContainer, -height, 0, 1000);
        this.refreshPenaltyText();

        this.lastRotation = this.wheelContainer.rotation;
    }

    update() {
        if (!this.isSpinning && !this.wheelLocked) {
            // Slow idle rotation
            this.wheelContainer.rotation += 0.005;
            this.bgScene?.syncBgWheel(this.wheelContainer.rotation);
        }
    }

    spinWheel() {
        // Only block starting a new spin if settings is open, but allow opening settings DURING a spin
        if (this.isSpinning || this.wheelLocked || (this.settingsOverlay && this.settingsOverlay.visible)) return;
        this.isSpinning = true;
        this.pendingSelection = null;
        this.dossierContainer.setVisible(false);
        this.statusText.setText('SPINNING THE WHEEL...');

        // Hide portrait during spin
        if (this.directorPortrait) {
            this.directorPortrait.setAlpha(0);
            this.directorPortrait.setVisible(false);
        }
        this.placeholderPortrait?.setVisible(false);

        const spins = Phaser.Math.Between(5, 8);
        const targetIndex = Phaser.Math.Between(0, this.directors.length - 1);

        const targetAngleRad = -(targetIndex * this.sliceAngle);
        const totalRotation = (Math.PI * 2 * spins) + targetAngleRad;

        this.tweens.add({
            targets: this.wheelContainer,
            rotation: totalRotation,
            duration: 6000,
            ease: 'Cubic.easeOut',
            onUpdate: (tween) => {
                this.handleSpinTick();
                // Dynamically increase/decrease vortex power based on rotation speed (tween progress)
                const power = (1 - tween.progress) * 8; // Max power at start, decaying
                const centerX = this.scale.width / 2;
                this.bgScene?.setWheelVortex(centerX, this.wheelCenterY, this.wheelRadius, power);
                this.bgScene?.syncBgWheel(this.wheelContainer.rotation);
            },
            onComplete: () => this.handleSpinComplete(targetIndex)
        });
    }

    getNeedleSliceIndex(rotation) {
        const selectionAngle = Phaser.Math.Angle.Normalize(-rotation);
        return (((Math.round(selectionAngle / this.sliceAngle) % this.directors.length) + this.directors.length) % this.directors.length);
    }

    handleSpinTick() {
        const currentRotation = this.wheelContainer.rotation;
        const sliceIndex = this.getNeedleSliceIndex(currentRotation);

        if (sliceIndex !== this.selectedSliceIndex) {
            // Calculate rotational velocity to determine click sound
            const speed = Math.abs(currentRotation - this.lastRotation);
            this.selectedSliceIndex = sliceIndex;

            if (!this.sound.mute) {
                this.playTickSound(speed);
            }
        }
        this.lastRotation = currentRotation;
    }

    playTickSound(speed = 0) {
        if (this.cache.audio.exists('tick')) {
            const settings = GameState.getAudioSettings(this);
            this.sound.play('tick', {
                volume: (speed > 0.08 ? 0.32 : 0.22) * settings.sfxVolume,
                rate: speed > 0.08 ? 1.08 : 0.96
            });
            return;
        }

        // Fallback to procedural click if audio asset isn't loaded yet
        const audioContext = this.sound.context;
        if (!audioContext) return;

        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'square';
        osc.frequency.value = 880;
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(audioContext.destination);
        const now = audioContext.currentTime;
        gain.gain.exponentialRampToValueAtTime(0.03, now + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.05);
    }

    async handleSpinComplete(index) {
        this.isSpinning = false;
        this.wheelLocked = true;

        // Snap-to-Center
        const finalRotation = -(index * this.sliceAngle);
        this.tweens.add({
            targets: this.wheelContainer,
            rotation: finalRotation,
            duration: 500,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.game.events.emit('game-impact', 1.5);
                // Zero out vortex on final snap
                const centerX = this.scale.width / 2;
                this.bgScene?.setWheelVortex(centerX, this.wheelCenterY, this.wheelRadius, 0);
                this.bgScene?.syncBgWheel(this.wheelContainer.rotation);
            }
        });

        const selectedDirector = this.directors[index];
        this.statusText.setText(`SELECTED: ${selectedDirector.name}\nPREPARING CAMPAIGN...`);

        try {
            if (!TMDB.isConfigured()) {
                throw new Error('TMDB credentials missing');
            }

            const [profileData, films] = await Promise.all([
                TMDB.getDirectorProfile(selectedDirector.tmdbId ?? selectedDirector.id, selectedDirector.name),
                TMDB.getDirectorFilms(selectedDirector.tmdbId ?? selectedDirector.id, selectedDirector.name)
            ]);

            if (!films.length) {
                throw new Error(`No TMDB films found for ${selectedDirector.name}`);
            }

            // PRE-FETCH POSTERS FOR THE CAMPAIGN
            const currentMovie = films[0];
            const nextMovie = films[1];

            const proceedWithReveal = () => {
                const profilePath = profileData.profile_path
                    ? `https://image.tmdb.org/t/p/w200${profileData.profile_path}`
                    : null;

                this.pendingSelection = {
                    ...selectedDirector,
                    films,
                    currentPosterKey: `poster_${currentMovie.id}`,
                    nextPosterKey: nextMovie ? `poster_${nextMovie.id}` : null,
                    profilePath,
                    birthday: profileData.birthday,
                    placeOfBirth: profileData.place_of_birth,
                    biography: profileData.biography
                };

                this.wheelLocked = true;
                this.statusText.setText(`SELECTED: ${selectedDirector.name}\nLOCKED IN. START OR RE-ROLL.`);
                this.refreshPenaltyText(this.pendingSelection);
                this.showDirectorReveal(this.pendingSelection);
                this.isSpinning = false;
            };

            proceedWithReveal();

        } catch (error) {
            console.error('Drafting fallback triggered:', error);
            const fallbackSelection = TMDB.getFallbackSelection();
            this.pendingSelection = fallbackSelection;
            this.wheelLocked = true;
            this.statusText.setText(`TMDB OFFLINE MODE\n${fallbackSelection.name} STEPS IN.`);
            this.refreshPenaltyText(this.pendingSelection);
            this.showDirectorReveal(fallbackSelection);
            this.isSpinning = false;
        }
    }

    async showDirectorReveal(selection) {
        this.dossierContainer.setVisible(true);
        this.tweens.killTweensOf(this.avatarContainer);
        this.resultBackdrop.setScale(0.2);
        this.directorNameTextLarge.setText(selection.name.toUpperCase());
        this.directorNameTextLarge.setY(-110);
        this.directorNameTextLarge.setAlpha(0);
        this.traitText.setText((selection.traitLines || ['STANDARD PRODUCTION']).join('\n'));
        this.traitText.setAlpha(0);
        this.traitBox.setAlpha(0);
        this.birthText.setAlpha(0);
        this.bioSnippetText.setAlpha(0);
        this.roadmapContainer.setAlpha(0);
        this.startRunButton.setAlpha(0);
        this.rerollButton.setAlpha(0);
        this.setActionButtonsEnabled(true);

        this.updateDirectorPortrait(selection);
        this.populateBioPanel(selection);
        this.renderRoadmap(selection);

        this.tweens.add({
            targets: this.resultBackdrop,
            scaleX: 1,
            scaleY: 1,
            duration: 260,
            ease: 'Back.easeOut'
        });

        this.tweens.add({
            targets: this.directorNameTextLarge,
            alpha: 1,
            y: -110,
            duration: 300,
            ease: 'Back.easeOut'
        });

        this.tweens.add({
            targets: [this.traitBox, this.traitText, this.birthText, this.bioSnippetText, this.roadmapContainer],
            alpha: 1,
            duration: 260,
            delay: 100,
            ease: 'Sine.easeOut'
        });

        this.tweens.add({
            targets: [this.startRunButton, this.rerollButton],
            alpha: 1,
            duration: 220,
            delay: 180
        });
    }

    populateBioPanel(selection) {
        const formattedBirth = this.formatBirthLine(selection.birthday, selection.placeOfBirth);
        this.birthText.setText(formattedBirth);
        this.bioSnippetText.setText(this.truncateBiography(selection.biography));
    }

    formatBirthLine(birthday, placeOfBirth) {
        const birthLabel = birthday ? this.formatDateString(birthday) : 'Unknown Date';
        const placeLabel = placeOfBirth || 'Unknown Place';
        return `Born: ${birthLabel} - ${placeLabel}`;
    }

    formatDateString(dateString) {
        const parsed = new Date(dateString);
        if (Number.isNaN(parsed.getTime())) {
            return dateString;
        }
        return parsed.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    truncateBiography(biography) {
        if (!biography) {
            return 'Biography unavailable.';
        }

        const cleaned = biography.replace(/\s+/g, ' ').trim();
        if (cleaned.length <= 150) {
            return cleaned;
        }
        return `${cleaned.slice(0, 150).trim()}...`;
    }

    updateDirectorPortrait(selection) {
        const frame = selection.portraitFrame ?? 0;
        const portraitWidth = 215;
        const portraitHeight = 287;
        if (this.fallbackNameText) {
            this.fallbackNameText.destroy();
            this.fallbackNameText = null;
        }

        let portraitTarget = null;

        if (this.textures.exists('director_portraits')) {
            const portraitKey = selection.portraitKey || selection.portraitFrame || frame;
            const texture = this.textures.get('director_portraits');

            if (texture.has(portraitKey)) {
                if (!this.directorPortrait) {
                    this.directorPortrait = this.add.sprite(0, -8, 'director_portraits', portraitKey);
                    this.avatarContainer.add(this.directorPortrait);
                }
                this.directorPortrait.setTexture('director_portraits', portraitKey);
                this.directorPortrait.setVisible(true);
                this.directorPortrait.setAlpha(1);
                this.directorPortrait.setScale(0);
                this.directorPortrait.setDisplaySize(215, 287);
                this.directorPortrait.setPosition(0, -8);
                this.placeholderPortrait?.setVisible(false);
                portraitTarget = this.directorPortrait;
            } else {
                this.drawPortraitPlaceholder(portraitWidth, portraitHeight);
                portraitTarget = this.placeholderPortrait;
            }
        } else {
            this.drawPortraitPlaceholder(portraitWidth, portraitHeight);
            portraitTarget = this.placeholderPortrait;
        }

        if (!portraitTarget) {
            return;
        }

        // Pop Animation
        this.tweens.add({
            targets: portraitTarget,
            scaleX: 1,
            scaleY: 1,
            duration: 360,
            ease: 'Back.easeOut',
            onStart: () => {
                const settings = GameState.getAudioSettings(this);
                if (!this.sound.mute && this.cache.audio.exists('sfx_win1')) {
                    this.sound.play('sfx_win1', { volume: 0.8 * (settings.sfxVolume ?? 1) });
                }
            }
        });

        // Add a frame for aesthetics
        if (!this.portraitFrameGraphics) {
            this.portraitFrameGraphics = this.add.graphics();
            this.avatarContainer.add(this.portraitFrameGraphics);
        }
        this.portraitFrameGraphics.clear();
        this.portraitFrameGraphics.lineStyle(6, 0xffaa00, 1);
        this.portraitFrameGraphics.strokeRect(
            -(portraitWidth / 2) - 8,
            -(portraitHeight / 2) - 8,
            portraitWidth + 16,
            portraitHeight + 16
        );
    }

    handleReroll() {
        if (this.isSpinning) return;
        this.tweens.killTweensOf(this.avatarContainer);
        GameState.draftingPenalty += 1;
        this.pendingSelection = null;
        this.wheelLocked = false;
        this.dossierContainer.setVisible(false);
        this.startRunButton.setAlpha(0);
        this.rerollButton.setAlpha(0);
        this.setActionButtonsEnabled(false);
        this.wheelContainer.rotation = 0;
        this.lastRotation = 0;
        this.selectedSliceIndex = null;
        this.statusText.setText('RE-ROLL PAID. TAP WHEEL TO SPIN AGAIN.');
        this.refreshPenaltyText();
    }

    refreshPenaltyText(selection = null) {
        const firstFilm = selection?.films?.[0];
        const levelData = firstFilm ? TMDB.getLevelDataFromFilm(firstFilm) : { balls: 10 };
        const directorBonus = selection?.traits?.startingBalls || 0;
        const rerollPenalty = GameState.draftingPenalty || 0;
        const totalBalls = Math.max(1, levelData.balls + directorBonus - rerollPenalty);
        const detailParts = [];

        if (directorBonus !== 0) {
            const signedDirectorBonus = directorBonus > 0 ? `+${directorBonus}` : `${directorBonus}`;
            detailParts.push(`${signedDirectorBonus} director trait`);
        }

        if (rerollPenalty > 0) {
            detailParts.push(`-${rerollPenalty} re-roll`);
        }

        const detailSuffix = detailParts.length > 0 ? ` (${detailParts.join(', ')})` : '';
        this.penaltyText.setText(`STARTING BALLS: ${totalBalls}${detailSuffix}`);
    }

    beginRun() {
        if (!this.pendingSelection) return;
        GameState.initRun(this.pendingSelection, this.pendingSelection.films);
        this.scene.start('PachinkoScene', { director: this.pendingSelection });
    }

    createAudioToggle(width, height) {
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

    drawWheelProgressDots(angle, milestoneCount, labelText) {
        const rowRadius = 258;
        const rowWidth = 72;
        const dotSpacing = 18;
        const rowCenterX = Math.cos(angle) * rowRadius;
        const rowCenterY = Math.sin(angle) * rowRadius;
        const infoGroup = this.add.container(rowCenterX, rowCenterY);
        infoGroup.rotation = angle + (Math.PI / 2);

        const nameText = this.add.text(0, -18, labelText, {
            fontSize: '18px',
            fontFamily: '"VT323", monospace',
            color: milestoneCount > 0 ? '#fff0a8' : '#cccccc',
            stroke: '#000',
            strokeThickness: 2,
            align: 'center'
        }).setOrigin(0.5);
        infoGroup.add(nameText);

        for (let dotIndex = 0; dotIndex < 5; dotIndex++) {
            const unlocked = dotIndex < milestoneCount;
            const x = -rowWidth / 2 + (dotIndex * dotSpacing);
            const dot = this.add.circle(x, 8, 7, unlocked ? 0xffe066 : 0x4a4a4a)
                .setStrokeStyle(3, unlocked ? 0xff8800 : 0x777777);
            infoGroup.add(dot);
        }

        this.wheelContainer.add(infoGroup);
    }

    renderRoadmap(selection) {
        this.roadmapContainer.removeAll(true);
        const title = this.add.text(0, 130, 'CAREER ROADMAP', { // Moved below posters
            fontSize: '24px',
            fontFamily: '"VT323", monospace',
            color: '#66f2ff'
        }).setOrigin(0.5, 0);
        this.roadmapContainer.add(title);

        const unlockedFilms = GameState.getGalleryFilmsForDirector(selection.name);
        const unlockedIds = new Set(unlockedFilms.map((film) => film.id));
        (selection.films || []).slice(0, 5).forEach((film, index) => {
            const unlocked = unlockedIds.has(film.id);
            const x = -200 + (index * 100);
            const card = this.add.container(x, 62);
            const box = this.add.rectangle(0, 0, 70, 105, unlocked ? 0x2a1a08 : 0x1e1e1e, 0.96)
                .setStrokeStyle(3, unlocked ? 0xffaa00 : 0x555555);
            const leftDot = this.add.circle(0, -38, 7, unlocked ? 0xffe066 : 0x555555)
                .setStrokeStyle(2, unlocked ? 0xff8800 : 0x333333);
            const stepLabel = this.add.text(0, -18, `${index + 1}`, {
                fontSize: '18px',
                fontFamily: '"VT323", monospace',
                color: '#ffffff'
            }).setOrigin(0.5);

            const unlockedFilmData = unlockedFilms.find((entry) => entry.id === film.id);
            const posterPath = unlockedFilmData?.posterPath
                || unlockedFilmData?.poster_path
                || film.posterPath
                || (film.poster_path ? `https://image.tmdb.org/t/p/w500${film.poster_path}` : null);

            if (unlocked) {
                const textureKey = `poster_${film.id}`;
                if (this.textures.exists(textureKey)) {
                    const poster = this.add.image(0, 6, textureKey).setOrigin(0.5);
                    const scale = Math.min(64 / poster.width, 64 / poster.height);
                    poster.setScale(scale);
                    card.add([box, poster, leftDot, stepLabel]);
                } else {
                    const placeholder = this.add.rectangle(0, 6, 50, 50, 0x333333);
                    card.add([box, placeholder, leftDot, stepLabel]);
                }
            } else {
                const label = this.add.text(0, 18, unlocked ? film.title.toUpperCase() : 'LOCKED', {
                    fontSize: unlocked ? '14px' : '16px',
                    fontFamily: '"VT323", monospace',
                    color: unlocked ? '#fff4cc' : '#888888',
                    align: 'center',
                    wordWrap: { width: 76 }
                }).setOrigin(0.5);
                card.add([box, leftDot, stepLabel, label]);
            }

            this.roadmapContainer.add(card);
        });
    }

    drawPortraitPlaceholder(w, h, color = 0x7a7a7a) {
        if (!this.placeholderPortrait) {
            this.placeholderPortrait = this.add.image(0, -8, 'placeholder_box');
            this.avatarContainer.add(this.placeholderPortrait);
        }
        this.placeholderPortrait.setDisplaySize(w, h);
        this.placeholderPortrait.setTint(color);
        this.placeholderPortrait.setVisible(true);
        this.placeholderPortrait.setAlpha(1);
        this.placeholderPortrait.setScale(0);
        this.directorPortrait?.setVisible(false);
    }

    setActionButtonsEnabled(enabled) {
        // Guard: If settings is open, don't re-enable underlying UI buttons
        const isModalOpen = this.settingsOverlay && this.settingsOverlay.visible;
        const finalEnabled = isModalOpen ? false : enabled;

        const updateTarget = (button) => {
            const hitTarget = button?.hitTarget || button;
            if (hitTarget?.input) {
                hitTarget.input.enabled = finalEnabled;
            }
        };

        updateTarget(this.startRunButton);
        updateTarget(this.rerollButton);
    }
}
