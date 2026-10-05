import React, { useCallback, useEffect, useState, useRef } from 'react';

interface MinMaxRangeSliderProps {
  min: number;
  max: number;
  onChange: ({ min, max }: { min: number; max: number }) => void;
  minVal: number;
  maxVal: number;
}

const MinMaxRangeSlider: React.FC<MinMaxRangeSliderProps> = ({ min, max, onChange, minVal, maxVal }) => {
  const minValRef = useRef<HTMLInputElement>(null);
  const maxValRef = useRef<HTMLInputElement>(null);
  const range = useRef<HTMLDivElement>(null);

  const getPercent = useCallback((value: number) => Math.round(((value - min) / (max - min)) * 100), [min, max]);

  useEffect(() => {
    if (maxValRef.current) {
      const minPercent = getPercent(minVal);
      const maxPercent = getPercent(+maxValRef.current.value);

      if (range.current) {
        range.current.style.left = `${minPercent}%`;
        range.current.style.width = `${maxPercent - minPercent}%`;
      }
    }
  }, [minVal, getPercent]);

  useEffect(() => {
    if (minValRef.current) {
      const minPercent = getPercent(+minValRef.current.value);
      const maxPercent = getPercent(maxVal);

      if (range.current) {
        range.current.style.width = `${maxPercent - minPercent}%`;
      }
    }
  }, [maxVal, getPercent]);

  useEffect(() => {
    onChange({ min: minVal, max: maxVal });
  }, [minVal, maxVal, onChange]);

  return (
    <div className="relative w-full">
        <div className="relative flex items-center justify-center h-12">
            <input
                type="range"
                min={min}
                max={max}
                value={minVal}
                ref={minValRef}
                onChange={(event) => {
                    const value = Math.min(+event.target.value, maxVal);
                    onChange({ min: value, max: maxVal });
                }}
                className={`thumb thumb--zindex-3 ${
                    minVal > max - 100 ? 'thumb--zindex-5' : ''
                }`}
            />
            <input
                type="range"
                min={min}
                max={max}
                value={maxVal}
                ref={maxValRef}
                onChange={(event) => {
                    const value = Math.max(+event.target.value, minVal);
                    onChange({ min: minVal, max: value });
                }}
                className="thumb thumb--zindex-4"
            />

            <div className="relative w-full">
                <div className="slider__track" />
                <div ref={range} className="slider__range" />
            </div>
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>{minVal}</span>
            <span>{maxVal}</span>
        </div>
    </div>
  );
};

export default MinMaxRangeSlider;
