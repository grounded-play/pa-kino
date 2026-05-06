import Phaser from 'phaser';

const fragShader = `
#define SHADER_NAME CHROMA_KEY_FS
precision mediump float;
uniform sampler2D uMainSampler;
varying vec2 outTexCoord;

void main()
{
    vec4 color = texture2D(uMainSampler, outTexCoord);
    
    // Chroma key for bright green
    // If green dominates over red and blue significantly, make it transparent
    float maxRB = max(color.r, color.b);
    float diff = color.g - maxRB;
    
    if (diff > 0.1) {
        // Smooth alpha falloff for antialiased edges
        float alphaMult = 1.0 - smoothstep(0.1, 0.4, diff);
        color.a *= alphaMult;
        // Reduce the green spill on the edges
        color.g = min(color.g, maxRB * 1.5);
    }
    
    // Pre-multiply alpha for Phaser 3 rendering
    color.rgb *= color.a;

    gl_FragColor = color;
}
`;

export default class ChromaKeyPipeline extends Phaser.Renderer.WebGL.Pipelines.SinglePipeline {
    constructor(game) {
        super({
            game: game,
            fragShader: fragShader
        });
    }
}
