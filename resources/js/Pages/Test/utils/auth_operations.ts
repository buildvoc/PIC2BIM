"use server"
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import sharp from 'sharp';

export const logout = () => {
    "use server";
    cookies().delete("auth");
    redirect("/login");
  };

  export const get_auth_session = () =>  {
    const cookiesStore = cookies();
    const session = cookiesStore.get('auth');
    if(session?.name=="auth")
    {
        return session
    }
    return null;
  }
  // Define type for options
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
  
