import { PageProps } from "@/types";
import { memo,useState,useRef,useEffect } from "react";
import { cnvrtImgUrl } from "@/helpers";


export function PhotoDetail({auth,photo}: PageProps) {
    

  const imageSrc = photo.link;
  const [image, setImage] = useState<any>(null);
  const [imageWidth, setImageWidth] = useState<any>("auto");
  const [initialWidth, setInitialWidth] = useState(null);

  const imgRef = useRef<any>(null);

  useEffect(() => {
    setImage(imageSrc);
  }, [imageSrc]);

  const handleZoomIn = () => {
    setImageWidth((prevWidth:any) => {
      if (prevWidth === "auto") {
        return 100; 
      }
      return parseInt(prevWidth) + 100;
    });
  };

  const handleImageLoad = () => {
    if (imgRef.current) {
      const actualWidth = imgRef.current.naturalWidth;
      setInitialWidth(actualWidth);
      setImageWidth(actualWidth);
    }
  };

  const handleZoomOut = () => {
    setImageWidth((prevWidth:any) => {
      if (prevWidth === "auto") {
        return 0; 
      }
      return Math.max(100, parseInt(prevWidth) - 100); 
    });
  };

  const handleResetZoom = () => {
    setImageWidth(initialWidth);
  };


    return (
<div style={{ 

  backgroundColor:'#e9ebfc'
}}>
  <div className="fixed inset-0 z-50 flex items-end justify-center">
    <div className="bg-white bg-opacity-60 p-5 rounded-t-lg  flex space-x-2"
    style={{
      boxShadow: "0 0 3px",

    }}
    >
      <button className="rounded-md p-[3px_6px] border border-gray-500 bg-white cursor-pointer transition duration-200 ease-in-out user-select-none flex flex-1 whitespace-nowrap text-center mx-1 hover:bg-green-100" id="zoomin" onClick={handleZoomIn}>
        Zoom in
      </button>
      <button className="rounded-md p-[3px_6px] border border-gray-500 bg-white cursor-pointer transition duration-200 ease-in-out user-select-none flex flex-1 whitespace-nowrap text-center mx-1 hover:bg-green-100" id="zoomout" onClick={handleZoomOut}>
        Zoom out
      </button>
      <button className="rounded-md p-[3px_6px] border border-gray-500 bg-white cursor-pointer transition duration-200 ease-in-out user-select-none flex flex-1 whitespace-nowrap text-center mx-1 hover:bg-green-100" id="zoomreset" onClick={handleResetZoom}>
        Reset zoom
      </button>
    </div>
  </div>

  <div className="w-full h-screen table text-center">
    <div className="flex justify-center items-center w-full h-full">
      <img
        id="zoombox"
        ref={imgRef}
        className={`mt-1 mb-1 transition-width duration-200 ease-in-out ${imageWidth === "auto" ? "w-auto" : ""}`}
        style={{
          maxWidth:'none'
          ,
          width: imageWidth !== "auto" ? `${imageWidth}px` : undefined }}
        onLoad={handleImageLoad}
        src={image}
      />
    </div>
  </div>
</div>


    );
}
export default memo(PhotoDetail);
