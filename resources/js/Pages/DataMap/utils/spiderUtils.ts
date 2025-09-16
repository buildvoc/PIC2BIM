export interface SpiderPoint {
  id: string;
  coordinates: [number, number];
  originalCoordinates: [number, number];
  properties: any;
  dataType: string;
}

export interface SpiderCluster {
  id: string;
  centerCoordinates: [number, number];
  points: SpiderPoint[];
  isExpanded: boolean;
  dominantType: string;
  hasMixedTypes: boolean;
  typeBreakdown: Record<string, number>;
}

/**
 * Calculate fan-out positions for stacked points
 * @param centerCoords - Center coordinates of the stack
 * @param points - Array of stacked points
 * @param radius - Radius for fan-out (in pixels)
 * @param viewport - Current viewport for coordinate conversion
 */
export function calculateSpiderPositions(
  centerCoords: [number, number],
  points: SpiderPoint[],
  radius: number = 50,
  viewport: any
): SpiderPoint[] {
  if (points.length <= 1) return points;

  const minPointSpacing = 25; // Minimum distance between points in pixels
  const circumference = points.length * minPointSpacing;
  const calculatedRadius = Math.max(radius, circumference / (2 * Math.PI));
  
  const densityMultiplier = points.length > 8 ? 1.2 : 1.0;
  const finalRadius = calculatedRadius * densityMultiplier;

  const angleStep = (2 * Math.PI) / points.length;
  
  return points.map((point, index) => {
    const angle = index * angleStep;
    
    const [centerX, centerY] = viewport.project(centerCoords);
    
    const offsetX = centerX + Math.cos(angle) * finalRadius;
    const offsetY = centerY + Math.sin(angle) * finalRadius;
    
    // Convert back to world coordinates
    const [lng, lat] = viewport.unproject([offsetX, offsetY]);
    
    return {
      ...point,
      coordinates: [lng, lat],
      originalCoordinates: centerCoords
    };
  });
}

/**
 * Get zoom-based parameters for spider clustering
 * @param zoom - Current zoom level
 */
function getZoomBasedSpiderParams(zoom: number): { precision: number; distanceThreshold: number } {

  if (zoom >= 20) {
    return { precision: 5, distanceThreshold: 2 };
  } else if (zoom >= 19) {
    return { precision: 4, distanceThreshold: 5 };
  } else if (zoom >= 18) {
    return { precision: 3, distanceThreshold: 10 };
  } else if (zoom >= 17) {
    return { precision: 2, distanceThreshold: 20 };
  } else {
    return { precision: 1, distanceThreshold: 50 };
  }
}

/**
 * Group points by proximity to identify stacked points with zoom-aware parameters
 * @param points - Array of points to group
 * @param zoom - Current zoom level (default: 17)
 * @param customPrecision - Override precision (optional)
 * @param customDistanceThreshold - Override distance threshold (optional)
 */
export function groupStackedPoints(
  points: any[], 
  zoom: number = 17, 
  customPrecision?: number, 
  customDistanceThreshold?: number
): Map<string, any[]> {
  const zoomParams = getZoomBasedSpiderParams(zoom);
  const precision = customPrecision ?? zoomParams.precision;
  const distanceThreshold = customDistanceThreshold ?? zoomParams.distanceThreshold;
  const stackedGroups = new Map<string, any[]>();
  const factor = Math.pow(10, precision);
  
  // First pass: group by grid cells
  const gridGroups = new Map<string, any[]>();
  points.forEach(point => {
    const key = `${Math.round(point.coordinates[0] * factor)},${Math.round(point.coordinates[1] * factor)}`;
    
    if (!gridGroups.has(key)) {
      gridGroups.set(key, []);
    }
    gridGroups.get(key)!.push(point);
  });
  
  let groupId = 0;
  gridGroups.forEach((cellPoints, cellKey) => {
    const processed = new Set<number>();
    
    cellPoints.forEach((point, index) => {
      if (processed.has(index)) return;
      
      const group: any[] = [point];
      processed.add(index);
      
      for (let i = index + 1; i < cellPoints.length; i++) {
        if (processed.has(i)) continue;
        
        const otherPoint = cellPoints[i];
        const distance = calculateDistance(point.coordinates, otherPoint.coordinates);
        
        if (distance <= distanceThreshold) {
          group.push(otherPoint);
          processed.add(i);
        }
      }
      
      const groupKey = `group_${groupId++}`;
      stackedGroups.set(groupKey, group);
    });
  });
  
  return stackedGroups;
}

/**
 * Calculate distance between two coordinates in meters
 */
function calculateDistance(coord1: [number, number], coord2: [number, number]): number {
  const R = 6371000; // Earth's radius in meters
  const lat1Rad = coord1[1] * Math.PI / 180;
  const lat2Rad = coord2[1] * Math.PI / 180;
  const deltaLatRad = (coord2[1] - coord1[1]) * Math.PI / 180;
  const deltaLngRad = (coord2[0] - coord1[0]) * Math.PI / 180;

  const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Create spider clusters from grouped stacked points
 * @param stackedGroups - Map of grouped stacked points
 * @param minStackSize - Minimum number of points to create a spider cluster (default: 2)
 */
export function createSpiderClusters(
  stackedGroups: Map<string, any[]>,
  minStackSize: number = 2
): { spiderClusters: SpiderCluster[], individualPoints: any[] } {
  const spiderClusters: SpiderCluster[] = [];
  const individualPoints: any[] = [];
  
  stackedGroups.forEach((groupPoints, key) => {
    if (groupPoints.length >= minStackSize) {
      // Calculate type breakdown for the cluster
      const typeBreakdown: Record<string, number> = {};
      groupPoints.forEach(point => {
        const type = point.dataType || 'unknown';
        typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
      });
      
      // Find dominant type
      const dominantType = Object.entries(typeBreakdown)
        .reduce((a, b) => a[1] > b[1] ? a : b)[0];
      
      // Create spider cluster for stacked points
      const spiderCluster: SpiderCluster = {
        id: `spider_${key}_${Date.now()}`,
        centerCoordinates: groupPoints[0].coordinates,
        points: groupPoints.map((point, index) => ({
          id: point.id || `${key}_${index}`,
          coordinates: point.coordinates,
          originalCoordinates: point.coordinates,
          properties: point.properties,
          dataType: point.dataType
        })),
        isExpanded: false,
        dominantType,
        hasMixedTypes: Object.keys(typeBreakdown).length > 1,
        typeBreakdown
      };
      
      spiderClusters.push(spiderCluster);
    } else {
      // Add individual points that aren't stacked
      individualPoints.push(...groupPoints);
    }
  });
  
  return { spiderClusters, individualPoints };
}

/**
 * Toggle spider cluster expansion state - only one cluster can be expanded at a time
 * @param clusters - Array of spider clusters
 * @param clusterId - ID of cluster to toggle
 * @param viewport - Current viewport for coordinate calculations
 */
export function toggleSpiderCluster(
  clusters: SpiderCluster[],
  clusterId: string,
  viewport: any
): SpiderCluster[] {
  return clusters.map(cluster => {
    if (cluster.id === clusterId) {
      const isExpanding = !cluster.isExpanded;
      
      return {
        ...cluster,
        isExpanded: isExpanding,
        points: isExpanding 
          ? calculateSpiderPositions(cluster.centerCoordinates, cluster.points, 50, viewport)
          : cluster.points.map(point => ({
              ...point,
              coordinates: cluster.centerCoordinates
            }))
      };
    } else {
      // Close all other spider clusters when one is opened
      return {
        ...cluster,
        isExpanded: false,
        points: cluster.points.map(point => ({
          ...point,
          coordinates: cluster.centerCoordinates
        }))
      };
    }
  });
}

/**
 * Get the main overlay point for a spider cluster
 * @param cluster - Spider cluster
 * @param dominantDataType - Optional dominant data type for styling
 */
export function getSpiderOverlayPoint(cluster: SpiderCluster, dominantDataType?: string) {
  // Count data types in the cluster
  const typeCounts = cluster.points.reduce((acc, point) => {
    acc[point.dataType] = (acc[point.dataType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Determine dominant type if not provided
  const dominant = dominantDataType || Object.entries(typeCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'mixed';
  
  return {
    id: `overlay_${cluster.id}`,
    coordinates: cluster.centerCoordinates,
    properties: {
      cluster: true,
      point_count: cluster.points.length,
      point_count_abbreviated: cluster.points.length.toString(),
      dominant_type: dominant,
      mixed_types: Object.keys(typeCounts).length > 1,
      type_breakdown: typeCounts,
      spider_cluster_id: cluster.id,
      is_spider_overlay: true
    },
    dataType: 'spider_overlay'
  };
}

/**
 * Generate overlay points for spider clusters with anti-overlap positioning
 * @param spiderClusters - Array of spider clusters
 * @param minDistance - Minimum distance between overlay points in meters (default: 20)
 */
export function generateSpiderOverlayPoints(spiderClusters: SpiderCluster[], minDistance: number = 20): any[] {
  if (spiderClusters.length === 0) return [];
  
  const overlayPoints: any[] = [];
  const placedPositions: [number, number][] = [];
  
  spiderClusters.forEach(cluster => {
    let position = cluster.centerCoordinates;
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
      const tooClose = placedPositions.some(placedPos => 
        calculateDistance(position, placedPos) < minDistance
      );
      
      if (!tooClose) {
        break;
      }
      
      const angle = (attempts * 137.5) * Math.PI / 180; // Golden angle for good distribution
      const offsetDistance = Math.min(minDistance * (1 + attempts * 0.5), 100); // Max 100m offset
      
      const latOffset = (offsetDistance / 111000) * Math.cos(angle); // ~111km per degree lat
      const lngOffset = (offsetDistance / (111000 * Math.cos(cluster.centerCoordinates[1] * Math.PI / 180))) * Math.sin(angle);
      
      position = [
        cluster.centerCoordinates[0] + lngOffset,
        cluster.centerCoordinates[1] + latOffset
      ];
      
      attempts++;
    }
    
    placedPositions.push(position);
    
    overlayPoints.push({
      coordinates: position,
      properties: {
        cluster_id: cluster.id,
        point_count: cluster.points.length,
        point_count_abbreviated: cluster.points.length.toString(),
        dominant_type: cluster.dominantType,
        mixed_types: cluster.hasMixedTypes,
        type_breakdown: cluster.typeBreakdown,
        is_spider_overlay: true,
        original_center: cluster.centerCoordinates
      },
      isSpiderOverlay: true
    });
  });
  
  return overlayPoints;
}

/**
 * Close all spider clusters
 * @param clusters - Array of spider clusters
 */
export function closeAllSpiderClusters(clusters: SpiderCluster[]): SpiderCluster[] {
  return clusters.map(cluster => ({
    ...cluster,
    isExpanded: false,
    points: cluster.points.map(point => ({
      ...point,
      coordinates: cluster.centerCoordinates
    }))
  }));
}
