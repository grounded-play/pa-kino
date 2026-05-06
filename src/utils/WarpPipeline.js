import Phaser from 'phaser';

const fragShader = `
#define SHADER_NAME WARP_FS
precision mediump float;
uniform sampler2D uMainSampler;
uniform float uTime;
varying vec2 outTexCoord;

void main()
{
    vec2 uv = outTexCoord;
    
    // Create ripples centered on the screen
    vec2 center = vec2(0.5, 0.5);
    float d = distance(uv, center);
    
    // Large, slow-moving circular ripples
    // uTime controls the animation speed
    // sin(d * frequency - uTime * speed) * amplitude
    float ripple = sin(d * 6.0 - uTime * 1.2) * 0.012;
    
    // Displace UV along the vector from center
    vec2 dir = normalize(uv - center);
    uv += dir * ripple;
    
    gl_FragColor = texture2D(uMainSampler, uv);
}
`;

export default class WarpPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game) {
        super({
            game: game,
            fragShader: fragShader
        });
    }

    onPreRender() {
        this.set1f('uTime', this.game.loop.time * 0.001);
    }
}
