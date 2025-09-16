import React, { useState, useRef, useEffect } from 'react';
import { getColorForValue } from '@/utils/colors';
import { MoreHoriz } from '@mui/icons-material';

interface LegendProps {
    data: any[];
    category: string;
    groupByMapping: { [key: string]: string };
    onItemClick: (value: any) => void;
    selectedItem: any | null;
    dataType?: { buildings: boolean; buildingParts: boolean; sites: boolean; nhle: boolean; photos: boolean };
}

const Legend: React.FC<LegendProps> = ({ data, category, groupByMapping, onItemClick, selectedItem, dataType }) => {
    const [popoverOpen, setPopoverOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setPopoverOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [popoverRef]);
    // Handle DataType legend when category is 'None'
    if (category.toLowerCase() === 'none') {
        const dataTypeColors = {
            buildings: [0, 0, 255], // Blue
            buildingParts: [255, 165, 0], // Orange
            sites: [0, 255, 0], // Green
            nhle: [255, 0, 0], // Red
            photos: [255, 20, 147] // Pink
        };

        const dataTypeLabels = {
            buildings: 'Buildings',
            buildingParts: 'Building Parts',
            sites: 'Sites',
            nhle: 'NHLE',
            photos: 'Photos'
        };

        // Check if any data types are selected in the filter
        const hasAnyDataTypeSelected = dataType && (dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos);
        
        // Always show all data types that have data in the current dataset
        const allPossibleTypes = ['buildings', 'buildingParts', 'sites', 'nhle', 'photos'];
        
        // Count data by type to debug what's actually available
        const dataTypeCounts = allPossibleTypes.reduce((counts, type) => {
            counts[type] = data.filter(d => {
                // Check by dataType property first
                if (d.dataType === type) return true;
                
                // Fallback to property-based detection with more flexible matching
                switch(type) {
                    case 'buildings':
                        return d.properties && (
                            d.properties.buildingId || d.properties.building_id || 
                            d.properties.id?.toString().includes('building') ||
                            d.properties.type === 'building' ||
                            d.properties.feature_type === 'building'
                        );
                    case 'buildingParts':
                        return d.properties && (
                            d.properties.buildingPartId || d.properties.building_part_id || 
                            d.properties.id?.toString().includes('buildingpart') ||
                            d.properties.type === 'buildingpart' ||
                            d.properties.feature_type === 'buildingpart'
                        );
                    case 'sites':
                        return d.properties && (
                            d.properties.siteId || d.properties.site_id || 
                            d.properties.id?.toString().includes('site') ||
                            d.properties.type === 'site' ||
                            d.properties.feature_type === 'site'
                        );
                    case 'nhle':
                        return d.properties && (
                            d.properties.nhleId || d.properties.nhle_id || d.properties.listEntry ||
                            d.properties.id?.toString().includes('nhle') ||
                            d.properties.type === 'nhle' ||
                            d.properties.feature_type === 'nhle'
                        );
                    case 'photos':
                        return d.properties && (
                            d.properties.photoId || d.properties.photo_id || d.properties.image_url ||
                            d.properties.id?.toString().includes('photo') ||
                            d.properties.type === 'photo' ||
                            d.properties.feature_type === 'photo'
                        );
                    default:
                        return false;
                }
            }).length;
            return counts;
        }, {} as Record<string, number>);
        
        // Show types that have data, or all types if none detected
        const typesWithData = allPossibleTypes.filter(type => dataTypeCounts[type] > 0);
        let availableDataTypes = typesWithData.length > 0 ? typesWithData : allPossibleTypes;
        
        // If some data types are selected, only show those that are active
        if (hasAnyDataTypeSelected && dataType) {
            availableDataTypes = availableDataTypes.filter(type => {
                switch(type) {
                    case 'buildings': return dataType.buildings;
                    case 'buildingParts': return dataType.buildingParts;
                    case 'sites': return dataType.sites;
                    case 'nhle': return dataType.nhle;
                    case 'photos': return dataType.photos;
                    default: return false;
                }
            });
        }

        return (
            <div style={legendContainerStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ margin: 0, fontWeight: 'bold' }}>Data Types</h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '5px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    {availableDataTypes.map((dataTypeKey: string) => {
                        const color = dataTypeColors[dataTypeKey as keyof typeof dataTypeColors] || [128, 128, 128];
                        const label = dataTypeLabels[dataTypeKey as keyof typeof dataTypeLabels] || dataTypeKey;
                        const isSelected = selectedItem === dataTypeKey;
                        const itemStyle: React.CSSProperties = {
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '5px',
                            minWidth: '60px',
                            maxWidth: '100px',
                            cursor: 'pointer',
                            opacity: selectedItem === null || isSelected ? 1 : 0.5,
                            transition: 'opacity 0.2s',
                        };

                        return (
                            <div key={dataTypeKey} title={label} style={itemStyle} onClick={() => onItemClick(dataTypeKey)}>
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    backgroundColor: `rgb(${color[0]}, ${color[1]}, ${color[2]})`,
                                    borderRadius: '50%',
                                    border: isSelected ? '3px solid #000' : '2px solid rgba(0,0,0,0.5)',
                                    transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                                    transition: 'all 0.2s',
                                }} />
                                <span style={{
                                    fontSize: '12px',
                                    fontWeight: isSelected ? '700' : '500',
                                    textTransform: 'uppercase',
                                    textAlign: 'center',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    width: '80px'
                                }}>
                                    {label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    const propertyName = groupByMapping[category];
    if (!propertyName) return null;

    const uniqueValues = Array.from(
        new Set(data.map(d => d.properties?.[propertyName]).filter(Boolean))
    );

    const maxVisibleItems = 5;
    const visibleItems = uniqueValues.slice(0, maxVisibleItems);
    const hiddenItems = uniqueValues.slice(maxVisibleItems);
    const hiddenItemsCount = hiddenItems.length;

    return (
        <div style={legendContainerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, fontWeight: 'bold', textTransform: 'capitalize' }}>{category}</h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '5px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {visibleItems.map((value: any) => {
                    const color = getColorForValue(value, uniqueValues);
                    const isSelected = selectedItem === value;
                    const itemStyle: React.CSSProperties = {
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '5px',
                        minWidth: '60px',
                        maxWidth: '100px',
                        cursor: 'pointer',
                        opacity: selectedItem === null || isSelected ? 1 : 0.5,
                        transition: 'opacity 0.2s',
                    };

                    return (
                        <div key={value} title={String(value)} style={itemStyle} onClick={() => onItemClick(value)}>
                            <div style={{
                                width: '20px',
                                height: '20px',
                                backgroundColor: `rgb(${color[0]}, ${color[1]}, ${color[2]})`,
                                borderRadius: '50%',
                                border: isSelected ? '3px solid #000' : '2px solid rgba(0,0,0,0.5)',
                                transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                                transition: 'all 0.2s',
                            }} />
                            <span style={{
                                fontSize: '12px',
                                fontWeight: isSelected ? '700' : '500',
                                textTransform: 'uppercase',
                                textAlign: 'center',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                width: '60px'
                            }}>
                                {String(value)}
                            </span>
                        </div>
                    );
                })}
                {hiddenItemsCount > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', minWidth: '60px', cursor: 'pointer', position: 'relative' }} onClick={() => setPopoverOpen(prev => !prev)} ref={popoverRef}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <MoreHoriz fontSize='small' />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>MORE</span>
                        <div style={{ position: 'absolute', top: '-5px', right: '10px', background: 'red', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>
                            {hiddenItemsCount}
                        </div>

                        {popoverOpen && (
                            <div style={popoverContentStyle}>
                                {hiddenItems.map((value: any) => {
                                    const color = getColorForValue(value, uniqueValues);
                                    const isSelected = selectedItem === value;
                                    const popoverItemHoverStyle: React.CSSProperties = {
                                        backgroundColor: '#f0f0f0'
                                    };
                                    return (
                                        <div key={value} style={popoverItemStyle} 
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = popoverItemHoverStyle.backgroundColor!}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            onClick={() => { onItemClick(value); setPopoverOpen(false); }}>
                                            <div style={{ ...popoverCircleStyle, backgroundColor: `rgb(${color[0]}, ${color[1]}, ${color[2]})`, border: isSelected ? '2px solid #000' : '1px solid #ccc' }} />
                                            <span title={String(value)} style={{...popoverTextStyle, fontWeight: isSelected ? '700' : '400'}}>{String(value)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const legendContainerStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '20px',
    right: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: '10px',
    borderRadius: '8px',
    boxShadow: '0 2px 15px rgba(0,0,0,0.15)',
    zIndex: 1,
    maxWidth: '110vw',
    display: 'flex',
    flexDirection: 'column'
};

const popoverContentStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '100%',
    right: 0,
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
    zIndex: 10,
    maxHeight: '300px',
    overflowY: 'auto',
    padding: '10px',
    marginBottom: '10px',
    width: '200px'
};

const popoverItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '8px',
    cursor: 'pointer',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
};

const popoverCircleStyle: React.CSSProperties = {
    width: '15px',
    height: '15px',
    borderRadius: '50%',
    marginRight: '10px',
    flexShrink: 0
};

const popoverTextStyle: React.CSSProperties = {
    fontSize: '14px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
};

export default Legend;
