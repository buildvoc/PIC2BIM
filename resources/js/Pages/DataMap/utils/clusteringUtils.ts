import { distance } from '@turf/turf';

export interface ClusterPoint {
  coordinates: [number, number];
  properties: any;
  dataType: 'buildings' | 'buildingParts' | 'sites' | 'nhle' | 'photos';
  id: string;
}

export interface ClusterData {
  coordinates: [number, number];
  properties: {
    cluster: true;
    point_count: number;
    point_count_abbreviated: string;
    cluster_id: string;
    clustered_points: ClusterPoint[];
    dominant_type: string;
    mixed_types?: boolean;
    type_breakdown?: Record<string, number>;
  };
  isCluster: true;
}

export interface ClusterConfig {
  maxZoom: number;
  radius: number; // in kilometers
  minPoints: number;
  forceSingleCluster?: boolean;
}

/**
 * Get dynamic clustering configuration based on zoom level
 * More restrictive clustering to prevent false clustering
 */
function getZoomBasedConfig(zoom: number): ClusterConfig {
  if (zoom >= 18) {
    return { maxZoom: 17, radius: 0, minPoints: 999 }; // Disable clustering at zoom 18+
  } else if (zoom < 10) {
    return { maxZoom: 17, radius: 999, minPoints: 1, forceSingleCluster: true }; // Single cluster for all data below zoom 10
  } else if (zoom <= 10) {
    return { maxZoom: 17, radius: 0.5, minPoints: 3 }; // 500m radius
  } else if (zoom <= 12) {
    return { maxZoom: 17, radius: 0.2, minPoints: 3 }; // 200m radius
  } else if (zoom <= 14) {
    return { maxZoom: 17, radius: 0.05, minPoints: 3 }; // 50m radius
  } else if (zoom <= 16) {
    return { maxZoom: 17, radius: 0.02, minPoints: 3 }; // 20m radius
  } else {
    return { maxZoom: 17, radius: 0.005, minPoints: 3 }; // 5m radius for high zoom
  }
}

function groupStackedPoints(points: ClusterPoint[]): Map<string, ClusterPoint[]> {
  const stackedGroups = new Map<string, ClusterPoint[]>();
  
  points.forEach(point => {
    const key = `${Math.round(point.coordinates[0] * 10000000)},${Math.round(point.coordinates[1] * 10000000)}`;
    
    if (!stackedGroups.has(key)) {
      stackedGroups.set(key, []);
    }
    stackedGroups.get(key)!.push(point);
  });
  
  return stackedGroups;
}

export function clusterPoints(
  points: ClusterPoint[],
  zoom: number,
  config?: ClusterConfig
): (ClusterPoint | ClusterData)[] {
  if (points.length === 0) return [];
  
  // Use zoom-based configuration if no config provided
  const activeConfig = config || getZoomBasedConfig(zoom);
  const clusters: (ClusterPoint | ClusterData)[] = [];
  
  // Force single cluster mode for very low zoom levels (below 10)
  if (activeConfig.forceSingleCluster && points.length > 0) {
    const coordinates = points.map(p => p.coordinates);
    const centroid = calculateCentroid(coordinates);
    const typeCount = countDataTypes(points);
    const dominantType = getDominantType(typeCount);
    const hasMixedTypes = Object.keys(typeCount).length > 1;
    
    const singleCluster: ClusterData = {
      coordinates: centroid,
      properties: {
        cluster: true,
        point_count: points.length,
        point_count_abbreviated: abbreviateNumber(points.length),
        cluster_id: `single_cluster_${Date.now()}`,
        clustered_points: points,
        dominant_type: dominantType,
        mixed_types: hasMixedTypes,
        type_breakdown: typeCount
      },
      isCluster: true
    };
    
    return [singleCluster];
  }
  
  const stackedGroups = groupStackedPoints(points);
  const processedPoints: ClusterPoint[] = [];
  
  stackedGroups.forEach((groupPoints, key) => {
    if (groupPoints.length > 1) {
      // Only create cluster if points are truly identical (same exact coordinates)
      const firstCoord = groupPoints[0].coordinates;
      const allIdentical = groupPoints.every(p => 
        p.coordinates[0] === firstCoord[0] && p.coordinates[1] === firstCoord[1]
      );
      
      if (allIdentical) {
        // Group by data type even for stacked points
        const typeGroups = new Map<string, ClusterPoint[]>();
        groupPoints.forEach(p => {
          if (!typeGroups.has(p.dataType)) {
            typeGroups.set(p.dataType, []);
          }
          typeGroups.get(p.dataType)!.push(p);
        });
        
        // Create separate clusters for each data type
        typeGroups.forEach((typePoints, dataType) => {
          if (typePoints.length > 1) {
            const typeCount = countDataTypes(typePoints);
            const dominantType = getDominantType(typeCount);
            
            const stackedCluster: ClusterData = {
              coordinates: typePoints[0].coordinates,
              properties: {
                cluster: true,
                point_count: typePoints.length,
                point_count_abbreviated: abbreviateNumber(typePoints.length),
                cluster_id: `stacked_${dataType}_${Date.now()}_${Math.random()}`,
                clustered_points: typePoints,
                dominant_type: dominantType,
                mixed_types: false
              },
              isCluster: true
            };
            
            clusters.push(stackedCluster);
          } else {
            // Single point of this type, add to processing list
            processedPoints.push(typePoints[0]);
          }
        });
      } else {
        // Points are not truly identical, treat as individual points
        groupPoints.forEach(p => processedPoints.push(p));
      }
    } else {
      // Single point, add to processing list for distance-based clustering
      processedPoints.push(groupPoints[0]);
    }
  });
  
  if (zoom < 18 && zoom <= activeConfig.maxZoom && processedPoints.length > 0) {
    const processed = new Set<string>();

    processedPoints.forEach((point, index) => {
      if (processed.has(point.id)) return;

      const nearbyPoints: ClusterPoint[] = [point];
      processed.add(point.id);

      // Find nearby points from ALL dataset types
      processedPoints.forEach((otherPoint, otherIndex) => {
        if (index === otherIndex || processed.has(otherPoint.id)) return;

        const dist = distance(
          { type: 'Feature', geometry: { type: 'Point', coordinates: point.coordinates }, properties: {} },
          { type: 'Feature', geometry: { type: 'Point', coordinates: otherPoint.coordinates }, properties: {} },
          'kilometers'
        );

        if (dist <= activeConfig.radius) {
          nearbyPoints.push(otherPoint);
          processed.add(otherPoint.id);
        }
      });

      // Only cluster points of the same data type
      const sameTypePoints = nearbyPoints.filter(p => p.dataType === point.dataType);
      
      // Create cluster only if we have enough points of the same type
      if (sameTypePoints.length >= activeConfig.minPoints) {
        const centroid = calculateCentroid(sameTypePoints.map(p => p.coordinates));
        const typeCount = countDataTypes(sameTypePoints);
        const dominantType = getDominantType(typeCount);

        const cluster: ClusterData = {
          coordinates: centroid,
          properties: {
            cluster: true,
            point_count: sameTypePoints.length,
            point_count_abbreviated: abbreviateNumber(sameTypePoints.length),
            cluster_id: `cluster_${Date.now()}_${Math.random()}`,
            clustered_points: sameTypePoints,
            dominant_type: dominantType,
            mixed_types: false,
            type_breakdown: typeCount
          },
          isCluster: true
        };

        clusters.push(cluster);
        
        // Mark same-type points as processed
        sameTypePoints.forEach(p => processed.add(p.id));
        
        // Add different-type points back to individual points
        const differentTypePoints = nearbyPoints.filter(p => p.dataType !== point.dataType);
        differentTypePoints.forEach(p => {
          if (!processed.has(p.id)) {
            clusters.push(p);
            processed.add(p.id);
          }
        });
      } else {
        // Add individual points if not enough for cluster
        nearbyPoints.forEach(p => clusters.push(p));
      }
    });
  } else {
    // High zoom or no points to process - add individual points
    processedPoints.forEach(p => clusters.push(p));
  }

  return clusters;
}

/**
 * Calculate centroid of multiple points
 */
function calculateCentroid(coordinates: [number, number][]): [number, number] {
  const sum = coordinates.reduce(
    (acc, coord) => [acc[0] + coord[0], acc[1] + coord[1]],
    [0, 0]
  );
  return [sum[0] / coordinates.length, sum[1] / coordinates.length];
}

/**
 * Count data types in cluster
 */
function countDataTypes(points: ClusterPoint[]): Record<string, number> {
  return points.reduce((acc, point) => {
    acc[point.dataType] = (acc[point.dataType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Get dominant data type in cluster
 */
function getDominantType(typeCount: Record<string, number>): string {
  return Object.entries(typeCount).reduce((a, b) => 
    typeCount[a[0]] > typeCount[b[0]] ? a : b
  )[0];
}

/**
 * Abbreviate large numbers for display with better formatting
 */
function abbreviateNumber(num: number): string {
  if (num >= 1000000) {
    const millions = num / 1000000;
    return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
  }
  if (num >= 10000) {
    const thousands = num / 1000;
    return thousands % 1 === 0 ? `${thousands}K` : `${thousands.toFixed(0)}K`;
  }
  if (num >= 1000) {
    const thousands = num / 1000;
    return `${thousands.toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Get cluster color based on data type (no mixed types)
 */
export function getClusterColor(dominantType: string, isMixed: boolean = false): [number, number, number, number] {
  switch (dominantType) {
    case 'buildings':
      return [0, 0, 255, 200]; // Blue
    case 'buildingParts':
      return [255, 165, 0, 200]; // Orange
    case 'sites':
      return [0, 255, 0, 200]; // Green
    case 'nhle':
      return [255, 0, 0, 200]; // Red
    case 'photos':
      return [255, 0, 255, 200]; // Magenta
    default:
      return [128, 128, 128, 200]; // Gray
  }
}

/**
 * Expand cluster to get individual points
 */
export function expandCluster(clusterData: ClusterData): ClusterPoint[] {
  return clusterData.properties.clustered_points;
}

/**
 * Calculate bounding box for cluster points
 */
export function getClusterBounds(clusterData: ClusterData): [[number, number], [number, number]] {
  const points = clusterData.properties.clustered_points;
  
  if (points.length === 0) {
    return [[clusterData.coordinates[0], clusterData.coordinates[1]], [clusterData.coordinates[0], clusterData.coordinates[1]]];
  }
  
  let minLng = points[0].coordinates[0];
  let maxLng = points[0].coordinates[0];
  let minLat = points[0].coordinates[1];
  let maxLat = points[0].coordinates[1];
  
  points.forEach(point => {
    const [lng, lat] = point.coordinates;
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });
  
  // Add small padding to ensure all points are visible
  const padding = 0.001; // ~100m padding
  return [
    [minLng - padding, minLat - padding],
    [maxLng + padding, maxLat + padding]
  ];
}

export function getClusterExpansionZoom(clusterData: ClusterData, currentZoom: number): number {
  return 18;
}
