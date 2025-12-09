import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import * as Location from 'expo-location';
import { searchPlaces } from '../services/placeSearch';
import { APP_CONFIG } from '../config';

export default function HomeScreen({ navigation }) {
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);
  const [sourceSuggestions, setSourceSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showSourceSuggestions, setShowSourceSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [searchingSource, setSearchingSource] = useState(false);
  const [searchingDest, setSearchingDest] = useState(false);

  const sourceInputRef = useRef(null);
  const destInputRef = useRef(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission(true);
        getCurrentLocation();
      } else {
        Alert.alert(
          'Permission Denied',
          'Location permission is required for navigation.'
        );
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Failed to get current location');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search for source
  useEffect(() => {
    if (source.length > 2) {
      const timeoutId = setTimeout(() => {
        handleSourceSearch(source);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setSourceSuggestions([]);
      setShowSourceSuggestions(false);
    }
  }, [source]);

  // Debounced search for destination
  useEffect(() => {
    if (destination.length > 2) {
      const timeoutId = setTimeout(() => {
        handleDestinationSearch(destination);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setDestSuggestions([]);
      setShowDestSuggestions(false);
    }
  }, [destination]);

  const handleSourceSearch = async (text) => {
    try {
      setSearchingSource(true);
      const suggestions = await searchPlaces(text, currentLocation);
      setSourceSuggestions(suggestions);
      setShowSourceSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error('Error searching source:', error);
    } finally {
      setSearchingSource(false);
    }
  };

  const handleDestinationSearch = async (text) => {
    try {
      setSearchingDest(true);
      const suggestions = await searchPlaces(text, currentLocation);
      setDestSuggestions(suggestions);
      setShowDestSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error('Error searching destination:', error);
    } finally {
      setSearchingDest(false);
    }
  };

  const selectSource = (suggestion) => {
    setSelectedSource({
      text: suggestion.text,
      place: suggestion.place,
      coordinates: {
        latitude: suggestion.coordinates[1],
        longitude: suggestion.coordinates[0],
      },
    });
    setSource(suggestion.place || suggestion.text);
    setShowSourceSuggestions(false);
    setSourceSuggestions([]);
  };

  const selectDestination = (suggestion) => {
    setSelectedDestination({
      text: suggestion.text,
      place: suggestion.place,
      coordinates: {
        latitude: suggestion.coordinates[1],
        longitude: suggestion.coordinates[0],
      },
    });
    setDestination(suggestion.place || suggestion.text);
    setShowDestSuggestions(false);
    setDestSuggestions([]);
  };

  const useCurrentLocationAsSource = () => {
    if (currentLocation) {
      setSelectedSource({
        text: 'Current Location',
        place: `Lat: ${currentLocation.latitude.toFixed(6)}, Lng: ${currentLocation.longitude.toFixed(6)}`,
        coordinates: currentLocation,
      });
      setSource('Current Location');
    }
  };

  const handleGetRoute = async () => {
    if (!selectedSource || !selectedDestination) {
      Alert.alert('Error', 'Please select both source and destination');
      return;
    }

    const origin = selectedSource.coordinates;
    const dest = selectedDestination.coordinates;

    navigation.navigate('Route', {
      origin,
      destination: dest,
      sourceText: selectedSource.place || selectedSource.text,
      destinationText: selectedDestination.place || selectedDestination.text,
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚗 Smart Route Navigation</Text>
        <Text style={styles.headerSubtitle}>
          HERE Maps with 100% guaranteed blockage avoidance
        </Text>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Current Location Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Your Current Location</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#00AFAA" />
          ) : currentLocation ? (
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>
                {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </Text>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={getCurrentLocation}
              >
                <Text style={styles.refreshButtonText}>🔄 Refresh Location</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.locationButton}
              onPress={getCurrentLocation}
            >
              <Text style={styles.locationButtonText}>Get Location</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Source Input Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Source</Text>
          <View style={styles.searchContainer}>
            <TextInput
              ref={sourceInputRef}
              style={styles.input}
              placeholder="Search for source location..."
              value={source}
              onChangeText={setSource}
              onFocus={() => {
                if (sourceSuggestions.length > 0) {
                  setShowSourceSuggestions(true);
                }
              }}
            />
            {searchingSource && (
              <ActivityIndicator size="small" color="#00AFAA" style={styles.searchLoader} />
            )}
          </View>
          
          {currentLocation && (
            <TouchableOpacity
              style={styles.useCurrentButton}
              onPress={useCurrentLocationAsSource}
            >
              <Text style={styles.useCurrentText}>📍 Use Current Location</Text>
            </TouchableOpacity>
          )}

          {showSourceSuggestions && sourceSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {sourceSuggestions.map((item, index) => (
                <TouchableOpacity
                  key={`source-${index}`}
                  style={styles.suggestionItem}
                  onPress={() => selectSource(item)}
                >
                  <Text style={styles.suggestionText}>{item.text}</Text>
                  <Text style={styles.suggestionPlace}>{item.place}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Destination Input Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎯 Destination</Text>
          <View style={styles.searchContainer}>
            <TextInput
              ref={destInputRef}
              style={styles.input}
              placeholder="Search for destination..."
              value={destination}
              onChangeText={setDestination}
              onFocus={() => {
                if (destSuggestions.length > 0) {
                  setShowDestSuggestions(true);
                }
              }}
            />
            {searchingDest && (
              <ActivityIndicator size="small" color="#00AFAA" style={styles.searchLoader} />
            )}
          </View>

          {showDestSuggestions && destSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {destSuggestions.map((item, index) => (
                <TouchableOpacity
                  key={`dest-${index}`}
                  style={styles.suggestionItem}
                  onPress={() => selectDestination(item)}
                >
                  <Text style={styles.suggestionText}>{item.text}</Text>
                  <Text style={styles.suggestionPlace}>{item.place}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Get Route Button */}
        <TouchableOpacity
          style={[
            styles.getRouteButton,
            (!selectedSource || !selectedDestination) && styles.buttonDisabled,
          ]}
          onPress={handleGetRoute}
          disabled={!selectedSource || !selectedDestination}
        >
          <Text style={styles.getRouteButtonText}>Get Route</Text>
        </TouchableOpacity>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            💡 This app uses HERE Maps to calculate optimal routes while avoiding reported road blockages in real-time.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#00AFAA',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'white',
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  locationInfo: {
    marginTop: 10,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  refreshButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#00AFAA',
    fontWeight: '600',
  },
  locationButton: {
    backgroundColor: '#00AFAA',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  locationButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  searchContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  searchLoader: {
    position: 'absolute',
    right: 15,
  },
  useCurrentButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  useCurrentText: {
    color: '#00AFAA',
    fontWeight: '600',
    fontSize: 14,
  },
  suggestionsContainer: {
    marginTop: 10,
    maxHeight: 200,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderRadius: 8,
    backgroundColor: 'white',
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 4,
  },
  suggestionPlace: {
    fontSize: 13,
    color: '#666',
  },
  getRouteButton: {
    backgroundColor: '#00AFAA',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#00AFAA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  getRouteButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
  },
  infoCard: {
    backgroundColor: '#e7f3ff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 13,
    color: '#0066cc',
    lineHeight: 20,
  },
});
