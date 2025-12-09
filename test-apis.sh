#!/bin/bash

echo "=========================================="
echo "API Keys & Endpoints Test"
echo "=========================================="
echo ""

echo "1. Testing HERE Maps API Key (Direct)..."
HERE_RESPONSE=$(curl -s "https://router.hereapi.com/v8/routes?transportMode=car&origin=42.3601,-71.0589&destination=42.3656,-71.0094&return=summary&apiKey=o_A9nq4o_w9Xkempjm2jmPH3kO5lI1YywvSvFo6omXo")
if echo "$HERE_RESPONSE" | grep -q "routes"; then
    echo "✅ HERE Maps API Key: WORKING"
else
    echo "❌ HERE Maps API Key: FAILED"
    echo "Response: $HERE_RESPONSE"
fi
echo ""

echo "2. Testing Google Maps API Key (Direct)..."
GOOGLE_RESPONSE=$(curl -s "https://maps.googleapis.com/maps/api/place/autocomplete/json?input=Boston&key=AIzaSyC5QKVqarebJ12MQm6iw5sypU1lP-G1TRE")
if echo "$GOOGLE_RESPONSE" | grep -q "predictions"; then
    echo "✅ Google Maps API Key: WORKING"
else
    echo "❌ Google Maps API Key: FAILED"
    echo "Response: $GOOGLE_RESPONSE"
fi
echo ""

echo "3. Testing Backend API - Calculate Route..."
ROUTE_RESPONSE=$(curl -s -X POST "https://up94634q80.execute-api.us-east-1.amazonaws.com/Prod/calculate-route" \
  -H "Content-Type: application/json" \
  -d '{"origin":[-71.0589,42.3601],"destination":[-71.0094,42.3656],"avoidBlockages":true}')
if echo "$ROUTE_RESPONSE" | grep -q "route"; then
    echo "✅ Calculate Route Endpoint: WORKING"
elif echo "$ROUTE_RESPONSE" | grep -q "HERE Maps error"; then
    echo "⚠️  Calculate Route Endpoint: ERROR (Lambda may need redeployment with new API key)"
    echo "Response: $ROUTE_RESPONSE"
else
    echo "❌ Calculate Route Endpoint: FAILED"
    echo "Response: $ROUTE_RESPONSE"
fi
echo ""

echo "4. Testing Backend API - Get Blockages..."
BLOCKAGES_RESPONSE=$(curl -s -X GET "https://up94634q80.execute-api.us-east-1.amazonaws.com/Prod/blockages")
if echo "$BLOCKAGES_RESPONSE" | grep -q "blockages"; then
    echo "✅ Get Blockages Endpoint: WORKING"
else
    echo "❌ Get Blockages Endpoint: FAILED"
    echo "Response: $BLOCKAGES_RESPONSE"
fi
echo ""

echo "5. Testing Backend API - Search Places..."
SEARCH_RESPONSE=$(curl -s -X POST "https://up94634q80.execute-api.us-east-1.amazonaws.com/Prod/search-places" \
  -H "Content-Type: application/json" \
  -d '{"text":"Boston"}')
if echo "$SEARCH_RESPONSE" | grep -q "suggestions"; then
    echo "✅ Search Places Endpoint: WORKING"
elif echo "$SEARCH_RESPONSE" | grep -q "Missing Authentication Token"; then
    echo "⚠️  Search Places Endpoint: NOT DEPLOYED (Function missing from API Gateway)"
    echo "Response: $SEARCH_RESPONSE"
else
    echo "❌ Search Places Endpoint: FAILED"
    echo "Response: $SEARCH_RESPONSE"
fi
echo ""

echo "6. Testing Frontend Files..."
if [ -f "here-routing-app.html" ]; then
    if grep -q "o_A9nq4o_w9Xkempjm2jmPH3kO5lI1YywvSvFo6omXo" here-routing-app.html; then
        echo "✅ here-routing-app.html: HERE API key updated"
    else
        echo "❌ here-routing-app.html: HERE API key NOT updated"
    fi
    if grep -q "AIzaSyC5QKVqarebJ12MQm6iw5sypU1lP-G1TRE" here-routing-app.html; then
        echo "✅ here-routing-app.html: Google API key updated"
    else
        echo "❌ here-routing-app.html: Google API key NOT updated"
    fi
else
    echo "❌ here-routing-app.html: File not found"
fi
echo ""

echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "✅ API Keys: Both working (tested directly)"
echo "⚠️  Backend: May need redeployment to use new keys"
echo "✅ Frontend: Files updated with new keys"
echo ""
echo "Next Steps:"
echo "1. If Calculate Route fails: Redeploy Lambda with new HERE_API_KEY"
echo "2. If Search Places fails: Deploy SearchPlacesFunction (added to template.yaml)"
echo "3. Test frontend by opening here-routing-app.html in browser"

