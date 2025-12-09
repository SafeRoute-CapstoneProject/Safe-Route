import axios from 'axios';
import { API_CONFIG } from '../config';

/**
 * Search for places using the backend search API
 * @param {string} text - Search query
 * @param {Object} location - Optional location bias {latitude, longitude}
 * @returns {Promise<Array>} Array of place suggestions
 */
export async function searchPlaces(text, location = null) {
  try {
    const requestBody = {
      text: text,
    };

    if (location) {
      requestBody.location = [location.longitude, location.latitude];
      requestBody.radius = 50000; // 50km radius
    }

    const response = await axios.post(
      `${API_CONFIG.endpoint}${API_CONFIG.endpoints.searchPlaces}`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.suggestions) {
      return response.data.suggestions;
    }

    return [];
  } catch (error) {
    console.error('Error searching places:', error);
    throw error;
  }
}

