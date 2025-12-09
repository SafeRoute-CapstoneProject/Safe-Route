// Decode HERE Maps flexible polyline format
// Using official HERE Maps flexible polyline decoder
import { decode } from '@here/flexpolyline';

export function decodeHerePolyline(encoded) {
  try {
    if (!encoded || typeof encoded !== 'string') {
      throw new Error('Invalid polyline string');
    }

    console.log(`🔍 Decoding polyline using official HERE decoder, length: ${encoded.length}`);
    console.log(`📏 First 50 chars: ${encoded.substring(0, 50)}`);
    
    // Use official HERE Maps flexible polyline decoder
    const decoded = decode(encoded);
    
    if (!decoded || !decoded.polyline || !Array.isArray(decoded.polyline)) {
      throw new Error('Invalid decoded polyline format from HERE decoder');
    }
    
    // Convert from [[lat, lng], ...] format to [{latitude, longitude}, ...] format
    const coordinates = decoded.polyline.map(coord => ({
      latitude: coord[0],
      longitude: coord[1],
    }));
    
    if (coordinates.length === 0) {
      throw new Error('No coordinates decoded from polyline');
    }
    
    if (coordinates.length < 2) {
      throw new Error(`Only ${coordinates.length} coordinate(s) decoded, need at least 2 for a route`);
    }
    
    console.log(`✅ Successfully decoded ${coordinates.length} valid coordinates from polyline`);
    if (coordinates.length > 0) {
      console.log(`📍 First: ${coordinates[0].latitude.toFixed(6)}, ${coordinates[0].longitude.toFixed(6)}`);
      console.log(`📍 Last: ${coordinates[coordinates.length - 1].latitude.toFixed(6)}, ${coordinates[coordinates.length - 1].longitude.toFixed(6)}`);
    }
    
    return coordinates;
  } catch (error) {
    console.error('❌ Error decoding HERE polyline:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Polyline string (first 100 chars):', encoded?.substring(0, 100));
    throw error;
  }
}

// Alternative: Create route with waypoints that avoid blockages
export function createSimpleRoute(start, end, numPoints = 50) {
  const coordinates = [];
  
  // Create more points for smoother route visualization
  for (let i = 0; i <= numPoints; i++) {
    const ratio = i / numPoints;
    // Use easing function for more natural curve
    const easedRatio = ratio * ratio * (3 - 2 * ratio); // Smoothstep
    
    coordinates.push({
      latitude: start.latitude + (end.latitude - start.latitude) * easedRatio,
      longitude: start.longitude + (end.longitude - start.longitude) * easedRatio,
    });
  }
  
  return coordinates;
}

// Enhanced route creation with intermediate waypoints
export function createRouteWithWaypoints(start, end, waypoints = [], numPointsPerSegment = 20) {
  const allCoordinates = [];
  const points = [start, ...waypoints, end];
  
  for (let i = 0; i < points.length - 1; i++) {
    const segment = createSimpleRoute(points[i], points[i + 1], numPointsPerSegment);
    // Don't duplicate the last point of previous segment
    if (i > 0) {
      allCoordinates.push(...segment.slice(1));
    } else {
      allCoordinates.push(...segment);
    }
  }
  
  return allCoordinates;
}
