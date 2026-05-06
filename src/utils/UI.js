import { GameState } from '../GameState.js';

export const UI = {
    /**
     * Applies squishy physics-like interactions to a button (Phaser Game Object or Container).
     * @param {Phaser.Scene} scene - The scene
     * @param {Phaser.GameObjects.GameObject} element - The button background/container
     * @param {Function} onClick - Callback
     */
    makeSquishyButton(scene, element, onClick, options = {}) {
        let interactiveTarget = element;

        if (element.type === 'Container') {
            // Ensure the container has bounds if it doesn't already
            if (element.width === 0 || element.height === 0) {
                // We assume the first child dictates the bounds if not set
                if (element.list.length > 0) {
                    interactiveTarget = element.list[0];
                }
            } else {
                // If it HAS bounds set by setSize, use the container itself
                interactiveTarget = element;
            }
        }

        interactiveTarget.setInteractive({ useHandCursor: true });

        // Original scale could be different from 1 if it's a container, but we assume 1 for simplicity here.
        // We'll capture base scale.
        const baseScaleX = element.scaleX;
        const baseScaleY = element.scaleY;

        interactiveTarget.on('pointerover', () => {
            scene.tweens.add({
                targets: element,
                scaleX: baseScaleX * 1.1,
                scaleY: baseScaleY * 1.1,
                duration: 400,
                ease: 'Elastic.easeOut'
            });
        });

        interactiveTarget.on('pointerout', () => {
            scene.tweens.add({
                targets: element,
                scaleX: baseScaleX,
                scaleY: baseScaleY,
                duration: 200,
                ease: 'Sine.easeOut'
            });
        });

        interactiveTarget.on('pointerdown', () => {
            if (options.beforeClick) {
                options.beforeClick();
            }

            // Global SFX Guard
            const audioSettings = GameState.getAudioSettings(scene);
            if (!options.suppressAutoSfx && !scene.sound.mute && scene.cache.audio.exists('sfx_click')) {
                scene.sound.play('sfx_click', { volume: 0.8 * (audioSettings.sfxVolume ?? 1) });
            }

            scene.tweens.add({
                targets: element,
                scaleX: baseScaleX * 1.2,
                scaleY: baseScaleY * 0.8, // Squish down
                duration: 80,
                ease: 'Back.easeOut'
            });

            // Trigger immediately for "Instant" feel
            if (onClick) {
                onClick();
            }
        });

        interactiveTarget.on('pointerup', () => {
            scene.tweens.add({
                targets: element,
                scaleX: baseScaleX,
                scaleY: baseScaleY,
                duration: 300,
                ease: 'Elastic.easeOut'
            });
        });
    },

    /**
     * Drops a container from the top of the screen with a bounce ease.
     */
    bouncyDropIn(scene, container, startY = -800, targetY, duration = 1200) {
        container.y = startY;
        scene.tweens.add({
            targets: container,
            y: targetY !== undefined ? targetY : scene.scale.height / 2,
            duration: duration,
            ease: 'Bounce.easeOut'
        });
    },

    /**
     * Creates a chunky 3D arcade-style button.
     * @param {Phaser.Scene} scene 
     * @param {number} x 
     * @param {number} y 
     * @param {number} width 
     * @param {number} height 
     * @param {string} textStr 
     * @param {Function} onClick 
     * @returns {Phaser.GameObjects.Container}
     */
    createChunkyButton(scene, x, y, width, height, textStr, onClick, subTextStr = null, options = {}) {
        const container = scene.add.container(x, y);

        const graphics = scene.add.graphics();
        const r = 8; // Border radius

        // Bottom shadow
        graphics.fillStyle(0x331100, 1);
        graphics.fillRoundedRect(-width / 2, -height / 2 + 8, width, height, r);

        // Core
        graphics.fillStyle(0xff6600, 1);
        graphics.fillRoundedRect(-width / 2, -height / 2, width, height, r);

        // Top highlight
        graphics.fillStyle(0xffaa00, 1);
        graphics.fillRoundedRect(-width / 2, -height / 2, width, height / 3, { tl: r, tr: r, bl: 0, br: 0 });

        const textObj = scene.add.text(0, subTextStr ? -12 : 0, textStr, {
            fontSize: subTextStr ? '32px' : '40px',
            fontFamily: '"VT323", monospace',
            color: '#ffffff',
            stroke: '#331100',
            strokeThickness: 3
        }).setOrigin(0.5);

        container.add([graphics, textObj]);

        if (subTextStr) {
            const subText = scene.add.text(0, 18, subTextStr, {
                fontSize: '20px',
                fontFamily: '"VT323", monospace',
                color: '#ffcc00'
            }).setOrigin(0.5);
            container.add(subText);
        }

        // Explicitly set size for interaction
        container.setSize(width, height + 8);
        container.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height + 8), Phaser.Geom.Rectangle.Contains);

        if (onClick) {
            this.makeSquishyButton(scene, container, onClick, options);
        }

        return container;
    },

    /**
     * Creates a simple draggable slider for UI settings (volume, etc)
     */
    createSlider(scene, x, y, width, initialValue, onUpdate) {
        const container = scene.add.container(x, y);
        const barHeight = 8;

        // Background track
        const track = scene.add.graphics();
        track.fillStyle(0x333333, 1);
        track.fillRoundedRect(-width / 2, -barHeight / 2, width, barHeight, 4);

        // Progress track
        const progress = scene.add.graphics();

        const handle = scene.add.circle(-width / 2 + (width * initialValue), 0, 14, 0xffaa00);
        handle.setStrokeStyle(3, 0xffffff);
        handle.setInteractive({ draggable: true, useHandCursor: true });

        const updateProgress = (val) => {
            progress.clear();
            progress.fillStyle(0xff6600, 1);
            progress.fillRoundedRect(-width / 2, -barHeight / 2, width * val, barHeight, 4);
        };

        updateProgress(initialValue);

        handle.on('drag', (pointer, dragX) => {
            const minX = -width / 2;
            const maxX = width / 2;
            const constrainedX = Phaser.Math.Clamp(dragX, minX, maxX);
            handle.x = constrainedX;

            const normalizedValue = (constrainedX - minX) / width;
            updateProgress(normalizedValue);
            if (onUpdate) onUpdate(normalizedValue);
        });

        container.add([track, progress, handle]);
        return container;
    },

    /**
     * Creates a standardized Settings/Gear button.
     */
    createSettingsButton(scene, x, y, onClick) {
        const container = scene.add.container(x, y);
        const btnBg = scene.add.rectangle(0, 0, 80, 80, 0x333333, 0.8).setStrokeStyle(4, 0xffffff);
        const gearIcon = scene.add.text(0, 0, '[#]', {
            fontSize: '18px',
            fontFamily: '"VT323", monospace',
            color: '#ffffff'
        }).setOrigin(0.5);
        const label = scene.add.text(0, 26, 'SETTINGS', { fontSize: '14px', fontFamily: '"VT323", monospace', color: '#fff' }).setOrigin(0.5);
        container.add([btnBg, gearIcon, label]);
        this.makeSquishyButton(scene, container, onClick);
        return container;
    },

    /**
     * Creates a standardized Settings Overlay.
     */
    createSettingsOverlay(scene, options = {}) {
        const { width, height } = scene.scale;
        const container = scene.add.container(width / 2, height / 2).setDepth(5000).setVisible(false);
        container.modalState = new Map();

        const bg = scene.add.rectangle(0, 0, width * 2, height * 2, 0x000000, 0.85).setInteractive();
        const panelWidth = 440;
        const panelHeight = options.showAbandon ? 730 : 630;
        const panel = scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x1a1a1a).setStrokeStyle(4, 0xffaa00);

        const title = scene.add.text(0, -panelHeight / 2 + 40, 'PRODUCTION SETTINGS', {
            fontSize: '32px',
            fontFamily: '"VT323", monospace',
            color: '#ffcc00'
        }).setOrigin(0.5);

        const stats = GameState.getAudioSettings(scene);
        const displaySettings = GameState.getDisplaySettings(scene);
        const sliderWidth = 320;
        const startY = -panelHeight / 2 + 120;

        // Sliders
        const createSettingSlider = (labelStr, initialVal, yOff, onUpdate) => {
            const lbl = scene.add.text(-sliderWidth / 2, yOff, labelStr, { fontSize: '20px', fontFamily: '"VT323", monospace', color: '#aaa' });
            const slider = this.createSlider(scene, 0, yOff + 30, sliderWidth, initialVal, onUpdate);
            return [lbl, slider];
        };

        const masterElements = createSettingSlider('MASTER VOLUME', stats.masterVolume, startY, (v) => {
            GameState.setAudioSettings({ masterVolume: v }, scene);
            GameState.applyAudioSettings(scene);
        });

        const musicElements = createSettingSlider('MUSIC (BGM)', stats.musicVolume, startY + 90, (v) => {
            GameState.setAudioSettings({ musicVolume: v }, scene);
            GameState.applyAudioSettings(scene);
        });

        const sfxElements = createSettingSlider('SFX VOLUME', stats.sfxVolume, startY + 180, (v) => {
            GameState.setAudioSettings({ sfxVolume: v }, scene);
            GameState.applyAudioSettings(scene);
        });

        const scanlinesLabel = scene.add.text(-sliderWidth / 2, startY + 270, 'SCANLINES', {
            fontSize: '20px',
            fontFamily: '"VT323", monospace',
            color: '#aaa'
        });

        const applyScanlineSetting = (enabled) => {
            GameState.setDisplaySettings({ scanlinesEnabled: enabled }, scene);

            const cabinetScene = scene.scene.get('CabinetScene');
            const bootScene = scene.scene.get('BootScene');

            if (cabinetScene?.scene?.isActive()) {
                cabinetScene.refreshScanlines?.();
            }
            if (bootScene?.scene?.isActive()) {
                bootScene.refreshScanlines?.();
            }
        };

        const scanlinesBtn = this.createChunkyButton(
            scene,
            70,
            startY + 290,
            150,
            50,
            displaySettings.scanlinesEnabled ? 'ON' : 'OFF',
            () => {
                const nextValue = !GameState.getDisplaySettings(scene).scanlinesEnabled;
                if (scanlinesBtn.list?.[1]) {
                    scanlinesBtn.list[1].setText(nextValue ? 'ON' : 'OFF');
                }
                applyScanlineSetting(nextValue);
            }
        );

        const collectDescendants = (gameObject, out = new Set()) => {
            out.add(gameObject);
            if (gameObject?.type === 'Container' && Array.isArray(gameObject.list)) {
                gameObject.list.forEach((child) => collectDescendants(child, out));
            }
            return out;
        };

        const setModalState = (isOpen) => {
            const overlayMembers = collectDescendants(container);
            const protectedRoots = new Set();

            let ancestor = container.parentContainer;
            while (ancestor) {
                protectedRoots.add(ancestor);
                ancestor = ancestor.parentContainer;
            }

            if (isOpen) {
                container.modalState.clear();
                
                // We need to recursively disable input on everything NOT in the overlay
                const allSceneObjects = [];
                scene.children.list.forEach(child => {
                    const descendants = collectDescendants(child);
                    descendants.forEach(d => allSceneObjects.push(d));
                });

                allSceneObjects.forEach((gameObject) => {
                    if (!gameObject || overlayMembers.has(gameObject) || protectedRoots.has(gameObject)) {
                        return;
                    }

                    // Store state
                    const state = {
                        alpha: gameObject.alpha,
                        inputEnabled: gameObject.input ? gameObject.input.enabled : false,
                        hasInput: !!gameObject.input
                    };
                    container.modalState.set(gameObject, state);

                    // Disable input
                    if (gameObject.input) {
                        gameObject.input.enabled = false;
                    }

                    // Dim visually (Only top-level or objects with no parent container to avoid double-dimming)
                    // Actually, Phaser alpha is multiplicative, so dimming the top-level container is enough.
                    // But we'll dim everything that isn't a child of another scene object being dimmed.
                    if (scene.children.list.includes(gameObject)) {
                        gameObject.setAlpha(Math.min(gameObject.alpha, 0.3));
                    }
                });
                return;
            }

            container.modalState.forEach((previousState, gameObject) => {
                if (!gameObject || !gameObject.scene) {
                    return;
                }

                // Restore alpha only for top-level to avoid multiplicative mess
                if (scene.children.list.includes(gameObject)) {
                    gameObject.setAlpha(previousState.alpha);
                }
                
                if (gameObject.input && previousState.hasInput) {
                    gameObject.input.enabled = previousState.inputEnabled;
                }
            });
            container.modalState.clear();
        };

        container.openModal = () => {
            setModalState(true);
            container.setVisible(true);
        };

        container.closeModal = () => {
            container.setVisible(false);
            setModalState(false);
        };

        const closeBtn = this.createChunkyButton(scene, 0, panelHeight / 2 - 80, 300, 60, 'RESUME', () => {
            container.closeModal();
            if (options.onClose) options.onClose();
        });

        container.add([bg, panel, title, ...masterElements, ...musicElements, ...sfxElements, scanlinesLabel, scanlinesBtn, closeBtn]);

        if (options.showAbandon) {
            const abandonBtn = this.createChunkyButton(scene, 0, panelHeight / 2 - 170, 300, 60, 'ABANDON RUN', () => {
                if (options.onAbandon) options.onAbandon();
            });
            container.add(abandonBtn);
        }

        return container;
    },

    /**
     * Truncates text at the end of the last complete sentence within the limit.
     */
    getSafeSnippet(text, limit) {
        if (!text || text.length <= limit) return text;
        const snippet = text.substring(0, limit);
        const lastPeriod = snippet.lastIndexOf('.');
        if (lastPeriod > limit * 0.3) {
            return snippet.substring(0, lastPeriod + 1);
        }
        return snippet + "...";
    }
};
