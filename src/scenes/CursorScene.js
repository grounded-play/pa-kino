import Phaser from 'phaser';

export default class CursorScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CursorScene', active: true });
    }

    create() {
        this.cursor = this.add.circle(0, 0, 9, 0xff8800, 0.2)
            .setStrokeStyle(3, 0xffaa00, 1)
            .setDepth(1000000);
        this.cursorCore = this.add.circle(0, 0, 2, 0xffcc66, 1)
            .setDepth(1000001);

        this.applyCursorVisualState('default');
        
        this.input.on('pointermove', (pointer) => {
            this.cursor.setPosition(pointer.x, pointer.y);
            this.cursorCore.setPosition(pointer.x, pointer.y);
            
            // Check if we are over something interactive
            // We search through all active scenes for interactive objects at this point
            let isOverInteractive = false;
            this.game.scene.scenes.forEach(scene => {
                if (scene.scene.key === 'CursorScene') return;
                if (!scene.scene.isActive()) return;
                
                const hovered = scene.input.hitTestPointer(pointer);
                if (hovered && hovered.length > 0) {
                    isOverInteractive = true;
                }
            });

            if (isOverInteractive) {
                this.cursor.setScale(1.5);
                this.cursorCore.setScale(1.2);
                this.applyCursorVisualState('hover');
            } else {
                this.cursor.setScale(1.0);
                this.cursorCore.setScale(1.0);
                this.applyCursorVisualState('default');
            }
        });

        this.input.on('pointerdown', () => {
            this.cursor.setScale(0.8);
            this.cursorCore.setScale(0.9);
            this.applyCursorVisualState('down');
        });

        this.input.on('pointerup', (pointer) => {
            // Restore state based on what we are over
            this.input.emit('pointermove', pointer);
        });

        // Force browser cursor off again just in case
        this.input.setDefaultCursor('none');
        this.scene.bringToTop();
    }

    applyCursorVisualState(state) {
        if (state === 'hover') {
            this.cursor.setFillStyle(0xffff00, 0.24);
            this.cursor.setStrokeStyle(3, 0xffff66, 1);
            this.cursorCore.setFillStyle(0xffff99, 1);
            return;
        }

        if (state === 'down') {
            this.cursor.setFillStyle(0xff5522, 0.3);
            this.cursor.setStrokeStyle(3, 0xff4400, 1);
            this.cursorCore.setFillStyle(0xff7744, 1);
            return;
        }

        this.cursor.setFillStyle(0xff8800, 0.2);
        this.cursor.setStrokeStyle(3, 0xffaa00, 1);
        this.cursorCore.setFillStyle(0xffcc66, 1);
    }

    update() {
        // Aggressively stay on top and visible
        this.cursor.setVisible(true);
        this.cursorCore.setVisible(true);
        this.scene.bringToTop();
    }
}
