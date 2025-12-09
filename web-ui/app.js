// Configuration
const API_ENDPOINT = 'https://up94634q80.execute-api.us-east-1.amazonaws.com/Prod';

// Global variables
let map;
let blockages = [];
let selectedLocation = null;
let drawingManager;
let currentCircle = null;
let radiusSlider;
let radiusValue;
let searchAutocomplete;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set up form submission
    document.getElementById('blockageForm').addEventListener('submit', handleFormSubmit);
    
    // Set up radius slider
    radiusSlider = document.getElementById('radius');
    radiusValue = document.getElementById('radiusValue');
    
    if (radiusSlider && radiusValue) {
        radiusSlider.addEventListener('input', function() {
            radiusValue.textContent = this.value;
            if (currentCircle) {
                currentCircle.setRadius(parseInt(this.value));
            }
        });
    }
});

// Initialize Google Map (called by Google Maps callback)
window.initializeMap = function() {
    // Center on Boston
    const boston = { lat: 42.3601, lng: -71.0589 };
    
    map = new google.maps.Map(document.getElementById('map'), {
        center: boston,
        zoom: 13,
        styles: [
            {
                "featureType": "poi",
                "elementType": "labels",
                "stylers": [{ "visibility": "off" }]
            }
        ]
    });
    
    // Set up drawing manager for circle drawing
    drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: true,
        drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: ['circle']
        },
        circleOptions: {
            fillColor: '#ff4444',
            fillOpacity: 0.3,
            strokeWeight: 2,
            strokeColor: '#ff0000',
            clickable: false,
            editable: true,
            zIndex: 1
        }
    });
    drawingManager.setMap(map);
    
    // Handle circle complete event
    google.maps.event.addListener(drawingManager, 'circlecomplete', function(circle) {
        if (currentCircle) {
            currentCircle.setMap(null);
        }
        currentCircle = circle;
        
        const center = circle.getCenter();
        const radius = Math.round(circle.getRadius());
        
        // Update form with circle data
        document.getElementById('latitude').value = center.lat().toFixed(6);
        document.getElementById('longitude').value = center.lng().toFixed(6);
        document.getElementById('radius').value = radius;
        if (document.getElementById('radiusValue')) {
            document.getElementById('radiusValue').textContent = radius;
        }
        
        selectedLocation = {
            lat: center.lat(),
            lng: center.lng()
        };
        
        // Listen for radius changes
        google.maps.event.addListener(circle, 'radius_changed', function() {
            const newRadius = Math.round(circle.getRadius());
            document.getElementById('radius').value = newRadius;
            if (document.getElementById('radiusValue')) {
                document.getElementById('radiusValue').textContent = newRadius;
            }
        });
        
        // Listen for center changes
        google.maps.event.addListener(circle, 'center_changed', function() {
            const newCenter = circle.getCenter();
            document.getElementById('latitude').value = newCenter.lat().toFixed(6);
            document.getElementById('longitude').value = newCenter.lng().toFixed(6);
            selectedLocation = {
                lat: newCenter.lat(),
                lng: newCenter.lng()
            };
        });
    });
    
    // Handle map click
    map.addListener('click', function(event) {
        handleMapClick(event.latLng);
    });
    
    // Load existing blockages
    loadBlockages();
    
    // Set up location search
    setupLocationSearch();
}

// Handle map click
function handleMapClick(latLng) {
    selectedLocation = {
        lat: latLng.lat(),
        lng: latLng.lng()
    };
    
    // Update form fields
    document.getElementById('latitude').value = selectedLocation.lat.toFixed(6);
    document.getElementById('longitude').value = selectedLocation.lng.toFixed(6);
    
    // Create or update circle
    const radius = parseInt(document.getElementById('radius').value);
    
    if (currentCircle) {
        currentCircle.setCenter(latLng);
        currentCircle.setRadius(radius);
    } else {
        currentCircle = new google.maps.Circle({
            center: latLng,
            radius: radius,
            fillColor: '#ff4444',
            fillOpacity: 0.3,
            strokeWeight: 2,
            strokeColor: '#ff0000',
            editable: true,
            map: map
        });
        
        // Listen for changes
        google.maps.event.addListener(currentCircle, 'radius_changed', function() {
            const newRadius = Math.round(currentCircle.getRadius());
            document.getElementById('radius').value = newRadius;
            if (document.getElementById('radiusValue')) {
                document.getElementById('radiusValue').textContent = newRadius;
            }
        });
        
        google.maps.event.addListener(currentCircle, 'center_changed', function() {
            const newCenter = currentCircle.getCenter();
            document.getElementById('latitude').value = newCenter.lat().toFixed(6);
            document.getElementById('longitude').value = newCenter.lng().toFixed(6);
            selectedLocation = {
                lat: newCenter.lat(),
                lng: newCenter.lng()
            };
        });
    }
}

// Setup location search with Google Places
function setupLocationSearch() {
    const searchInput = document.getElementById('locationSearch');
    
    searchAutocomplete = new google.maps.places.Autocomplete(searchInput, {
        bounds: new google.maps.LatLngBounds(
            new google.maps.LatLng(42.2279, -71.1912),
            new google.maps.LatLng(42.3989, -70.9238)
        ),
        strictBounds: false
    });
    
    searchAutocomplete.addListener('place_changed', function() {
        const place = searchAutocomplete.getPlace();
        
        if (place.geometry) {
            // Center map on the selected place
            map.setCenter(place.geometry.location);
            map.setZoom(17);
            
            // Update location
            handleMapClick(place.geometry.location);
            
            // Clear search input
            searchInput.value = place.name || place.formatted_address;
        }
    });
}

// Load existing blockages
async function loadBlockages() {
    showLoading(true);
    try {
        const response = await fetch(`${API_ENDPOINT}/blockages`);
        const data = await response.json();
        
        if (data.blockages) {
            blockages = data.blockages;
            displayBlockages();
            updateBlockagesList();
        }
    } catch (error) {
        console.error('Error loading blockages:', error);
        showError('Failed to load blockages');
    } finally {
        showLoading(false);
    }
}

// Display blockages on map
function displayBlockages() {
    console.log('Displaying blockages:', blockages);
    
    // Clear existing blockage circles if any
    if (window.blockageCircles) {
        window.blockageCircles.forEach(circle => circle.setMap(null));
    }
    window.blockageCircles = [];
    
    blockages.forEach(blockage => {
        // Create circle for blockage
        const circle = new google.maps.Circle({
            center: { lat: blockage.latitude, lng: blockage.longitude },
            radius: blockage.radius,
            fillColor: blockage.isActive ? '#ff4444' : '#888888',
            fillOpacity: 0.2,
            strokeColor: blockage.isActive ? '#ff0000' : '#666666',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            map: map
        });
        
        window.blockageCircles.push(circle);
        
        // Create info window
        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div style="padding: 10px;">
                    <h4 style="margin: 0 0 5px 0;">${blockage.description}</h4>
                    <p style="margin: 0; color: #666;">
                        Radius: ${blockage.radius}m<br>
                        Status: ${blockage.isActive ? 'Active' : 'Inactive'}<br>
                        Created: ${new Date(blockage.timestamp || blockage.createdAt).toLocaleDateString()}
                    </p>
                </div>
            `
        });
        
        // Add click listener
        circle.addListener('click', function() {
            infoWindow.setPosition(circle.getCenter());
            infoWindow.open(map);
        });
        
        // Store reference to circle for later removal
        blockage.mapCircle = circle;
        blockage.mapInfoWindow = infoWindow;
    });
}

// Update blockages list
function updateBlockagesList() {
    const listContainer = document.getElementById('blockagesList');
    listContainer.innerHTML = '';
    
    if (blockages.length === 0) {
        listContainer.innerHTML = '<p class="no-blockages">No blockages reported yet</p>';
        return;
    }
    
    blockages.forEach(blockage => {
        const blockageElement = document.createElement('div');
        blockageElement.className = `blockage-item ${blockage.isActive ? 'active' : 'inactive'}`;
        blockageElement.innerHTML = `
            <div class="blockage-info">
                <h3>${blockage.description}</h3>
                <p>📍 ${blockage.latitude.toFixed(4)}, ${blockage.longitude.toFixed(4)}</p>
                <p>Radius: ${blockage.radius}m | Status: ${blockage.isActive ? 'Active' : 'Inactive'}</p>
                <p class="blockage-date">Created: ${new Date(blockage.timestamp || blockage.createdAt).toLocaleDateString()}</p>
            </div>
            <button class="delete-btn" onclick="deleteBlockage('${blockage.blockageId}')">Delete</button>
        `;
        listContainer.appendChild(blockageElement);
    });
}

// Handle form submission
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const description = document.getElementById('description').value;
    const latitude = parseFloat(document.getElementById('latitude').value);
    const longitude = parseFloat(document.getElementById('longitude').value);
    const radius = parseInt(document.getElementById('radius').value);
    
    if (!description || isNaN(latitude) || isNaN(longitude)) {
        showError('Please fill in all required fields');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_ENDPOINT}/blockages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                description,
                latitude,
                longitude,
                radius,
                isActive: true
            })
        });
        
        if (response.ok) {
            showSuccess('Blockage reported successfully!');
            document.getElementById('blockageForm').reset();
            if (document.getElementById('radiusValue')) {
                document.getElementById('radiusValue').textContent = '100';
            }
            
            // Clear current circle
            if (currentCircle) {
                currentCircle.setMap(null);
                currentCircle = null;
            }
            
            // Reload blockages
            await loadBlockages();
        } else {
            const error = await response.json();
            showError(error.message || 'Failed to report blockage');
        }
    } catch (error) {
        console.error('Error reporting blockage:', error);
        showError('Failed to report blockage');
    } finally {
        showLoading(false);
    }
}

// Delete blockage
async function deleteBlockage(blockageId) {
    if (!confirm('Are you sure you want to delete this blockage?')) {
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_ENDPOINT}/blockages/${blockageId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showSuccess('Blockage deleted successfully!');
            
            // Remove from map
            const blockage = blockages.find(b => b.blockageId === blockageId);
            if (blockage && blockage.mapCircle) {
                blockage.mapCircle.setMap(null);
            }
            
            // Reload blockages
            await loadBlockages();
        } else {
            const error = await response.json();
            showError(error.message || 'Failed to delete blockage');
        }
    } catch (error) {
        console.error('Error deleting blockage:', error);
        showError('Failed to delete blockage');
    } finally {
        showLoading(false);
    }
}

// Show loading state
function showLoading(show) {
    const loader = document.querySelector('.loading');
    if (show) {
        loader.style.display = 'block';
    } else {
        loader.style.display = 'none';
    }
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Show success message
function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 3000);
}

// Make deleteBlockage available globally
window.deleteBlockage = deleteBlockage;
