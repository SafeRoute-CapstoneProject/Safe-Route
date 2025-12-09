# 🚀 Deployment Guide

This guide will help you deploy the updated backend with new API keys.

## ✅ What's Been Updated

1. **API Keys Updated:**
   - HERE Maps: `o_A9nq4o_w9Xkempjm2jmPH3kO5lI1YywvSvFo6omXo`
   - Google Maps: `AIzaSyC5QKVqarebJ12MQm6iw5sypU1lP-G1TRE`

2. **Files Updated:**
   - ✅ All frontend files (here-routing-app.html, web-ui/index.html)
   - ✅ All backend Lambda functions
   - ✅ template.yaml (added SearchPlacesFunction and environment variables)
   - ✅ All documentation files

3. **Improvements:**
   - ✅ Better error handling in calculateRoute function
   - ✅ SearchPlacesFunction added to template.yaml
   - ✅ Environment variables configured in template.yaml

## 📋 Prerequisites

1. **AWS CLI configured** with appropriate credentials
2. **SAM CLI installed** (`sam --version` to check)
3. **Node.js 18.x** (for local testing)

## 🔧 Deployment Steps

### Step 1: Navigate to Backend Directory

```bash
cd backend
```

### Step 2: Build the Application

```bash
sam build
```

This will:
- Install dependencies for all Lambda functions
- Package the code for deployment
- Validate the template.yaml

### Step 3: Deploy to AWS

```bash
sam deploy
```

Or if you have a samconfig.toml:

```bash
sam deploy --guided
```

This will:
- Create/update CloudFormation stack
- Deploy all Lambda functions
- Update API Gateway endpoints
- Set environment variables

### Step 4: Verify Deployment

After deployment, test the endpoints:

```bash
# Test Calculate Route
curl -X POST "https://up94634q80.execute-api.us-east-1.amazonaws.com/Prod/calculate-route" \
  -H "Content-Type: application/json" \
  -d '{"origin":[-71.0589,42.3601],"destination":[-71.0094,42.3656],"avoidBlockages":true}'

# Test Search Places
curl -X POST "https://up94634q80.execute-api.us-east-1.amazonaws.com/Prod/search-places" \
  -H "Content-Type: application/json" \
  -d '{"text":"Boston"}'

# Test Get Blockages
curl -X GET "https://up94634q80.execute-api.us-east-1.amazonaws.com/Prod/blockages"
```

## 🧪 Testing Frontend Locally

### Option 1: Simple HTTP Server

**Terminal 1 - Routing App:**
```bash
cd /Users/dineshponnada/Desktop/DINESH-2
python3 -m http.server 8081
```

**Terminal 2 - Blockage Manager:**
```bash
cd /Users/dineshponnada/Desktop/DINESH-2/web-ui
python3 -m http.server 8080
```

### Option 2: Open Directly

You can also open the HTML files directly in your browser:
- `here-routing-app.html` - Double-click to open
- `web-ui/index.html` - Double-click to open

## 🔍 Troubleshooting

### Issue: Calculate Route returns error

**Solution:** The Lambda function needs to be redeployed with the new API key. Run `sam deploy` again.

### Issue: Search Places returns "Missing Authentication Token"

**Solution:** The SearchPlacesFunction wasn't deployed. Make sure you've run `sam deploy` after updating template.yaml.

### Issue: API keys not working

**Check:**
1. Verify API keys are correct in the files
2. Check if API keys have proper permissions enabled
3. Verify API keys aren't expired or rate-limited

### Issue: CORS errors in browser

**Solution:** CORS is already configured in template.yaml. If issues persist, check API Gateway CORS settings in AWS Console.

## 📊 What Gets Deployed

- **5 Lambda Functions:**
  1. CalculateRouteFunction (with HERE_API_KEY env var)
  2. AddRoadBlockageFunction
  3. GetRoadBlockagesFunction
  4. DeleteRoadBlockageFunction
  5. SearchPlacesFunction (with GOOGLE_API_KEY env var) - **NEW**

- **API Gateway:**
  - REST API with CORS enabled
  - 5 endpoints configured

- **DynamoDB:**
  - RoadBlockages table (if not exists)

## ✅ Post-Deployment Checklist

- [ ] All Lambda functions deployed successfully
- [ ] API Gateway endpoints responding
- [ ] Environment variables set correctly
- [ ] Test Calculate Route endpoint
- [ ] Test Search Places endpoint
- [ ] Test Get Blockages endpoint
- [ ] Frontend can connect to API
- [ ] Maps load correctly in browser

## 🎉 Success!

Once deployed, your application should be fully functional with:
- ✅ Working HERE Maps routing
- ✅ Working Google Places search
- ✅ Road blockage management
- ✅ Real-time route calculation with blockage avoidance

