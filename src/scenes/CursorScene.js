import Phaser from 'phaser';

export default class CursorScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CursorScene', active: true });
    }

    create() {
        this.isCoarsePointer = typeof window !== 'undefined'
            && typeof window.matchMedia === 'function'
            && window.matchMedia('(hover: none), (pointer: coarse)').matches;
        this.lastPointerType = this.isCoarsePointer ? 'touch' : 'mouse';
        this.tapLikeInteraction = false;

        // The dot - visible by default, but will fade if no activity
        this.cursorCore = this.add.circle(0, 0, 3, 0xff8800, 1)
            .setDepth(1000001)
            .setVisible(true);

        this.dotFadeTween = null;
        this.isPointerOverInteractive = false;
        this.lastPointerMoveAt = 0;

        this.applyCursorVisualState('default');
        
        this.input.on('pointermove', (pointer) => {
            this.lastPointerType = pointer.pointerType || this.lastPointerType || 'mouse';
            this.lastPointerMoveAt = this.time.now;

            if (this.isCoarsePointer || this.lastPointerType === 'touch') {
                return;
            }

            // Cancel any pending fade-out
            if (this.dotFadeTween) {
                this.dotFadeTween.stop();
                this.dotFadeTween = null;
            }
            
            this.cursorCore.setVisible(true);
            this.cursorCore.setAlpha(1);
            this.cursorCore.setPosition(pointer.x, pointer.y);
            
            let isOverInteractive = false;
            this.game.scene.scenes.forEach(scene => {
                if (scene.scene.key === 'CursorScene') return;
                if (!scene.scene.isActive()) return;
                
                const hovered = scene.input.hitTestPointer(pointer);
                if (hovered && hovered.length > 0) {
                    isOverInteractive = true;
                }
            });

            this.isPointerOverInteractive = isOverInteractive;

            if (isOverInteractive) {
                this.cursorCore.setScale(1.4);
                this.applyCursorVisualState('hover');
            } else {
                this.cursorCore.setScale(1.0);
                this.applyCursorVisualState('default');
            }
        });

        this.input.on('pointerdown', (pointer) => {
            this.lastPointerType = pointer.pointerType || this.lastPointerType || 'mouse';
            this.tapLikeInteraction = this.isCoarsePointer || this.lastPointerType === 'touch';

            if (this.dotFadeTween) {
                this.dotFadeTween.stop();
                this.dotFadeTween = null;
            }

            this.spawnTapPulse(pointer.x, pointer.y);

            if (this.tapLikeInteraction) {
                this.cursorCore.setVisible(false);
                this.cursorCore.setAlpha(0);
            } else {
                this.cursorCore.setVisible(true);
                this.cursorCore.setAlpha(1);
                this.cursorCore.setPosition(pointer.x, pointer.y);
                this.cursorCore.setScale(0.7);
                this.applyCursorVisualState('down');
            }
        });

        const finishPointerInteraction = (pointer) => {
            this.lastPointerType = pointer.pointerType || this.lastPointerType || 'mouse';
            const shouldFadeDotWithRing = this.tapLikeInteraction || this.isCoarsePointer || this.lastPointerType === 'touch';

            // Start a fade-out for the dot. 
            // If a pointermove happens (hover), it will be cancelled.
            // If no move happens (tap on mobile), it will disappear.
            if (this.dotFadeTween) this.dotFadeTween.stop();
            if (shouldFadeDotWithRing) {
                this.cursorCore.setVisible(false);
                this.cursorCore.setAlpha(0);
                this.dotFadeTween = null;
            } else {
                this.dotFadeTween = this.tweens.add({
                    targets: this.cursorCore,
                    alpha: 0,
                    duration: 400,
                    delay: 150,
                    ease: 'Power2',
                    onComplete: () => {
                        this.cursorCore.setVisible(false);
                        this.dotFadeTween = null;
                    }
                });
            }

            if (!shouldFadeDotWithRing) {
                this.input.emit('pointermove', pointer);
            }

            this.tapLikeInteraction = false;
        };

        this.input.on('pointerup', finishPointerInteraction);
        this.input.on('pointerupoutside', finishPointerInteraction);

        // Force browser cursor off
        this.input.setDefaultCursor('none');
        this.scene.bringToTop();
    }

    spawnTapPulse(x, y) {
        const ring = this.add.circle(x, y, 12, 0xff4400, 0.4)
            .setStrokeStyle(3, 0xff6600, 1)
            .setDepth(1000000)
            .setAlpha(1)
            .setScale(0.5);
        const dot = this.add.circle(x, y, 3, 0xff6600, 1)
            .setDepth(1000001)
            .setAlpha(1)
            .setScale(1);

        this.tweens.add({
            targets: ring,
            scale: 1.45,
            alpha: 0,
            duration: 220,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                ring.destroy();
            }
        });

        this.tweens.add({
            targets: dot,
            alpha: 0,
            scale: 1.25,
            duration: 240,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                dot.destroy();
            }
        });
    }

    applyCursorVisualState(state) {
        if (state === 'hover') {
            this.cursorCore.setFillStyle(0xffaa00, 1);
            return;
        }

        if (state === 'down') {
            this.cursorCore.setFillStyle(0xffffff, 1);
            return;
        }

        this.cursorCore.setFillStyle(0xff6600, 1);
    }

    update() {
        if (!this.isCoarsePointer && this.lastPointerType !== 'touch') {
            const pointer = this.input.activePointer;
            if (pointer) {
                const timeSinceMove = this.time.now - (this.lastPointerMoveAt || 0);
                if (timeSinceMove < 120) {
                    if (this.dotFadeTween) {
                        this.dotFadeTween.stop();
                        this.dotFadeTween = null;
                    }
                    this.cursorCore.setVisible(true);
                    this.cursorCore.setAlpha(1);
                    this.cursorCore.setPosition(pointer.x, pointer.y);

                    if (this.isPointerOverInteractive) {
                        this.cursorCore.setScale(1.4);
                        this.applyCursorVisualState('hover');
                    } else {
                        this.cursorCore.setScale(1.0);
                        this.applyCursorVisualState('default');
                    }
                } else if (!this.dotFadeTween && this.cursorCore.visible && this.cursorCore.alpha > 0) {
                    this.dotFadeTween = this.tweens.add({
                        targets: this.cursorCore,
                        alpha: 0,
                        duration: 120,
                        ease: 'Power2',
                        onComplete: () => {
                            this.cursorCore.setVisible(false);
                            this.dotFadeTween = null;
                        }
                    });
                }
            }
        }
        this.scene.bringToTop();
    }
}
