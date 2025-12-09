# Backend - AWS Lambda Functions

Serverless backend for the Road Routing Application using AWS SAM.

## Architecture

```
API Gateway
    │
    ├─ POST /blockages ──────▶ AddRoadBlockageFunction
    │                              │
    ├─ GET /blockages ───────▶ GetRoadBlockagesFunction
    │                              │
    ├─ DELETE /blockages/{id} ─▶ DeleteRoadBlockageFunction
    │                              │
    └─ POST /calculate-route ─▶ CalculateRouteFunction
                                   │
                                   └──▶ AWS Location Services
                                   
    All functions interact with ──▶ DynamoDB (RoadBlockages table)
```

## Lambda Functions

### 1. AddRoadBlockageFunction
**Purpose**: Add a new road blockage to DynamoDB

**Input**:
```json
{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "radius": 100,
  "description": "Road construction",
  "severity": "high",
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

**Output**:
```json
{
  "message": "Road blockage added successfully",
  "blockage": { ...blockage data... }
}
```

### 2. GetRoadBlockagesFunction
**Purpose**: Retrieve all active road blockages

**Query Parameters**:
- `activeOnly` (boolean, default: true) - Filter for active blockages only

**Output**:
```json
{
  "count": 5,
  "blockages": [...]
}
```

### 3. DeleteRoadBlockageFunction
**Purpose**: Delete a road blockage

**Path Parameters**:
- `blockageId` (string) - ID of the blockage to delete

**Output**:
```json
{
  "message": "Road blockage deleted successfully",
  "blockageId": "..."
}
```

### 4. CalculateRouteFunction
**Purpose**: Calculate route with blockage avoidance

**Input**:
```json
{
  "origin": [longitude, latitude],
  "destination": [longitude, latitude],
  "travelMode": "Car",
  "avoidBlockages": true,
  "calculateAlternate": true
}
```

**Output**:
```json
{
  "route": {
    "summary": { "Distance": 5000, "DurationSeconds": 600 },
    "legs": [...]
  },
  "blockages": {
    "total": 3,
    "intersected": [...]
  },
  "warnings": [],
  "alternateRoute": null
}
```

## DynamoDB Schema

**Table**: `RoadBlockages`

**Partition Key**: `blockageId` (String)

**Attributes**:
- `blockageId` (String) - UUID
- `latitude` (Number) - Latitude coordinate
- `longitude` (Number) - Longitude coordinate
- `radius` (Number) - Affected radius in meters
- `description` (String) - Description of blockage
- `severity` (String) - "low" | "medium" | "high"
- `isActive` (Boolean) - Active status
- `timestamp` (String) - ISO timestamp
- `reportedBy` (String) - Source of report
- `expiresAt` (String, optional) - ISO timestamp

## Deployment

### First Time Setup

```bash
# Install dependencies
npm install

# Build
sam build

# Deploy with guided setup
sam deploy --guided
```

### Subsequent Deployments

```bash
sam build && sam deploy
```

### Local Testing

```bash
# Start local API
sam local start-api

# Invoke specific function
sam local invoke AddRoadBlockageFunction -e events/add-blockage.json

# View logs
sam logs -n AddRoadBlockageFunction --stack-name routing-app-stack --tail
```

## Environment Variables

Configured in `template.yaml`:

- `DYNAMODB_TABLE_NAME` - Name of DynamoDB table
- `ROUTE_CALCULATOR_NAME` - AWS Location Services route calculator name
- `AWS_REGION` - AWS region (auto-configured)

## IAM Permissions

Each function has minimal required permissions:

- **AddRoadBlockage**: DynamoDB PutItem
- **GetRoadBlockages**: DynamoDB Scan
- **DeleteRoadBlockage**: DynamoDB DeleteItem
- **CalculateRoute**: DynamoDB Scan + Location Services CalculateRoute

## Testing

### Unit Tests

```bash
cd functions/addRoadBlockage
npm test
```

### Integration Tests

```bash
# Test API endpoint
curl -X POST https://YOUR_API_URL/Prod/blockages \
  -H "Content-Type: application/json" \
  -d '{"latitude":37.7749,"longitude":-122.4194,"radius":100}'
```

## Monitoring

### CloudWatch Logs

```bash
# View logs
sam logs -n FUNCTION_NAME --stack-name routing-app-stack --tail

# View specific time range
sam logs -n FUNCTION_NAME --stack-name routing-app-stack \
  --start-time '10min ago' --end-time '5min ago'
```

### Metrics

Key metrics to monitor:
- Invocations
- Duration
- Errors
- Throttles

Access via CloudWatch Console or:

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=routing-app-stack-AddRoadBlockageFunction \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

## Cost Optimization

1. **Use DynamoDB on-demand pricing** for unpredictable traffic
2. **Set appropriate Lambda timeouts** (current: 30s)
3. **Enable X-Ray only when debugging** (currently disabled)
4. **Use Lambda provisioned concurrency** only if needed
5. **Implement caching** for frequently accessed blockages

## Cleanup

```bash
# Delete the entire stack
aws cloudformation delete-stack --stack-name routing-app-stack

# Delete DynamoDB table (if needed)
aws dynamodb delete-table --table-name RoadBlockages
```

## Troubleshooting

### Common Issues

**"Access Denied" errors**
- Check IAM role permissions in template.yaml
- Verify Lambda execution role has required policies

**"Table doesn't exist"**
- Ensure DynamoDB table was created during deployment
- Check table name matches DYNAMODB_TABLE_NAME

**Location Services errors**
- Add Location Services permissions to CalculateRouteFunction role
- Verify route calculator name matches

**CORS errors**
- CORS is configured in template.yaml API definition
- Ensure headers are properly returned from Lambda

## Development

### Adding a New Function

1. Create directory in `functions/`
2. Add `index.js` and `package.json`
3. Add function definition in `template.yaml`
4. Define API Gateway event if needed
5. Run `sam build && sam deploy`

### Modifying Existing Functions

1. Edit function code in `functions/*/index.js`
2. Test locally with `sam local invoke`
3. Deploy with `sam build && sam deploy`

## Security Best Practices

- ✅ Lambda functions use least-privilege IAM roles
- ✅ API Gateway has CORS configured
- ✅ DynamoDB streams enabled for audit trail
- ⚠️ Add API key authentication for production
- ⚠️ Implement request throttling
- ⚠️ Add input validation and sanitization
- ⚠️ Enable AWS WAF for API Gateway

