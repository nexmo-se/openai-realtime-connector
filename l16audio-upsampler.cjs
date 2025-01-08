const l16AudioUpsampler = (inputBuffer, inputSampleRate, outputSampleRate) => {
  
  //-- Input is a Buffer or Int16Array
  const input = inputBuffer instanceof Buffer 
    ? new Int16Array(inputBuffer.buffer, inputBuffer.byteOffset, inputBuffer.length / 2)
    : inputBuffer;

  //-- Calculate the scale factor for interpolation --
  const scaleFactor = inputSampleRate / outputSampleRate;

  //-- Create output buffer --
  const outputLength = Math.ceil(input.length * (outputSampleRate / inputSampleRate));
  const output = new Int16Array(outputLength);

  //-- Linear interpolation upsampling/downsampling --
  for (let i = 0; i < outputLength; i++) {
    //-- Calculate the corresponding input index
    const sourceIndex = i * scaleFactor;
    
    //-- Find the two closest input samples --
    const lowerIndex = Math.floor(sourceIndex);
    const upperIndex = Math.min(Math.ceil(sourceIndex), input.length - 1);
    
    //-- Interpolate between the two samples --
    const lowerSample = input[lowerIndex];
    const upperSample = input[upperIndex];
    const fraction = sourceIndex - lowerIndex;
    
    //-- Linear interpolation --
    const interpolatedSample = Math.round(
      lowerSample * (1 - fraction) + upperSample * fraction
    );
    
    output[i] = interpolatedSample;
  }

  return Buffer.from(output.buffer);
};

//--
module.exports = l16AudioUpsampler;