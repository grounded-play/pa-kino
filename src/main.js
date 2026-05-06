import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import SplashScene from './scenes/SplashScene.js';
import BackgroundScene from './scenes/BackgroundScene.js';
import MenuScene from './scenes/MenuScene.js';
import DirectorSelectScene from './scenes/DirectorSelectScene.js';
import PachinkoScene from './scenes/PachinkoScene.js';
import ShopScene from './scenes/ShopScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import DirectorCutScene from './scenes/DirectorCutScene.js';
import CabinetScene from './scenes/CabinetScene.js';
import ChromaKeyPipeline from './utils/ChromaKeyPipeline.js';
import WarpPipeline from './utils/WarpPipeline.js';

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    clearBeforeRender: true,
    render: {
        antialias: false,
        pixelArt: true,
        clearBeforeRender: true
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        expandParent: true,
        width: 1080,
        height: 1920,
    },
    backgroundColor: '#000000',
    audio: {
        disableWebAudio: false,
        pauseOnBlur: false // Prevent audio cutting out during fullscreen transitions
    },
    physics: {
        default: 'matter',
        matter: {
            debug: false, // Turn off debug for polish phase
            gravity: { y: 1 } // Standard downward gravity
        }
    },
    scene: [BootScene, SplashScene, BackgroundScene, MenuScene, DirectorSelectScene, PachinkoScene, ShopScene, GameOverScene, DirectorCutScene, CabinetScene],
    pipeline: { 
        'ChromaKey': ChromaKeyPipeline,
        'Warp': WarpPipeline
    }
};

const game = new Phaser.Game(config);
