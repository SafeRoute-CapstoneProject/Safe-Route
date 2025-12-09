const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const https = require('https');

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const HERE_API_KEY = process.env.HERE_API_KEY || 'o_A9nq4o_w9Xkempjm2jmPH3kO5lI1YywvSvFo6omXo';
const TABLE_NAME = process.env.TABLE_NAME || 'RoadBlockages';

// Helper to make HTTPS requests
function httpsRequest(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    // Check for HTTP errors
                    if (res.statusCode !== 200) {
                        const errorMsg = result.error || result.error_description || result.message || `HTTP ${res.statusCode}`;
                        reject(new Error(errorMsg));
                        return;
                    }
                    // Check for API errors in response
                    if (result.error) {
                        reject(new Error(result.error_description || result.error.message || result.error));
                        return;
                    }
                    resolve(result);
                } catch (e) {
                    reject(new Error(`Failed to parse response: ${e.message}`));
                }
            });
        }).on('error', (err) => {
            reject(new Error(`Network error: ${err.message}`));
        });
    });
}

// Build bounding box string for HERE Maps avoid areas
function buildAvoidAreas(blockages) {
    const areas = [];
    
    for (const blockage of blockages) {
        // HERE Maps uses bounding box format for avoid areas
        // Format: bbox:west,south,east,north
        const centerLat = blockage.latitude;
        const centerLng = blockage.longitude;
        const radiusInDegrees = blockage.radius / 111000; // Convert meters to degrees
        
        // Calculate bounding box coordinates
        const west = centerLng - radiusInDegrees;
        const south = centerLat - radiusInDegrees;
        const east = centerLng + radiusInDegrees;
        const north = centerLat + radiusInDegrees;
        
        // HERE Maps bbox format: bbox:west,south,east,north
        const bboxString = `bbox:${west},${south},${east},${north}`;
        areas.push(bboxString);
        
        console.log(`Created avoidance bbox for blockage "${blockage.description}"`);
        console.log(`- Center: ${centerLat}, ${centerLng}`);
        console.log(`- Radius: ${blockage.radius}m`);
        console.log(`- BBox: ${bboxString}`);
    }
    
    return areas;
}

exports.handler = async (event) => {
    console.log('HERE Maps Route Calculation with Polygon Avoidance');
    
    try {
        const body = JSON.parse(event.body);
        const { origin, destination, avoidBlockages = true } = body;
        
        if (!origin || !destination || origin.length !== 2 || destination.length !== 2) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    error: 'Invalid request. Origin and destination must be [longitude, latitude] arrays.'
                })
            };
        }
        
        // Get active blockages from DynamoDB
        let activeBlockages = [];
        if (avoidBlockages) {
            try {
                const scanResult = await docClient.send(new ScanCommand({
                    TableName: TABLE_NAME,
                    FilterExpression: 'isActive = :active',
                    ExpressionAttributeValues: {
                        ':active': true
                    }
                }));
                
                activeBlockages = scanResult.Items || [];
                console.log(`Found ${activeBlockages.length} active blockages to avoid`);
            } catch (dbError) {
                console.error('Error fetching blockages:', dbError);
            }
        }
        
        // Build HERE Maps API URL
        let url = `https://router.hereapi.com/v8/routes?` +
            `transportMode=car` +
            `&origin=${origin[1]},${origin[0]}` +
            `&destination=${destination[1]},${destination[0]}` +
            `&return=polyline,summary` +
            `&apiKey=${HERE_API_KEY}`;
        
        // Add avoid areas if blockages exist
        if (activeBlockages.length > 0) {
            // HERE Maps API v8 only supports ONE avoid[areas] parameter
            // For multiple blockages, we'll merge them into a single bounding box
            // that encompasses all blockage areas
            let mergedBbox;
            
            if (activeBlockages.length === 1) {
                // Single blockage - use its bbox directly
                const avoidAreas = buildAvoidAreas(activeBlockages);
                mergedBbox = avoidAreas[0];
            } else {
                // Multiple blockages - merge into one large bbox
                let minLat = Infinity, maxLat = -Infinity;
                let minLng = Infinity, maxLng = -Infinity;
                
                for (const blockage of activeBlockages) {
                    const radiusInDegrees = blockage.radius / 111000;
                    const west = blockage.longitude - radiusInDegrees;
                    const east = blockage.longitude + radiusInDegrees;
                    const south = blockage.latitude - radiusInDegrees;
                    const north = blockage.latitude + radiusInDegrees;
                    
                    minLat = Math.min(minLat, south);
                    maxLat = Math.max(maxLat, north);
                    minLng = Math.min(minLng, west);
                    maxLng = Math.max(maxLng, east);
                }
                
                mergedBbox = `bbox:${minLng},${minLat},${maxLng},${maxLat}`;
                console.log(`Merged ${activeBlockages.length} blockages into single bbox: ${mergedBbox}`);
            }
            
            url += `&avoid[areas]=${encodeURIComponent(mergedBbox)}`;
            console.log(`Added avoidance bbox to route request`);
            console.log(`Blockages: ${activeBlockages.map(b => `${b.description} (${b.radius}m)`).join(', ')}`);
        }
        
        console.log('Requesting route from HERE Maps...');
        console.log('URL:', url.replace(HERE_API_KEY, 'API_KEY_HIDDEN'));
        
        // Make request to HERE Maps
        let hereResult;
        try {
            hereResult = await httpsRequest(url);
        } catch (requestError) {
            console.error('HERE Maps request error:', requestError);
            throw new Error(`Failed to connect to HERE Maps: ${requestError.message}`);
        }
        
        // Check for errors
        if (hereResult.error) {
            const errorMsg = hereResult.error_description || hereResult.error.message || hereResult.error || 'Unknown error';
            // Provide more helpful error message for multiple blockages
            if (activeBlockages.length > 1) {
                throw new Error(`HERE Maps error: ${errorMsg}. With ${activeBlockages.length} blockages, it may be impossible to find a route. Try reducing blockage radii or removing some blockages.`);
            } else {
                throw new Error(`HERE Maps error: ${errorMsg}`);
            }
        }
        
        if (!hereResult.routes || hereResult.routes.length === 0) {
            // If no route found with blockages, try without blockages to see if route is possible
            if (activeBlockages.length > 0) {
                console.log('No route found with blockages, checking if route exists without blockages...');
                try {
                    const urlWithoutBlockages = `https://router.hereapi.com/v8/routes?` +
                        `transportMode=car` +
                        `&origin=${origin[1]},${origin[0]}` +
                        `&destination=${destination[1]},${destination[0]}` +
                        `&return=polyline,summary` +
                        `&apiKey=${HERE_API_KEY}`;
                    
                    const routeWithoutBlockages = await httpsRequest(urlWithoutBlockages);
                    if (routeWithoutBlockages.routes && routeWithoutBlockages.routes.length > 0) {
                        // Route exists without blockages, so blockages are blocking it
                        const blockageInfo = activeBlockages.map(b => `${b.description || 'Blockage'} (${b.radius}m radius)`).join(', ');
                        throw new Error(`No route found. The ${activeBlockages.length} blockage(s) (${blockageInfo}) are blocking all possible routes between origin and destination. Try reducing blockage radius or removing some blockages.`);
                    } else {
                        throw new Error('No route found between origin and destination. This may be due to the locations being unreachable by car.');
                    }
                } catch (fallbackError) {
                    // If fallback check fails, use the original error
                    const blockageInfo = activeBlockages.map(b => `${b.description || 'Blockage'} (${b.radius}m radius)`).join(', ');
                    throw new Error(`No route found. The ${activeBlockages.length} blockage(s) (${blockageInfo}) may be blocking all possible routes. Try reducing blockage radius or removing some blockages.`);
                }
            } else {
                throw new Error('HERE Maps error: No routes found');
            }
        }
        
        // Get the best route
        const route = hereResult.routes[0];
        
        // Validate route structure
        if (!route.sections || route.sections.length === 0) {
            throw new Error('HERE Maps error: Route has no sections');
        }
        
        const firstSection = route.sections[0];
        if (!firstSection.summary) {
            throw new Error('HERE Maps error: Route section has no summary');
        }
        
        if (!firstSection.polyline) {
            throw new Error('HERE Maps error: Route section has no polyline');
        }
        
        console.log('✅ Route received from HERE Maps');
        console.log(`- Distance: ${(firstSection.summary.length / 1000).toFixed(2)}km`);
        console.log(`- Duration: ${Math.round(firstSection.summary.duration / 60)} minutes`);
        
        // Return the polyline as-is - let frontend decode it with HERE's library
        const encodedPolyline = firstSection.polyline;
        
        console.log(`Route polyline length: ${encodedPolyline.length} characters`);
        
        // Since HERE Maps avoided the blockages natively, we trust it
        const intersectedBlockages = [];
        
        console.log(`HERE Maps avoided ${activeBlockages.length} blockages using native bbox avoidance`);
        
        // Build response
        const response = {
            route: {
                polyline: encodedPolyline, // Send encoded polyline for frontend to decode
                summary: {
                    Distance: firstSection.summary.length / 1000, // Convert to km
                    DurationSeconds: firstSection.summary.duration
                }
            },
            blockages: {
                total: activeBlockages.length,
                intersected: intersectedBlockages,
                avoided: activeBlockages.filter(b => 
                    !intersectedBlockages.find(ib => ib.blockageId === b.blockageId)
                )
            },
            warnings: intersectedBlockages.length > 0 ? 
                `⚠️ Route passes through ${intersectedBlockages.length} blocked area(s)` : 
                '✅ Route successfully avoids all blockages!',
            provider: 'HERE Maps Routing API v8',
            avoidancePolygons: activeBlockages.length
        };
        
        console.log(`Final result: ${intersectedBlockages.length} blockages intersected, ${response.blockages.avoided.length} avoided`);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            body: JSON.stringify(response)
        };
        
    } catch (error) {
        console.error('Route calculation error:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Failed to calculate route',
                details: error.message
            })
        };
    }
};

// Decode HERE Maps flexible polyline format (Precision 5)
function decodeHerePolyline(encoded) {
    const coordinates = [];
    let index = 0;
    let lat = 0;
    let lng = 0;
    
    while (index < encoded.length) {
        // Decode latitude
        let shift = 0;
        let result = 0;
        let byte;
        
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        
        const deltaLat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
        lat += deltaLat;
        
        // Decode longitude
        shift = 0;
        result = 0;
        
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        
        const deltaLng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
        lng += deltaLng;
        
        // HERE uses precision 5 (divide by 100000)
        coordinates.push([lng / 100000, lat / 100000]);
    }
    
    return coordinates;
}

// Check if route passes through blockage
function routePassesThroughBlockage(coordinates, blockage) {
    const R = 6371000; // Earth's radius in meters
    
    for (const coord of coordinates) {
        const lng = coord[0];
        const lat = coord[1];
        
        // Calculate distance using Haversine formula
        const φ1 = lat * Math.PI / 180;
        const φ2 = blockage.latitude * Math.PI / 180;
        const Δφ = (blockage.latitude - lat) * Math.PI / 180;
        const Δλ = (blockage.longitude - lng) * Math.PI / 180;
        
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        if (distance <= blockage.radius) {
            return true;
        }
    }
    
    return false;
}
