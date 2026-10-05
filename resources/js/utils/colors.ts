export const DISTINCT_COLORS: [number, number, number][] = [
    [228, 26, 28],
    [55, 126, 184],
    [77, 175, 74],
    [152, 78, 163],
    [255, 127, 0],
    [255, 255, 51],
    [166, 86, 40],
    [247, 129, 191],
    [153, 153, 153],
    [31, 120, 180],
    [178, 223, 138],
    [51, 160, 44],
    [251, 154, 153],
    [227, 26, 28],
    [253, 191, 111],
    [255, 127, 0],
    [202, 178, 214],
    [106, 61, 154],
    [255, 255, 153],
    [177, 89, 40]
];

const colorMapCache = new Map<string, Map<any, [number, number, number]>>();

export const getColorForValue = (value: any, uniqueValues: any[]): [number, number, number] => {
    const cacheKey = JSON.stringify(uniqueValues);
    if (!colorMapCache.has(cacheKey)) {
        const newColorMap = new Map<any, [number, number, number]>();
        uniqueValues.forEach((val, index) => {
            newColorMap.set(val, DISTINCT_COLORS[index % DISTINCT_COLORS.length]);
        });
        colorMapCache.set(cacheKey, newColorMap);
    }

    const colorMap = colorMapCache.get(cacheKey)!;
    return colorMap.get(value) as [number, number, number] || [128, 128, 128]; // Default gray for values not in map
    
};
