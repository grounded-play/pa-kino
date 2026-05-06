import Phaser from 'phaser';
import { GameState } from '../GameState.js';

export default class CabinetScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CabinetScene', active: false });
    }

    create() {
        const { width, height } = this.scale;
        
        // High depth to ensure it's always on top
        this.overlayContainer = this.add.container(0, 0).setDepth(10000).setScrollFactor(0);

        this.drawBezel(width, height);
        this.addScanlines(width, height);
        this.addVignette(width, height);
        this.addBranding(width, height);
    }

    drawBezel(width, height) {
        const graphics = this.add.graphics();
        const thickness = 60;
        const cornerRadius = 100;

        // Dark Cabinet Frame (Outer)
        graphics.fillStyle(0x050505, 1);
        
        // Top
        graphics.fillRect(0, 0, width, thickness);
        // Bottom
        graphics.fillRect(0, height - thickness, width, thickness);
        // Left
        graphics.fillRect(0, 0, thickness, height);
        // Right
        graphics.fillRect(width - thickness, 0, thickness, height);

        // Solid Corner Fills (Matte off the areas outside the curve)
        graphics.fillStyle(0x050505, 1);
        
        // Top Left
        graphics.beginPath();
        graphics.moveTo(thickness, thickness);
        graphics.lineTo(thickness + cornerRadius, thickness);
        graphics.arc(thickness + cornerRadius, thickness + cornerRadius, cornerRadius, -Math.PI/2, Math.PI, true);
        graphics.lineTo(thickness, thickness);
        graphics.closePath();
        graphics.fillPath();
        graphics.fillRect(0, 0, thickness + cornerRadius, thickness);
        graphics.fillRect(0, 0, thickness, thickness + cornerRadius);

        // Top Right
        graphics.beginPath();
        graphics.moveTo(width - thickness, thickness);
        graphics.lineTo(width - thickness - cornerRadius, thickness);
        graphics.arc(width - thickness - cornerRadius, thickness + cornerRadius, cornerRadius, -Math.PI/2, 0, false);
        graphics.lineTo(width - thickness, thickness);
        graphics.closePath();
        graphics.fillPath();
        graphics.fillRect(width - thickness - cornerRadius, 0, thickness + cornerRadius, thickness);
        graphics.fillRect(width - thickness, 0, thickness, thickness + cornerRadius);

        // Bottom Left
        graphics.beginPath();
        graphics.moveTo(thickness, height - thickness);
        graphics.lineTo(thickness + cornerRadius, height - thickness);
        graphics.arc(thickness + cornerRadius, height - thickness - cornerRadius, cornerRadius, Math.PI/2, Math.PI, false);
        graphics.lineTo(thickness, height - thickness);
        graphics.closePath();
        graphics.fillPath();
        graphics.fillRect(0, height - thickness, thickness + cornerRadius, thickness);
        graphics.fillRect(0, height - thickness - cornerRadius, thickness, thickness + cornerRadius);

        // Bottom Right
        graphics.beginPath();
        graphics.moveTo(width - thickness, height - thickness);
        graphics.lineTo(width - thickness - cornerRadius, height - thickness);
        graphics.arc(width - thickness - cornerRadius, height - thickness - cornerRadius, cornerRadius, Math.PI/2, 0, true);
        graphics.lineTo(width - thickness, height - thickness);
        graphics.closePath();
        graphics.fillPath();
        graphics.fillRect(width - thickness - cornerRadius, height - thickness, thickness + cornerRadius, thickness);
        graphics.fillRect(width - thickness, height - thickness - cornerRadius, thickness, thickness + cornerRadius);

        // CRT Inner Glow / Border
        graphics.lineStyle(12, 0x222222, 1);
        graphics.strokeRoundedRect(thickness, thickness, width - (thickness * 2), height - (thickness * 2), cornerRadius);

        // Glass reflection / depth
        graphics.lineStyle(2, 0xffffff, 0.05);
        graphics.strokeRoundedRect(thickness + 6, thickness + 6, width - (thickness * 2) - 12, height - (thickness * 2) - 12, cornerRadius);

        this.overlayContainer.add(graphics);
    }

    addScanlines(width, height) {
        this.scanlines = this.add.graphics();
        this.scanlines.lineStyle(1, 0x000000, 0.15);
        
        // Draw slightly more lines to allow for scrolling without gaps
        for (let i = -8; i < height + 8; i += 4) {
            this.scanlines.lineBetween(0, i, width, i);
        }
        
        this.overlayContainer.add(this.scanlines);
        this.refreshScanlines();

        // 1. Continuous subtle rolling effect (Slow crawl)
        this.scanlineTween = this.tweens.add({
            targets: this.scanlines,
            y: 4,
            duration: 4000,
            repeat: -1,
            ease: 'Linear'
        });

        // 2. Global event listener for game impacts to trigger reactive jitter
        this.game.events.on('game-impact', (intensity = 1) => {
            this.triggerScanlineJitter(intensity);
        });
    }

    triggerScanlineJitter(intensity = 1) {
        if (!this.scanlines || !this.scanlines.visible) return;

        // Briefly speed up the roll and add horizontal jitter
        this.tweens.add({
            targets: this.scanlines,
            x: { from: -2 * intensity, to: 2 * intensity },
            alpha: { from: 0.15, to: 0.3 },
            duration: 40,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                this.scanlines.x = 0;
                this.scanlines.alpha = 1; // Alpha is handled by visible, but let's be safe
            }
        });
    }

    addVignette(width, height) {
        // Subtle corner shadowing
        const vignette = this.add.graphics();
        
        // Radial gradient is hard in Graphics, so we'll use a pre-rendered texture if possible
        // or just a set of thick outer shadows.
        
        vignette.fillStyle(0x000000, 0.4);
        
        // We'll draw 4 corner arcs
        const radius = 200;
        
        // Top Left
        vignette.beginPath();
        vignette.moveTo(0, 0);
        vignette.lineTo(radius, 0);
        vignette.arc(radius, radius, radius, -Math.PI/2, Math.PI, true);
        vignette.lineTo(0, 0);
        vignette.closePath();
        vignette.fillPath();

        // Top Right
        vignette.beginPath();
        vignette.moveTo(width, 0);
        vignette.lineTo(width - radius, 0);
        vignette.arc(width - radius, radius, radius, -Math.PI/2, 0, false);
        vignette.lineTo(width, 0);
        vignette.closePath();
        vignette.fillPath();

        // Bottom Left
        vignette.beginPath();
        vignette.moveTo(0, height);
        vignette.lineTo(radius, height);
        vignette.arc(radius, height - radius, radius, Math.PI/2, Math.PI, false);
        vignette.lineTo(0, height);
        vignette.closePath();
        vignette.fillPath();

        // Bottom Right
        vignette.beginPath();
        vignette.moveTo(width, height);
        vignette.lineTo(width - radius, height);
        vignette.arc(width - radius, height - radius, radius, Math.PI/2, 0, true);
        vignette.lineTo(width, height);
        vignette.closePath();
        vignette.fillPath();

        this.overlayContainer.add(vignette);
    }

    addBranding(width, height) {
        const brand = this.add.text(width / 2, height - 20, 'TCC ARCADES // PLOPKINO SYSTEM', {
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#444'
        }).setOrigin(0.5);
        
        this.overlayContainer.add(brand);
    }

    refreshScanlines() {
        if (!this.scanlines) {
            return;
        }

        this.scanlines.setVisible(GameState.getDisplaySettings(this).scanlinesEnabled);
    }
}
