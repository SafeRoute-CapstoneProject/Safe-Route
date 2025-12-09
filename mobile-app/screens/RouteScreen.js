import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import axios from 'axios';
import { API_CONFIG } from '../config';
import { decodeHerePolyline, createSimpleRoute } from '../utils/polylineDecoder';

// Conditionally import MapView only for native platforms
let MapView, Marker, Polyline, Circle;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
  Circle = Maps.Circle;
}

const { width, height } = Dimensions.get('window');

export default function RouteScreen({ route, navigation }) {
  const { origin, destination, sourceText, destinationText } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [routeData, setRouteData] = useState(null);
  const [blockages, setBlockages] = useState([]);
  const [mapRegion, setMapRegion] = useState(null);
  // Don't initialize with fallback - wait for API route to avoid straight lines
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [showBlockages, setShowBlockages] = useState(true);

  useEffect(() => {
    // Initialize route - wait for API response (no fallback straight line)
    initializeRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debug: Log route coordinates (must be before early returns)
  useEffect(() => {
    if (routeCoordinates && routeCoordinates.length > 0) {
      console.log(`🗺️ Route coordinates ready: ${routeCoordinates.length} points`);
      console.log(`📍 First point:`, JSON.stringify(routeCoordinates[0]));
      console.log(`📍 Last point:`, JSON.stringify(routeCoordinates[routeCoordinates.length - 1]));
    }
  }, [routeCoordinates]);

  const initializeRoute = async () => {
    try {
      setLoading(true);
      
      // Get route and blockages in parallel
      await Promise.all([
        fetchRoute(origin, destination),
        fetchBlockages(),
      ]);
      
      // Set map region to show both origin and destination with padding
      const midLat = (origin.latitude + destination.latitude) / 2;
      const midLon = (origin.longitude + destination.longitude) / 2;
      const latDelta = Math.abs(origin.latitude - destination.latitude) * 2.5 || 0.05;
      const lonDelta = Math.abs(origin.longitude - destination.longitude) * 2.5 || 0.05;
      
      // Add padding to ensure route is fully visible
      const padding = 1.3; // 30% padding
      const newRegion = {
        latitude: midLat,
        longitude: midLon,
        latitudeDelta: Math.max(latDelta * padding, 0.02),
        longitudeDelta: Math.max(lonDelta * padding, 0.02),
      };
      
      setMapRegion(newRegion);
      
      // If we have route coordinates, fit map to show entire route
      if (routeCoordinates.length > 0) {
        // Calculate bounds from route coordinates
        const lats = routeCoordinates.map(c => c.latitude);
        const lngs = routeCoordinates.map(c => c.longitude);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        
        const routeMidLat = (minLat + maxLat) / 2;
        const routeMidLng = (minLng + maxLng) / 2;
        const routeLatDelta = (maxLat - minLat) * padding || 0.05;
        const routeLngDelta = (maxLng - minLng) * padding || 0.05;
        
        setMapRegion({
          latitude: routeMidLat,
          longitude: routeMidLng,
          latitudeDelta: Math.max(routeLatDelta, 0.02),
          longitudeDelta: Math.max(routeLngDelta, 0.02),
        });
      }
      
    } catch (error) {
      console.error('Error initializing route:', error);
      Alert.alert('Error', 'Failed to calculate route: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoute = async (start, end) => {
    try {
      console.log('Fetching route from API...');
      const response = await axios.post(
        `${API_CONFIG.endpoint}${API_CONFIG.endpoints.calculateRoute}`,
        {
          origin: [start.longitude, start.latitude],
          destination: [end.longitude, end.latitude],
          avoidBlockages: true,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log('Route API response:', response.data);
      
      if (response.data.error) {
        throw new Error(response.data.error || response.data.details || 'Failed to calculate route');
      }
      
      setRouteData(response.data);
      
      // Decode the HERE Maps polyline - THIS IS CRITICAL for route to follow roads
      let routeCoords = [];
      if (response.data.route?.polyline) {
        try {
          const polylineStr = response.data.route.polyline;
          console.log('🔍 Attempting to decode polyline...');
          console.log(`📏 Polyline length: ${polylineStr.length} characters`);
          console.log(`📏 First 50 chars: ${polylineStr.substring(0, 50)}`);
          console.log(`📏 Last 20 chars: ${polylineStr.substring(polylineStr.length - 20)}`);
          console.log(`📏 First char code: ${polylineStr.charCodeAt(0)}`);
          console.log(`📏 Second char code: ${polylineStr.charCodeAt(1)}`);
          
          // Try decoding - this MUST succeed for route to follow roads
          const decoded = decodeHerePolyline(polylineStr);
          if (decoded && decoded.length >= 2) {
            routeCoords = decoded;
            console.log(`✅ Successfully decoded ${decoded.length} route coordinates`);
            console.log(`📍 Route will follow roads with ${decoded.length} waypoints`);
            console.log(`📍 First coord:`, JSON.stringify(decoded[0]));
            console.log(`📍 Last coord:`, JSON.stringify(decoded[decoded.length - 1]));
            
            // Set the decoded route coordinates immediately
            setRouteCoordinates(routeCoords);
            console.log(`✅ Route coordinates set: ${routeCoords.length} points`);
          } else {
            throw new Error(`Decoded polyline has only ${decoded?.length || 0} coordinates, need at least 2`);
          }
        } catch (decodeError) {
          console.error('❌ CRITICAL: Error decoding polyline:', decodeError);
          console.error('❌ Error message:', decodeError.message);
          console.error('❌ Stack:', decodeError.stack);
          
          // If decoding fails, we CANNOT use a straight line fallback
          // because that won't avoid blockages. We need to show an error.
          Alert.alert(
            'Route Decoding Error',
            `Failed to decode the route polyline: ${decodeError.message}\n\nThe route cannot be displayed correctly. Please try refreshing or contact support.`,
            [{ text: 'OK' }]
          );
          
          // Clear route coordinates so we don't show a misleading straight line
          setRouteCoordinates([]);
          console.error('⚠️ Route coordinates cleared due to decode failure');
          return; // Don't continue - the route won't be accurate
        }
      } else {
        console.error('❌ CRITICAL: No polyline in API response!');
        Alert.alert(
          'Route Error',
          'No route data received from server. Please check your connection and try again.',
          [{ text: 'OK' }]
        );
        // Clear route coordinates
        setRouteCoordinates([]);
        return; // Don't use fallback - it won't avoid blockages
      }
      
      // Show success message if route avoids all blockages
      if (response.data.blockages?.intersected?.length === 0) {
        // Success - route avoids all blockages
      } else if (response.data.blockages?.intersected?.length > 0) {
        Alert.alert(
          'Route Warning',
          `Your route passes through ${response.data.blockages.intersected.length} blocked area(s).`
        );
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || error.message || 'Failed to calculate route'
      );
      
      // Fallback: create a route with waypoints
      const fallbackRoute = createSimpleRoute(start, end, 100);
      setRouteCoordinates(fallbackRoute);
      console.log(`📍 Error fallback route created: ${fallbackRoute.length} points`);
      console.log(`📍 Error fallback first:`, JSON.stringify(fallbackRoute[0]));
      console.log(`📍 Error fallback last:`, JSON.stringify(fallbackRoute[fallbackRoute.length - 1]));
    }
  };

  const fetchBlockages = async () => {
    try {
      const response = await axios.get(
        `${API_CONFIG.endpoint}${API_CONFIG.endpoints.blockages}`
      );
      
      const activeBlockages = (response.data.blockages || []).filter(b => b.isActive);
      setBlockages(activeBlockages);
    } catch (error) {
      console.error('Error fetching blockages:', error);
      // Continue without blockages
      setBlockages([]);
    }
  };

  const formatDistance = (km) => {
    if (km < 1) {
      return `${(km * 1000).toFixed(0)} m`;
    }
    return `${km.toFixed(2)} km`;
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  };

  // Ensure route coordinates are always valid
  const getValidRouteCoordinates = () => {
    console.log(`🔍 getValidRouteCoordinates called - routeCoordinates length: ${routeCoordinates?.length || 0}`);
    
    if (routeCoordinates && routeCoordinates.length >= 2) {
      const valid = routeCoordinates.filter(coord => 
        coord && 
        typeof coord.latitude === 'number' && 
        typeof coord.longitude === 'number' &&
        !isNaN(coord.latitude) && 
        !isNaN(coord.longitude) &&
        coord.latitude >= -90 && coord.latitude <= 90 &&
        coord.longitude >= -180 && coord.longitude <= 180
      );
      console.log(`✅ Found ${valid.length} valid coordinates out of ${routeCoordinates.length}`);
      if (valid.length >= 2) {
        return valid;
      }
    }
    
    // NO FALLBACK - if we don't have valid decoded coordinates, return empty array
    // This prevents showing a misleading straight line that doesn't avoid blockages
    console.warn('⚠️ No valid route coordinates available - route will not be displayed');
    console.warn('⚠️ This means the polyline decoder failed or returned invalid coordinates');
    return [];
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00AFAA" />
        <Text style={styles.loadingText}>Calculating route...</Text>
      </View>
    );
  }

  const intersectedCount = routeData?.blockages?.intersected?.length || 0;
  const totalBlockages = routeData?.blockages?.total || blockages.length;
  const distance = routeData?.route?.summary?.Distance || 0;
  const duration = routeData?.route?.summary?.DurationSeconds || 0;

  // Debug: Log current route coordinates state
  console.log(`🔍 Current routeCoordinates state:`, {
    length: routeCoordinates?.length || 0,
    hasCoords: !!routeCoordinates && routeCoordinates.length > 0,
    first: routeCoordinates?.[0],
    last: routeCoordinates?.[routeCoordinates?.length - 1],
  });

  // Web-compatible map component
  const WebMapView = () => {
    if (Platform.OS !== 'web' || !mapRegion) return null;
    
    const originStr = `${origin.latitude},${origin.longitude}`;
    const destStr = `${destination.latitude},${destination.longitude}`;
    const googleMapsUrl = `https://www.google.com/maps/dir/${originStr}/${destStr}`;
    
    return (
      <View style={styles.map}>
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapPlaceholderText}>🗺️ Route Map</Text>
          <Text style={styles.mapPlaceholderSubtext}>
            Source: {sourceText || `${origin.latitude.toFixed(4)}, ${origin.longitude.toFixed(4)}`}
          </Text>
          <Text style={styles.mapPlaceholderSubtext}>
            Destination: {destinationText || `${destination.latitude.toFixed(4)}, ${destination.longitude.toFixed(4)}`}
          </Text>
          <Text style={styles.mapPlaceholderSubtext}>
            Distance: {formatDistance(distance)} • Duration: {formatDuration(duration)}
          </Text>
          <TouchableOpacity
            style={styles.openMapButton}
            onPress={() => {
              if (Platform.OS === 'web' && typeof window !== 'undefined') {
                window.open(googleMapsUrl, '_blank');
              } else {
                Linking.openURL(googleMapsUrl);
              }
            }}
          >
            <Text style={styles.openMapButtonText}>📍 Open Route in Google Maps</Text>
          </TouchableOpacity>
          {blockages.length > 0 && (
            <View style={styles.blockagesList}>
              <Text style={styles.blockagesListTitle}>🚧 Blockages on Route:</Text>
              {blockages.slice(0, 5).map((blockage, idx) => (
                <Text key={idx} style={styles.blockageItem}>
                  • {blockage.description} ({blockage.radius}m radius)
                </Text>
              ))}
              {blockages.length > 5 && (
                <Text style={styles.blockageItem}>... and {blockages.length - 5} more</Text>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <WebMapView />
      ) : (
        mapRegion && MapView && (
          <MapView
            style={styles.map}
            initialRegion={mapRegion}
            region={mapRegion}
            showsUserLocation={true}
            showsMyLocationButton={true}
            zoomEnabled={true}
            zoomControlEnabled={Platform.OS === 'android'}
            scrollEnabled={true}
            pitchEnabled={false}
            rotateEnabled={false}
            minZoomLevel={10}
            maxZoomLevel={20}
          >
            {/* Origin Marker */}
            <Marker
              coordinate={origin}
              title="Source"
              description={sourceText || 'Starting point'}
            >
              <View style={styles.sourceMarker}>
                <Text style={styles.markerText}>📍</Text>
              </View>
            </Marker>
            
            {/* Destination Marker */}
            <Marker
              coordinate={destination}
              title="Destination"
              description={destinationText || 'Destination'}
            >
              <View style={styles.destMarker}>
                <Text style={styles.markerText}>🎯</Text>
              </View>
            </Marker>
            
            
            {/* Route Line - Always show route (matching web app style) */}
            {(() => {
              if (!Polyline) {
                console.error('❌ Polyline component is not available!');
                return null;
              }
              
              const coords = getValidRouteCoordinates();
              
              console.log(`🗺️ Rendering Polyline - Polyline available: ${!!Polyline}`);
              console.log(`🗺️ Coordinates count: ${coords.length}`);
              if (coords.length > 0) {
                console.log(`📍 First coord:`, JSON.stringify(coords[0]));
                console.log(`📍 Last coord:`, JSON.stringify(coords[coords.length - 1]));
              }
              
              if (coords.length < 2) {
                console.warn('⚠️ Not enough coordinates to render route');
                console.warn('⚠️ This means the polyline decoder failed - route will not be displayed');
                // Don't render a fallback straight line - it's misleading
                return null;
              }
              
              console.log(`✅ Rendering Polyline with ${coords.length} coordinates`);
              return (
                <Polyline
                  coordinates={coords}
                  strokeColor="#00AFAA"
                  strokeWidth={5}
                  lineCap="round"
                  lineJoin="round"
                  geodesic={true}
                  miterLimit={2}
                  tappable={false}
                  zIndex={1}
                />
              );
            })()}
            
            {/* Blockage Markers and Circles */}
            {showBlockages && blockages.map((blockage, index) => (
              <React.Fragment key={blockage.blockageId || index}>
                <Marker
                  coordinate={{
                    latitude: blockage.latitude,
                    longitude: blockage.longitude,
                  }}
                  title="Road Blockage"
                  description={blockage.description}
                >
                  <View style={styles.blockageMarker}>
                    <Text style={styles.blockageMarkerText}>🚧</Text>
                  </View>
                </Marker>
                <Circle
                  center={{
                    latitude: blockage.latitude,
                    longitude: blockage.longitude,
                  }}
                  radius={blockage.radius || 100}
                  fillColor="rgba(255, 68, 68, 0.2)"
                  strokeColor="rgba(255, 0, 0, 0.8)"
                  strokeWidth={2}
                />
              </React.Fragment>
            ))}
          </MapView>
        )
      )}
      
      {/* Toggle Blockages Button - Only show on native */}
      {Platform.OS !== 'web' && (
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setShowBlockages(!showBlockages)}
        >
          <Text style={styles.toggleButtonText}>
            {showBlockages ? '👁️ Hide Blockages' : '👁️ Show Blockages'}
          </Text>
        </TouchableOpacity>
      )}
      
      {/* Route Info Panel */}
      <View style={styles.infoPanel}>
        <ScrollView>
          <View style={styles.routeHeader}>
            <Text style={styles.routeHeaderTitle}>Route Information</Text>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.routeStats}>
            <View style={styles.routeStat}>
              <Text style={styles.routeStatLabel}>Distance</Text>
              <Text style={styles.routeStatValue}>{formatDistance(distance)}</Text>
            </View>
            
            <View style={styles.routeStat}>
              <Text style={styles.routeStatLabel}>Duration</Text>
              <Text style={styles.routeStatValue}>{formatDuration(duration)}</Text>
            </View>
            
            <View style={styles.routeStat}>
              <Text style={styles.routeStatLabel}>Blockages</Text>
              <Text style={styles.routeStatValue}>
                {intersectedCount} on route{'\n'}{totalBlockages} total
              </Text>
            </View>
          </View>
          
          {/* Blockage Warning/Success Message */}
          <View style={[
            styles.blockageInfo,
            intersectedCount === 0 ? styles.blockageInfoSuccess : styles.blockageInfoWarning
          ]}>
            <Text style={[
              styles.blockageInfoText,
              intersectedCount === 0 ? { color: '#155724' } : { color: '#856404' }
            ]}>
              {intersectedCount === 0 
                ? '✅ Route successfully avoids all blockages!'
                : `⚠️ Route passes through ${intersectedCount} blocked area(s)`
              }
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={initializeRoute}
          >
            <Text style={styles.refreshButtonText}>
              🔄 Refresh Route
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  map: {
    flex: 1,
  },
  sourceMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00AFAA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  destMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0073B1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  markerText: {
    fontSize: 18,
  },
  blockageMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ff0000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  blockageMarkerText: {
    fontSize: 14,
  },
  toggleButton: {
    position: 'absolute',
    bottom: height * 0.4 + 20,
    right: 20,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  infoPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: height * 0.4,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  routeHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 28,
    color: '#666',
  },
  routeStats: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 15,
    gap: 15,
  },
  routeStat: {
    flex: 1,
  },
  routeStatLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  routeStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  blockageInfo: {
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  blockageInfoSuccess: {
    backgroundColor: '#d4edda',
    borderLeftColor: '#28a745',
  },
  blockageInfoWarning: {
    backgroundColor: '#fff3cd',
    borderLeftColor: '#ffc107',
  },
  blockageInfoText: {
    fontSize: 14,
    fontWeight: '500',
  },
  refreshButton: {
    backgroundColor: '#00AFAA',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 20,
  },
  mapPlaceholderText: {
    fontSize: 28,
    marginBottom: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  openMapButton: {
    marginTop: 30,
    backgroundColor: '#00AFAA',
    padding: 15,
    borderRadius: 8,
    paddingHorizontal: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  openMapButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  blockagesList: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    width: '90%',
    maxWidth: 400,
  },
  blockagesListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  blockageItem: {
    fontSize: 13,
    color: '#666',
    marginBottom: 5,
  },
});

