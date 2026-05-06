export const ColorExtractor = {
    /**
     * Extracts the dominant/average color from a Phaser Texture.
     * @param {Phaser.Scene} scene - The current scene
     * @param {string} textureKey - The key of the loaded texture
     * @returns {number} The extracted color as a hex number (e.g., 0xff0000)
     */
    getAverageColor(scene, textureKey) {
        if (!scene.textures.exists(textureKey)) {
            return 0x222222; // Default fallback
        }

        const texture = scene.textures.get(textureKey);
        const sourceImage = texture.getSourceImage();

        if (!sourceImage) {
            return 0x222222;
        }

        // Create a small off-screen canvas to sample the image
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        
        // Scale down to a 1x1 pixel to let the browser calculate the average color
        canvas.width = 1;
        canvas.height = 1;

        try {
            // This will fail if the image is cross-origin and not loaded with crossOrigin="anonymous"
            context.drawImage(sourceImage, 0, 0, 1, 1);
            const pixelData = context.getImageData(0, 0, 1, 1).data;
            
            // pixelData is [r, g, b, a]
            const r = pixelData[0];
            const g = pixelData[1];
            const b = pixelData[2];

            // Convert to hex
            return (r << 16) + (g << 8) + b;
        } catch (e) {
            console.warn("ColorExtractor failed (likely CORS issue). Falling back to default color.", e);
            return 0x334455;
        }
    }
};
