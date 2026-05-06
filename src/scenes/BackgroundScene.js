import Phaser from 'phaser';
import { GameState } from '../GameState.js';

export default class BackgroundScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BackgroundScene', active: false });
    }

    create() {
        const { width, height } = this.scale;
        this.clickRipplesEnabled = true;
        this.cubeHalfWidth = 128;
        this.cubeHalfHeight = 64;
        this.cubeHeight = 256;
        this.buffer = 400;
        this.recycleChance = 0.4;
        this.conveyorVelocity = new Phaser.Math.Vector2(-160, -80);

        // Base dark cinematic color - Make it interactive to catch clicks
        const bgRect = this.add.rectangle(0, 0, width, height, 0x1a0a00).setOrigin(0, 0);
        bgRect.setInteractive();
        bgRect.on('pointerdown', (pointer) => {
            if (this.shouldSpawnClickRipple()) {
                this.spawnBall(pointer.x, pointer.y);
            }
        });

        // Persistent BGM management - now triggered by BootScene

        // Draw isometric 3D cube texture
        if (!this.textures.exists('iso_cube')) {
            const boxGr = this.make.graphics({ x: 0, y: 0, add: false });
            
            // Top face (diamond)
            boxGr.fillStyle(0x552200, 1);
            boxGr.beginPath();
            boxGr.moveTo(this.cubeHalfWidth, 0);
            boxGr.lineTo(this.cubeHalfWidth * 2, this.cubeHalfHeight);
            boxGr.lineTo(this.cubeHalfWidth, this.cubeHalfHeight * 2);
            boxGr.lineTo(0, this.cubeHalfHeight);
            boxGr.closePath();
            boxGr.fillPath();
            boxGr.lineStyle(2, 0xff8800);
            boxGr.strokePath();

            // Left face
            boxGr.fillStyle(0x331100, 1);
            boxGr.beginPath();
            boxGr.moveTo(0, this.cubeHalfHeight);
            boxGr.lineTo(this.cubeHalfWidth, this.cubeHalfHeight * 2);
            boxGr.lineTo(this.cubeHalfWidth, this.cubeHeight);
            boxGr.lineTo(0, this.cubeHalfHeight + this.cubeHalfHeight);
            boxGr.closePath();
            boxGr.fillPath();
            boxGr.strokePath();

            // Right face
            boxGr.fillStyle(0x1a0500, 1);
            boxGr.beginPath();
            boxGr.moveTo(this.cubeHalfWidth, this.cubeHalfHeight * 2);
            boxGr.lineTo(this.cubeHalfWidth * 2, this.cubeHalfHeight);
            boxGr.lineTo(this.cubeHalfWidth * 2, this.cubeHalfHeight + this.cubeHalfHeight);
            boxGr.lineTo(this.cubeHalfWidth, this.cubeHeight);
            boxGr.closePath();
            boxGr.fillPath();
            boxGr.strokePath();
            
            boxGr.generateTexture('iso_cube', this.cubeHalfWidth * 2, this.cubeHeight);
        }

        this.boxes = [];
        
        // Spawn timer for cubes (A few at a time)
        this.time.addEvent({
            delay: 700,
            callback: () => this.spawnCube(),
            loop: true
        });

        // Initial scatter: Start with some cubes already on screen
        for (let i = 0; i < 20; i++) {
            this.spawnCube(true);
        }

        this.balls = [];

        // Input handling now handled by the background rectangle

        // Apply Circular Warp Shader Pipeline
        this.cameras.main.setPostPipeline('Warp');

        this.timeTick = 0;
        this.wheelVortex = { x: width / 2, y: height * 0.35, radius: 300, power: 0 };
        this.createPhysicalWheel(width / 2, height * 0.35, 300);
    }

    shouldSpawnClickRipple() {
        if (!this.clickRipplesEnabled) {
            return false;
        }

        if (this.scene.isActive('PachinkoScene')) {
            return false;
        }

        return [
            'MenuScene',
            'DirectorSelectScene',
            'ShopScene',
            'GameOverScene',
            'SplashScene',
            'BootScene'
        ].some((sceneKey) => this.scene.isActive(sceneKey));
    }

    setClickRipplesEnabled(enabled) {
        this.clickRipplesEnabled = enabled;
    }

    createPhysicalWheel(x, y, radius) {
        // Physical spinning gear in the background
        this.bgWheelBody = this.matter.add.circle(x, y, radius, {
            isStatic: true,
            restitution: 0.8,
            friction: 0.1,
            label: 'bg_wheel'
        });

        // Stylized "Back-Gear" visual - Positioned at x,y and drawn at 0,0 for correct rotation
        this.bgWheelVisual = this.add.graphics({ x, y });
        this.bgWheelVisual.lineStyle(8, 0xffaa00, 0.15);
        this.bgWheelVisual.strokeCircle(0, 0, radius);
        
        // Draw 12 spokes for a more mechanical look
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            this.bgWheelVisual.lineBetween(
                0, 0,
                Math.cos(angle) * radius,
                Math.sin(angle) * radius
            );
        }
        this.bgWheelVisual.setDepth(5); 
    }

    syncBgWheel(rotation) {
        if (this.bgWheelBody) {
            this.matter.body.setAngle(this.bgWheelBody, rotation);
        }
        if (this.bgWheelVisual) {
            this.bgWheelVisual.rotation = rotation;
            // Since graphics are centered, rotation works best if we redrew it at 0,0
            // but for a simple circle/spokes, we can just rotate the whole object if we move its origin
        }
    }

    setWheelVortex(x, y, radius, power) {
        this.wheelVortex = { x, y, radius, power };
    }

    setWheelVortex(x, y, radius, power) {
        this.wheelVortex = { x, y, radius, power };
    }

    spawnCube(onScreen = false) {
        const { width, height } = this.scale;
        let x, y;

        if (onScreen) {
            x = Phaser.Math.Between(-this.buffer, width + this.buffer);
            y = Phaser.Math.Between(-this.buffer, height + this.buffer);
        } else {
            // Spawn at the bottom or right edges so they move into view (up and left)
            if (Math.random() > 0.5) {
                x = width + this.buffer;
                y = Phaser.Math.Between(0, height + this.buffer);
            } else {
                x = Phaser.Math.Between(0, width + this.buffer);
                y = height + this.buffer;
            }
        }

        const visual = this.add.image(x, y, 'iso_cube').setOrigin(0, 0);
        visual.setAlpha(Phaser.Math.FloatBetween(0.8, 1));
        visual.setDepth(20 + Math.floor(y / this.cubeHalfHeight) * 0.001);

        const body = this.matter.add.fromVertices(
            x + this.cubeHalfWidth,
            y + this.cubeHalfHeight,
            [
                { x: 0, y: -this.cubeHalfHeight },
                { x: this.cubeHalfWidth, y: 0 },
                { x: 0, y: this.cubeHalfHeight },
                { x: -this.cubeHalfWidth, y: 0 }
            ],
            {
                isStatic: true,
                friction: 0,
                frictionStatic: 0,
                restitution: Phaser.Math.FloatBetween(0.9, 1.1),
                label: 'bg_top_face'
            }
        );

        this.boxes.push({ visual, body, x, y });
    }

    buildCubeField(width, height) {
        // Method removed in favor of dynamic spawning
    }

    spawnBall(x, y) {
        let ballBody = this.matter.add.circle(x, y, 8, {
            restitution: 0.92,
            friction: 0,
            frictionStatic: 0,
            density: 0.05
        });
        
        let vis = this.add.circle(x, y, 8, 0x00ffff);
        vis.setAlpha(0.9);
        vis.setStrokeStyle(2, 0xffffff);
        // Balls are on depth 10 (Background/Inside)
        vis.setDepth(10);
        
        // Initial pop
        this.matter.body.setVelocity(ballBody, { x: Phaser.Math.FloatBetween(-2, 2), y: Phaser.Math.FloatBetween(-2, 2) });
        
        this.balls.push({ body: ballBody, visual: vis });
    }

    spawnUIBody(x, y, w, h) {
        // Provide dynamic bodies for other scenes (like MenuScene)
        return this.matter.add.rectangle(x, y, w, h, {
            restitution: 0.7,
            friction: 0.1,
            density: 0.1
        });
    }

    spawnShelf(y) {
        // Invisible static shelf for UI elements
        return this.matter.add.rectangle(this.scale.width / 2, y, this.scale.width * 2, 60, {
            isStatic: true,
            restitution: 0.3
        });
    }

    update(time, delta) {
        const { height } = this.scale;
        this.timeTick += delta * 0.001;
        const dt = delta / 1000;

        for (let i = this.boxes.length - 1; i >= 0; i--) {
            let box = this.boxes[i];
            box.x += this.conveyorVelocity.x * dt;
            box.y += this.conveyorVelocity.y * dt;

            // Destroy if gone off screen (top-left)
            if (box.x < -this.cubeHalfWidth * 2 - this.buffer || box.y < -this.cubeHeight - this.buffer) {
                if (box.body) this.matter.world.remove(box.body);
                box.visual.destroy();
                this.boxes.splice(i, 1);
                continue;
            }

            box.visual.setPosition(box.x, box.y);

            if (box.body) {
                this.matter.body.setPosition(box.body, {
                    x: box.x + this.cubeHalfWidth,
                    y: box.y + this.cubeHalfHeight
                });
            }
        }

        // Update Warp Shader time (now handled internally by the pipeline)

        // Sync balls and apply vortex
        const vortex = this.wheelVortex;
        for (let i = this.balls.length - 1; i >= 0; i--) {
            let ball = this.balls[i];
            ball.visual.setPosition(ball.body.position.x, ball.body.position.y);
            
            if (vortex.power > 0) {
                const dx = vortex.x - ball.body.position.x;
                const dy = vortex.y - ball.body.position.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < vortex.radius * vortex.radius * 4) {
                    const dist = Math.sqrt(distSq);
                    const force = (vortex.power * (1 - dist / (vortex.radius * 2))) * 0.001;
                    this.matter.body.applyForce(ball.body, ball.body.position, {
                        x: (dx / dist) * force,
                        y: (dy / dist) * force
                    });
                    
                    // Add a tangential swirl force
                    this.matter.body.applyForce(ball.body, ball.body.position, {
                        x: -(dy / dist) * force * 1.5,
                        y: (dx / dist) * force * 1.5
                    });
                }
            }

            // Remove balls that fall off-screen entirely
            if (ball.body.position.y > height + 100) {
                this.matter.world.remove(ball.body);
                ball.visual.destroy();
                this.balls.splice(i, 1);
            }
        }
    }
}
