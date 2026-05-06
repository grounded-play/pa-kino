import Phaser from 'phaser';
import { GameState } from '../GameState.js';
import { UI } from '../utils/UI.js';

export default class ShopScene extends Phaser.Scene {
    constructor() {
        super('ShopScene');
        this.upgradePool = [
            { id: 'extra_balls', title: '+5 BALLS', desc: 'Add 5 extra film reels to your starting stock.', cost: 3000, mod: { startingBalls: 5 } },
            { id: 'bouncy_pegs', title: 'BOUNCIER PEGS', desc: 'Pegs gain +25% restitution. Higher bounce, more chaos.', cost: 2500, mod: { pegBounce: 0.25 } },
            { id: 'big_explosion', title: 'IMAX BLAST', desc: 'Increase anti-stuck explosion radius by 50%.', cost: 2000, mod: { explosionRadiusMult: 1.5 } },
            { id: 'wide_buckets', title: 'WIDE SCREEN', desc: 'Catch-buckets are 20% wider for easier scoring.', cost: 3500, mod: { bucketWidthMult: 1.2 } },
            { id: 'slow_funnel', title: 'STEADY CAM', desc: 'The funnel moves 30% slower for precise timing.', cost: 1500, mod: { funnelSpeedMult: 0.7 } },
            { id: 'stretch_pads', title: 'GRIP EQUIPMENT', desc: 'Start every level with 2 free Stretch Pads.', cost: 2000, mod: { startingStretchPads: 2 } },
            { id: 'multi_ball', title: 'RE-SHOOTS', desc: 'Gain 3 Multi-Ball powerups for the next film.', cost: 4000, mod: { startingMultiBalls: 3 } }
        ];
    }

    init() {
        // Selection logic: Pick 3 unique randoms
        this.offeredUpgrades = Phaser.Utils.Array.Shuffle([...this.upgradePool]).slice(0, 3);
    }

    create() {
        const { width, height } = this.scale;
        const sidebarWidth = Math.max(300, Math.floor(width * 0.3));
        const boardWidth = width - sidebarWidth;

        // 1. Theme Layout (Respecting 70/Focus, 30/Sidebar)
        this.add.rectangle(0, 0, boardWidth, height, 0x111111).setOrigin(0, 0);
        this.add.rectangle(boardWidth, 0, sidebarWidth, height, 0x050505).setOrigin(0, 0);
        this.add.rectangle(boardWidth, 0, 4, height, 0xffaa00).setOrigin(0, 0);

        // 2. IMDb Rating Recap (Sidebar)
        const rating = GameState.currentRun.lastRating || 'N/A';
        const ratingTitle = this.add.text(boardWidth + 20, 40, 'PREVIOUS FILM RATING', {
            fontSize: '24px', fontFamily: '"VT323", monospace', color: '#ffcc00'
        });
        const ratingScore = this.add.text(boardWidth + 20, 80, `${rating}/10`, {
            fontSize: '64px', fontFamily: '"VT323", monospace', color: '#f5c518'
        });
        
        const budgetLabel = this.add.text(boardWidth + 20, 200, 'AVAILABLE BUDGET', {
            fontSize: '20px', fontFamily: '"VT323", monospace', color: '#aaa'
        });
        this.budgetTxt = this.add.text(boardWidth + 20, 230, `$${GameState.currentRun.score}M`, {
            fontSize: '44px', fontFamily: '"VT323", monospace', color: '#00ff00'
        });

        // 3. Upgrade Cards (70% Focus Area)
        const cardWidth = 240;
        const cardHeight = 360;
        const startX = (boardWidth / 2) - (cardWidth * 1.5) + 60;
        const cardY = height / 2 - 40;

        this.offeredUpgrades.forEach((upgrade, index) => {
            const container = this.add.container(startX + (index * (cardWidth + 40)), cardY);
            
            const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x222222).setStrokeStyle(4, 0x444444);
            const filmStrip = this.add.rectangle(0, -cardHeight/2 + 20, cardWidth, 40, 0x000000);
            const title = this.add.text(0, -cardHeight/2 + 60, upgrade.title, {
                fontSize: '28px', fontFamily: '"VT323", monospace', color: '#ffcc00', align: 'center', wordWrap: { width: cardWidth - 20 }
            }).setOrigin(0.5);
            
            const desc = this.add.text(0, -20, upgrade.desc, {
                fontSize: '18px', fontFamily: '"VT323", monospace', color: '#ccc', align: 'center', wordWrap: { width: cardWidth - 30 }
            }).setOrigin(0.5);

            const costBtn = UI.createChunkyButton(this, 0, cardHeight/2 - 50, cardWidth - 40, 60, `$${upgrade.cost}M`, () => {
                this.purchaseUpgrade(upgrade, container);
            });

            container.add([bg, filmStrip, title, desc, costBtn]);
            container.setScale(0);

            this.tweens.add({
                targets: container,
                scaleX: 1,
                scaleY: 1,
                duration: 600,
                delay: index * 200,
                ease: 'Back.easeOut',
                onStart: () => {
                    const settings = GameState.getAudioSettings(this);
                    if (!this.sound.mute && this.cache.audio.exists('sfx_click')) {
                        this.sound.play('sfx_click', { volume: 0.5 * (settings.sfxVolume ?? 1) });
                    }
                }
            });
        });

        // 4. Footer Controls
        const nextBtn = UI.createChunkyButton(this, boardWidth / 2, height - 80, 300, 70, 'NEXT FILMING >', () => {
            if (this.scale.fullscreenSupported && !this.scale.isFullscreen) {
                this.scale.startFullscreen();
            }
            this.scene.start('PachinkoScene');
        });

        // 5. Ambient sound
        const settings = GameState.getAudioSettings(this);
        if (!this.sound.mute && this.cache.audio.exists('sfx_oscar')) {
            this.sound.play('sfx_oscar', { volume: 0.3 * (settings.sfxVolume ?? 1) });
        }
    }

    purchaseUpgrade(upgrade, container) {
        if (GameState.currentRun.score >= upgrade.cost) {
            GameState.currentRun.score -= upgrade.cost;
            this.budgetTxt.setText(`$${GameState.currentRun.score}M`);
            
            // Apply modifiers
            Object.assign(GameState.currentRun.modifiers, upgrade.mod);

            // Visual feedback
            const label = container.list.find(c => c.text === `$${upgrade.cost}M`);
            if (label) label.setText('PURCHASED');
            container.setAlpha(0.7);
            
            // Disable further clicks on this card
            container.list.forEach(c => { if(c.disableInteractive) c.disableInteractive(); });

            if (!this.sound.mute && this.cache.audio.exists('sfx_win1')) {
                const settings = GameState.getAudioSettings(this);
                this.sound.play('sfx_win1', { volume: 0.8 * (settings.sfxVolume ?? 1) });
            }
        } else {
            this.cameras.main.shake(100, 0.005);
        }
    }
}
