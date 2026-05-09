import Phaser from 'phaser';

export default class SplashScene extends Phaser.Scene {
    constructor() {
        super('SplashScene');
    }

    preload() {
        this.load.image('tcc_logo', 'assets/images/Logo.jpg');
    }

    create() {
        const { width, height } = this.scale;

        if (this.textures.exists('tcc_logo')) {
            const logo = this.add.image(width / 2, -500, 'tcc_logo').setOrigin(0.5);
            const scale = 400 / logo.width;
            logo.setScale(scale);

            // Slide in
            this.tweens.add({
                targets: logo,
                y: height / 2,
                duration: 1200,
                ease: 'Bounce.easeOut',
                onComplete: () => {
                    // Hold 1.5 seconds then transition
                    this.time.delayedCall(1500, () => {
                        // Slide out
                        this.tweens.add({
                            targets: logo,
                            y: height + 500,
                            duration: 800,
                            ease: 'Back.easeIn',
                            onComplete: () => {
                                this.scene.start('MenuScene');
                            }
                        });
                    });
                }
            });
        } else {
            // Fallback if logo failed to load
            this.time.delayedCall(500, () => {
                this.scene.start('MenuScene');
            });
        }
    }
}
