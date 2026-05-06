import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        const { width, height } = this.scale;

        // Background
        this.add.rectangle(0, 0, width, height, 0x0f3460).setOrigin(0, 0);

        // Game text
        this.add.text(width / 2, height / 2, 'GAME STARTED\n(Placeholder)', {
            fontSize: '60px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
            align: 'center',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Back to menu button
        const backButtonText = this.add.text(width / 2, height - 200, '< BACK TO MENU', {
            fontSize: '40px',
            fontFamily: 'Arial, sans-serif',
            color: '#e94560',
            fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        backButtonText.on('pointerover', () => backButtonText.setColor('#ff6b81'));
        backButtonText.on('pointerout', () => backButtonText.setColor('#e94560'));
        backButtonText.on('pointerdown', () => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                this.scene.start('MenuScene');
            });
        });
    }
}
