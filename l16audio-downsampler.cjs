const l16AudioDownsampler = async (inputBuffer, inputSampleRate, outputSampleRate) => {

    const libsamplerate = require('@alexanderolsen/libsamplerate-js');

    try {
        // Convert input buffer to Float32Array
        const inputFloat32 = new Float32Array(inputBuffer.length / 2);
        for (let i = 0; i < inputBuffer.length; i += 2) {
            const sample = inputBuffer.readInt16LE(i);
            inputFloat32[i / 2] = sample / 32768;
        }
        
        const resampler = await libsamplerate.create(
            1,  // one channel
            inputSampleRate,
            outputSampleRate,
            0   // best quality
        );

        // Use the 'simple' method for resampling
        const outputFloat32 = await resampler.simple(inputFloat32);
        
        // Convert back to L16 format (16-bit signed integer)
        const outputBuffer = Buffer.alloc(outputFloat32.length * 2);
        for (let i = 0; i < outputFloat32.length; i++) {
            // Clamp values to [-1, 1] and convert back to 16-bit
            const sample = Math.max(-1, Math.min(1, outputFloat32[i]));
            const int16Sample = Math.round(sample * 32767);
            outputBuffer.writeInt16LE(int16Sample, i * 2);
        }

        // Clean up
        resampler.destroy();
        
        return outputBuffer;

    } catch (error) {
        console.error('Error during downsampling rate conversion:', error);
        throw error;
    }

};

//--

module.exports = l16AudioDownsampler;
