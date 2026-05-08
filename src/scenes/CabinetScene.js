import Phaser from 'phaser';
import { GameState } from '../GameState.js';

export default class CabinetScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CabinetScene', active: false });
        this.scanlineTextureKey = 'cabinet-scanline-strip';
        this.scanlineBaseAlpha = 0.15;
        this.scanlineScrollSpeed = 1;
        this.scanlineScrollOffset = 0;
        this.scanlineJitterOffsetX = 0;
        this.scanlineJitterOffsetY = 0;
    }

    create() {
        const { width, height } = this.scale;

        // High depth to ensure it's always on top
        this.overlayContainer = this.add.container(0, 0).setDepth(10000).setScrollFactor(0);

        this.ensureScanlineTexture();
        this.drawBezel(width, height);
        this.addScanlines(width, height);
        this.addVignette(width, height);
        this.addBranding(width, height);
    }

    ensureScanlineTexture() {
        if (this.textures.exists(this.scanlineTextureKey)) {
            return;
        }

        const scanlineTexture = this.textures.createCanvas(this.scanlineTextureKey, 1, 4);
        const context = scanlineTexture.getContext();

        context.clearRect(0, 0, 1, 4);
        context.fillStyle = 'rgba(0, 0, 0, 1)';
        context.fillRect(0, 0, 1, 1);

        scanlineTexture.refresh();
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
        graphics.arc(thickness + cornerRadius, thickness + cornerRadius, cornerRadius, -Math.PI / 2, Math.PI, true);
        graphics.lineTo(thickness, thickness);
        graphics.closePath();
        graphics.fillPath();
        graphics.fillRect(0, 0, thickness + cornerRadius, thickness);
        graphics.fillRect(0, 0, thickness, thickness + cornerRadius);

        // Top Right
        graphics.beginPath();
        graphics.moveTo(width - thickness, thickness);
        graphics.lineTo(width - thickness - cornerRadius, thickness);
        graphics.arc(width - thickness - cornerRadius, thickness + cornerRadius, cornerRadius, -Math.PI / 2, 0, false);
        graphics.lineTo(width - thickness, thickness);
        graphics.closePath();
        graphics.fillPath();
        graphics.fillRect(width - thickness - cornerRadius, 0, thickness + cornerRadius, thickness);
        graphics.fillRect(width - thickness, 0, thickness, thickness + cornerRadius);

        // Bottom Left
        graphics.beginPath();
        graphics.moveTo(thickness, height - thickness);
        graphics.lineTo(thickness + cornerRadius, height - thickness);
        graphics.arc(thickness + cornerRadius, height - thickness - cornerRadius, cornerRadius, Math.PI / 2, Math.PI, false);
        graphics.lineTo(thickness, height - thickness);
        graphics.closePath();
        graphics.fillPath();
        graphics.fillRect(0, height - thickness, thickness + cornerRadius, thickness);
        graphics.fillRect(0, height - thickness - cornerRadius, thickness, thickness + cornerRadius);

        // Bottom Right
        graphics.beginPath();
        graphics.moveTo(width - thickness, height - thickness);
        graphics.lineTo(width - thickness - cornerRadius, height - thickness);
        graphics.arc(width - thickness - cornerRadius, height - thickness - cornerRadius, cornerRadius, Math.PI / 2, 0, true);
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
        this.scanlines = this.add.container(0, 0);
        this.scanlinesPrimary = this.add.tileSprite(0, 0, width, height, this.scanlineTextureKey)
            .setOrigin(0, 0);
        this.scanlinesSecondary = this.add.tileSprite(0, 0, width, height, this.scanlineTextureKey)
            .setOrigin(0, 0);

        this.scanlines.add([this.scanlinesPrimary, this.scanlinesSecondary]);
        this.syncScanlineLayers();
        this.overlayContainer.add(this.scanlines);
        this.refreshScanlines();

        this.handleScanlineImpact = (intensity = 1) => {
            this.triggerScanlineJitter(intensity);
        };

        this.game.events.on('game-impact', this.handleScanlineImpact);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            if (this.handleScanlineImpact) {
                this.game.events.off('game-impact', this.handleScanlineImpact);
            }
        });
    }

    triggerScanlineJitter(intensity = 1) {
        if (!this.scanlines || !this.scanlines.visible) return;

        if (this.scanlineJitterTween) {
            this.scanlineJitterTween.stop();
        }

        const offsetX = 2 * intensity;
        const offsetY = 1.5 * intensity;

        // Briefly wobble the UVs and thicken the effect with a stronger alpha spike.
        this.scanlineJitterTween = this.tweens.add({
            targets: this,
            scanlineJitterOffsetX: { from: -offsetX, to: offsetX },
            scanlineJitterOffsetY: { from: -offsetY, to: offsetY },
            scanlineBaseAlpha: { from: 0.15, to: Math.min(0.35, 0.15 + (0.08 * intensity)) },
            duration: 45,
            yoyo: true,
            repeat: 2,
            onUpdate: () => {
                this.syncScanlineLayers();
            },
            onComplete: () => {
                if (!this.scanlinesPrimary || !this.scanlinesSecondary) {
                    return;
                }

                this.scanlineJitterOffsetX = 0;
                this.scanlineJitterOffsetY = 0;
                this.scanlineBaseAlpha = 0.15;
                this.syncScanlineLayers();
                this.scanlineJitterTween = null;
            }
        });
    }

    update(_time, delta) {
        if (!this.scanlinesPrimary || !this.scanlinesSecondary) {
            return;
        }

        this.scanlineScrollOffset = (this.scanlineScrollOffset + ((delta / 1000) * this.scanlineScrollSpeed)) % 4;
        this.syncScanlineLayers();
    }

    syncScanlineLayers() {
        if (!this.scanlinesPrimary || !this.scanlinesSecondary) {
            return;
        }

        const integerOffset = Math.floor(this.scanlineScrollOffset);
        const fractionalOffset = this.scanlineScrollOffset - integerOffset;
        const primaryAlpha = this.scanlineBaseAlpha * (1 - fractionalOffset);
        const secondaryAlpha = this.scanlineBaseAlpha * fractionalOffset;

        this.scanlinesPrimary.tilePositionX = this.scanlineJitterOffsetX;
        this.scanlinesPrimary.tilePositionY = integerOffset + this.scanlineJitterOffsetY;
        this.scanlinesPrimary.alpha = primaryAlpha;

        this.scanlinesSecondary.tilePositionX = this.scanlineJitterOffsetX;
        this.scanlinesSecondary.tilePositionY = integerOffset + 1 + this.scanlineJitterOffsetY;
        this.scanlinesSecondary.alpha = secondaryAlpha;
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
        vignette.arc(radius, radius, radius, -Math.PI / 2, Math.PI, true);
        vignette.lineTo(0, 0);
        vignette.closePath();
        vignette.fillPath();

        // Top Right
        vignette.beginPath();
        vignette.moveTo(width, 0);
        vignette.lineTo(width - radius, 0);
        vignette.arc(width - radius, radius, radius, -Math.PI / 2, 0, false);
        vignette.lineTo(width, 0);
        vignette.closePath();
        vignette.fillPath();

        // Bottom Left
        vignette.beginPath();
        vignette.moveTo(0, height);
        vignette.lineTo(radius, height);
        vignette.arc(radius, height - radius, radius, Math.PI / 2, Math.PI, false);
        vignette.lineTo(0, height);
        vignette.closePath();
        vignette.fillPath();

        // Bottom Right
        vignette.beginPath();
        vignette.moveTo(width, height);
        vignette.lineTo(width - radius, height);
        vignette.arc(width - radius, height - radius, radius, Math.PI / 2, 0, true);
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
