"use server"
import sharp from 'sharp';

interface CompressOptions {
  resize?: number;
  rotate?: number;
  quality?: number;
}

  
  export const compressImageFromUrl =  async (image:any, options: CompressOptions = {}) => {
    const { resize = 500, rotate = 90, quality = 80 } = options;

    try {
    
        const buffer = Buffer.from(image,'base64');

        // Perform the compression using Sharp
        const compressedBuffer = await sharp(buffer)
          .resize(resize) 
          .rotate(rotate)
          .jpeg({quality})  
          .toBuffer();

          return compressedBuffer.toString('base64')
  
      } catch (error) {
        // console.log('Error compressing image: ' + error);
      }
  };
  
