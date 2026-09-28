const sharp = require('sharp');

/**
 * process_image handler
 * Payload: { width?: number, height?: number, format?: 'png' | 'jpeg' | 'webp', quality?: number }
 */
const processImageHandler = async (payload) => {
  const { width = 300, height = 300, format = 'png', quality = 80 } = payload;

  try {
    // Generate a simple SVG canvas image to process
    const svgBuffer = Buffer.from(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#3B82F6"/>
        <text x="50%" y="50%" font-family="Arial" font-size="20" fill="white" dominant-baseline="middle" text-anchor="middle">
          TaskForge Image
        </text>
      </svg>
    `);

    let sharpPipeline = sharp(svgBuffer).resize(width, height);

    if (format === 'jpeg') {
      sharpPipeline = sharpPipeline.jpeg({ quality });
    } else if (format === 'webp') {
      sharpPipeline = sharpPipeline.webp({ quality });
    } else {
      sharpPipeline = sharpPipeline.png();
    }

    const outputBuffer = await sharpPipeline.toBuffer();

    return {
      status: 'PROCESSED',
      format,
      dimensions: { width, height },
      outputSizeBytes: outputBuffer.length,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    throw new Error(`Sharp image processing failed: ${err.message}`);
  }
};

module.exports = processImageHandler;
