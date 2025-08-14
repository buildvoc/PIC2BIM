import React, { useState, useRef, useEffect } from 'react';
import { getColorForValue } from '@/utils/colors';
import { MoreHoriz } from '@mui/icons-material';

interface LegendProps {
    data: any[];
    category: string;
    groupByMapping: { [key: string]: string };
    onItemClick: (value: any) => void;
    selectedItem: any | null;
}

const Legend: React.FC<LegendProps> = ({ data, category, groupByMapping, onItemClick, selectedItem }) => {
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
