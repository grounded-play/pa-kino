import Phaser from 'phaser';
import { GameState } from '../GameState.js';

import { UI } from '../utils/UI.js';

export default class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    init(data) {
        this.win = data.win;
    }

    create() {
        const { width, height } = this.scale;

        // Background Dimming
        this.add.rectangle(0, 0, width, height, 0x000000, 0.4).setOrigin(0, 0);

        this.uiContainer = this.add.container(0, 0);

        const titleText = this.win ? 'FILMOGRAPHY COMPLETE!' : 'DIRECTOR CUT!';
        const color = this.win ? '#00ff00' : '#ff0000';

        const title = this.add.text(width / 2, 100, titleText, {
            fontSize: '70px',
            fontFamily: '"VT323", monospace',
            color: color,
            shadow: { offsetX: 3, offsetY: 3, color: '#000', fill: true }
        }).setOrigin(0.5);

        // Stats panel
        const statsPanelBg = this.add.graphics();
        statsPanelBg.fillStyle(0x000000, 0.6);
        statsPanelBg.fillRoundedRect(width / 2 - 300, 160, 600, 80 + (GameState.currentRun.currentFilmIndex * 40), 16);
        this.uiContainer.add(statsPanelBg);

        const subtitle = this.add.text(width / 2, 200, 'FILMS BEATEN THIS RUN:', {
            fontSize: '40px',
            fontFamily: '"VT323", monospace',
            color: '#ffcc00',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        this.uiContainer.add([title, subtitle]);

        // Display beaten films
        const beatenFilms = GameState.currentRun.filmography.slice(0, GameState.currentRun.currentFilmIndex);
        
        let startY = 280;
        if (beatenFilms.length === 0) {
            const noneTxt = this.add.text(width / 2, startY, 'None...', { fontSize: '30px', fontFamily: '"VT323", monospace', color: '#555' }).setOrigin(0.5);
            this.uiContainer.add(noneTxt);
        } else {
            beatenFilms.forEach((film, index) => {
                if (index < 8) { // Slightly fewer to fit stats
                    const fTxt = this.add.text(width / 2, startY + (index * 40), `- ${film.title}`, {
                        fontSize: '30px', fontFamily: '"VT323", monospace', color: '#ffffff'
                    }).setOrigin(0.5);
                    this.uiContainer.add(fTxt);
                }
            });
            if (beatenFilms.length > 8) {
                const moreTxt = this.add.text(width / 2, startY + 320, `...and ${beatenFilms.length - 8} more`, { fontSize: '30px', fontFamily: '"VT323", monospace', color: '#888' }).setOrigin(0.5);
                this.uiContainer.add(moreTxt);
            }
        }

        // Ball Stat Breakdown
        const ballStats = GameState.currentRun.ballStats;
        const statsStr = `--- PRODUCTION STATS ---\nREELS: ${ballStats.reel} | VHS: ${ballStats.vhs} | DVDs: ${ballStats.dvd}`;
        const statsDisplay = this.add.text(width / 2, height - 320, statsStr, {
            fontSize: '32px',
            fontFamily: '"VT323", monospace',
            color: '#ffaa00',
            align: 'center',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5);
        this.uiContainer.add(statsDisplay);

        // Adjust panel background height to fit stats
        statsPanelBg.clear();
        statsPanelBg.fillStyle(0x000000, 0.6);
        statsPanelBg.fillRoundedRect(width / 2 - 300, 160, 600, height - 420, 16);

        // Save to gallery
        GameState.saveRunToGallery();

        // Main Menu Button
        const menuBtnContainer = UI.createChunkyButton(this, width / 2, height - 150, 400, 100, 'MAIN MENU', () => {
            this.scene.start('MenuScene');
        });
        this.uiContainer.add(menuBtnContainer);

        UI.bouncyDropIn(this, this.uiContainer, -height, 0, 1000);
    }
}
