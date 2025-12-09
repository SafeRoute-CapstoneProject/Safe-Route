# Web UI - Road Blockage Reporter

Simple web interface for reporting road blockages in real-time.

## Features

- 🗺️ Interactive map using Leaflet.js
- 📍 Click-to-place blockage markers
- 📝 Detailed blockage information form
- 🎨 Modern, responsive design
- 📊 Live view of all active blockages
- ⏱️ Automatic expiration support

## Setup

1. **Update API Endpoint**

Open `app.js` and update line 2:

```javascript
const API_ENDPOINT = 'https://YOUR_API_GATEWAY_URL/Prod';
```

Replace `YOUR_API_GATEWAY_URL` with your actual API Gateway endpoint from the SAM deployment.

2. **Run Locally**

```bash
# Option 1: Using Python
python -m http.server 8080

# Option 2: Using Node.js
npx http-server -p 8080

# Option 3: Just open index.html in your browser
```

3. **Deploy to AWS S3**

```bash
# Create bucket
aws s3 mb s3://your-bucket-name

# Sync files
aws s3 sync . s3://your-bucket-name --acl public-read

# Enable static website hosting
aws s3 website s3://your-bucket-name --index-document index.html
```

## Usage

1. **Select Location**: Click anywhere on the map to set the blockage location
2. **Fill Details**: 
   - Radius: Affected area in meters
   - Description: What's causing the blockage
   - Severity: Low, Medium, or High
   - Duration: How long the blockage will last
3. **Report**: Click "Report Blockage" button
4. **View**: See all active blockages in the list below

## Files

- `index.html` - Main HTML structure
- `app.js` - JavaScript logic and API integration
- `styles.css` - Styling and responsive design

## Dependencies

- **Leaflet.js** - For interactive maps (loaded via CDN)
- No build process required!

## Customization

### Change Map Style

In `app.js`, update the tile layer URL:

```javascript
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);
```

### Change Default Location

In `app.js`, update the initial map view:

```javascript
map = L.map('map').setView([YOUR_LAT, YOUR_LON], ZOOM_LEVEL);
```

### Modify Severity Colors

In `styles.css`, update the severity badge colors:

```css
.severity-badge.high { background: #dc3545; }
.severity-badge.medium { background: #ffc107; }
.severity-badge.low { background: #28a745; }
```

## Browser Compatibility

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

## Security Notes

For production deployment:
- Implement API authentication
- Add rate limiting
- Use HTTPS
- Validate all inputs server-side
- Consider adding user authentication

## Troubleshooting

**Map not loading?**
- Check internet connection (Leaflet loads from CDN)
- Check browser console for errors

**Can't report blockages?**
- Verify API_ENDPOINT is correct
- Check browser console for CORS errors
- Ensure Lambda functions are deployed

**Blockages not appearing?**
- Check API endpoint configuration
- Verify DynamoDB table has data
- Check browser console for API errors

