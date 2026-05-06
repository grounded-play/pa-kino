import Phaser from 'phaser';
import { GameState } from '../GameState.js';
import { UI } from '../utils/UI.js';

export default class DirectorCutScene extends Phaser.Scene {
    constructor() {
        super('DirectorCutScene');
    }

    init(data) {
        this.win = Boolean(data?.win);
        this.abandoned = Boolean(data?.abandoned);
        this.finalScore = data?.score ?? GameState.currentRun.score ?? 0;
        this.moviesCompleted = data?.moviesCompleted ?? GameState.currentRun.currentFilmIndex ?? 0;
        this.completedFilms = data?.completedFilms ?? GameState.currentRun.filmography.slice(0, this.moviesCompleted);
        this.ballStats = data?.ballStats ?? { ...GameState.currentRun.ballStats };
    }

    create() {
        const { width, height } = this.scale;

        this.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0, 0);
        this.uiContainer = this.add.container(0, 0);

        const titleText = this.abandoned ? 'PRODUCTION ABANDONED' : (this.win ? 'FILMOGRAPHY COMPLETE!' : 'DIRECTOR CUT!');
        const titleColor = this.abandoned ? '#ff8844' : (this.win ? '#00ff88' : '#ff4444');

        const title = this.add.text(width / 2, 110, titleText, {
            fontSize: '66px',
            fontFamily: '"VT323", monospace',
            color: titleColor,
            stroke: '#000000',
            strokeThickness: 5,
            align: 'center'
        }).setOrigin(0.5);

        const panel = this.add.graphics();
        panel.fillStyle(0x000000, 0.7);
        panel.lineStyle(4, 0xffaa33, 1);
        panel.fillRoundedRect(width / 2 - 360, 190, 720, height - 470, 18);
        panel.strokeRoundedRect(width / 2 - 360, 190, 720, height - 470, 18);

        const summary = this.add.text(width / 2, 250, `FINAL BOX OFFICE: ${this.finalScore}\nMOVIES COMPLETED: ${this.moviesCompleted}`, {
            fontSize: '34px',
            fontFamily: '"VT323", monospace',
            color: '#ffdd88',
            align: 'center'
        }).setOrigin(0.5);

        const subtitle = this.add.text(width / 2, 340, 'WRAPPED FEATURES', {
            fontSize: '36px',
            fontFamily: '"VT323", monospace',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.uiContainer.add([panel, title, summary, subtitle]);

        let startY = 410;
        if (!this.completedFilms.length) {
            const none = this.add.text(width / 2, startY, 'No completed features this run.', {
                fontSize: '30px',
                fontFamily: '"VT323", monospace',
                color: '#999999'
            }).setOrigin(0.5);
            this.uiContainer.add(none);
        } else {
            this.completedFilms.slice(0, 8).forEach((film, index) => {
                const filmTitle = this.add.text(width / 2, startY + (index * 42), `- ${film.title}`, {
                    fontSize: '30px',
                    fontFamily: '"VT323", monospace',
                    color: '#ffffff'
                }).setOrigin(0.5);
                this.uiContainer.add(filmTitle);
            });

            if (this.completedFilms.length > 8) {
                const more = this.add.text(width / 2, startY + 8 * 42, `...and ${this.completedFilms.length - 8} more`, {
                    fontSize: '28px',
                    fontFamily: '"VT323", monospace',
                    color: '#999999'
                }).setOrigin(0.5);
                this.uiContainer.add(more);
            }
        }

        const statsText = this.add.text(width / 2, height - 320, `--- PRODUCTION STATS ---\nREELS: ${this.ballStats.reel} | VHS: ${this.ballStats.vhs} | DVDs: ${this.ballStats.dvd}`, {
            fontSize: '32px',
            fontFamily: '"VT323", monospace',
            color: '#ffaa00',
            align: 'center',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5);
        this.uiContainer.add(statsText);

        GameState.saveRunToGallery(this.win);

        const continueButton = UI.createChunkyButton(this, width / 2, height - 150, 380, 96, 'CONTINUE', () => {
            this.scene.start('MenuScene');
        });
        this.uiContainer.add(continueButton);

        UI.bouncyDropIn(this, this.uiContainer, -height, 0, 1000);
    }
}
