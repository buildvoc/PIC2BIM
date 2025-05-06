import React from 'react';
import Map from "@/Components/Map/Map";
import { useState } from "react";
import { MapProps } from "@/types";

const PhotoGalleryMap: React.FC = ({data, onClick, isSelected, isUnassigned, zoomFilter}) => {
    return (
        <div className={`photo-gallery-map w-full overflow-hidden`}>
            <Map data={data} zoomFilter={zoomFilter} isUnassigned={isUnassigned} onClick={onClick} className={`w-full`} />
        </div>
    )
}
export default PhotoGalleryMap;
