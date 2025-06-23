import { PageProps } from "@/types";
import { memo,useState,useRef,useEffect } from "react";
import { cnvrtImgUrl } from "@/helpers";
import { TbZoomReset, TbZoomIn, TbZoomOut, TbArrowLeft } from "react-icons/tb"


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

  const handleBack = () => {
    localStorage.setItem("map_from_photo_detail", "true");
    window.history.back();
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
  <div className="fixed bottom-4 z-50 flex justify-center w-full">
    <div className="bg-white bg-opacity-80 p-2 rounded-full flex space-x-2 shadow-md">
      <button 
        className="rounded-full p-2 text-gray-700 hover:bg-gray-100 transition-colors"
        onClick={handleBack}
        title="Back"
        aria-label="Go back"
      >
        <TbArrowLeft size={20} />
      </button>
      <button 
        className="rounded-full p-2 text-gray-700 hover:bg-gray-100 transition-colors"
        onClick={handleZoomIn}
        title="Zoom in"
        aria-label="Zoom in"
      >
        <TbZoomIn size={20} />
      </button>
      <button 
        className="rounded-full p-2 text-gray-700 hover:bg-gray-100 transition-colors"
        onClick={handleZoomOut}
        title="Zoom out"
        aria-label="Zoom out"
      >
        <TbZoomOut size={20} />
      </button>
      <button 
        className="rounded-full p-2 text-gray-700 hover:bg-gray-100 transition-colors"
        onClick={handleResetZoom}
        title="Reset zoom"
        aria-label="Reset zoom"
      >
        <TbZoomReset size={20} />
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
          width: imageWidth !== "auto" ? `${imageWidth}px` : undefined ,
            transform: `rotate(${
              photo.angle
          }deg)`,
        }}
        onLoad={handleImageLoad}
        src={image}
      />
    </div>
  </div>
</div>


    );
}
export default memo(PhotoDetail);
