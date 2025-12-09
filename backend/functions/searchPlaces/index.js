const https = require('https');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyC5QKVqarebJ12MQm6iw5sypU1lP-G1TRE';

// Helper to make Google API requests
function googleApiRequest(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve(result);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

exports.handler = async (event) => {
    console.log('Google Places Search Request:', JSON.stringify(event));
    
    try {
        const { text, location, radius = 50000 } = JSON.parse(event.body);
        
        if (!text || text.trim().length === 0) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    error: 'Search text is required'
                })
            };
        }
        
        // Use Google Places Autocomplete API
        let autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?` +
            `input=${encodeURIComponent(text)}` +
            `&types=geocode|establishment` +
            `&key=${GOOGLE_API_KEY}`;
        
        // Add location bias if provided
        if (location && location.length === 2) {
            autocompleteUrl += `&location=${location[1]},${location[0]}&radius=${radius}`;
        }
        
        console.log('Requesting from Google Places Autocomplete API...');
        const autocompleteResult = await googleApiRequest(autocompleteUrl);
        
        if (autocompleteResult.status !== 'OK' && autocompleteResult.status !== 'ZERO_RESULTS') {
            throw new Error(`Google API error: ${autocompleteResult.status} - ${autocompleteResult.error_message || ''}`);
        }
        
        const predictions = autocompleteResult.predictions || [];
        
        // For each prediction, we need to get the place details to get coordinates
        const suggestions = [];
        
        // Limit to first 5 results to avoid too many API calls
        const limitedPredictions = predictions.slice(0, 5);
        
        // Get details for each place
        for (const prediction of limitedPredictions) {
            try {
                const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?` +
                    `place_id=${prediction.place_id}` +
                    `&fields=name,formatted_address,geometry` +
                    `&key=${GOOGLE_API_KEY}`;
                
                const detailsResult = await googleApiRequest(detailsUrl);
                
                if (detailsResult.status === 'OK' && detailsResult.result) {
                    const place = detailsResult.result;
                    suggestions.push({
                        text: place.name || prediction.structured_formatting.main_text,
                        place: place.formatted_address || prediction.description,
                        coordinates: [
                            place.geometry.location.lng,
                            place.geometry.location.lat
                        ]
                    });
                }
            } catch (detailError) {
                console.error('Error fetching place details:', detailError);
                // Continue with other results
            }
        }
        
        // If no results found, try Google Geocoding API as fallback
        if (suggestions.length === 0) {
            console.log('No autocomplete results, trying geocoding...');
            
            const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?` +
                `address=${encodeURIComponent(text)}` +
                `&key=${GOOGLE_API_KEY}`;
            
            const geocodeResult = await googleApiRequest(geocodeUrl);
            
            if (geocodeResult.status === 'OK' && geocodeResult.results) {
                for (const result of geocodeResult.results.slice(0, 5)) {
                    suggestions.push({
                        text: result.formatted_address.split(',')[0],
                        place: result.formatted_address,
                        coordinates: [
                            result.geometry.location.lng,
                            result.geometry.location.lat
                        ]
                    });
                }
            }
        }
        
        console.log(`Found ${suggestions.length} suggestions for "${text}"`);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            body: JSON.stringify({
                suggestions: suggestions,
                provider: 'Google Places API'
            })
        };
        
    } catch (error) {
        console.error('Search error:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Failed to search places',
                details: error.message
            })
        };
    }
};
