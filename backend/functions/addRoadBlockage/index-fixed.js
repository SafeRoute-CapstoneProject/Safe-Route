const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require('crypto'); // Built-in to Node.js 18.x

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.DYNAMODB_TABLE_NAME;

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    try {
        const body = JSON.parse(event.body);
        
        // Validate required fields
        if (!body.latitude || !body.longitude) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ 
                    error: 'Missing required fields: latitude and longitude are required' 
                }),
            };
        }
        
        // Create blockage item
        const blockageId = randomUUID();
        const timestamp = new Date().toISOString();
        
        const blockage = {
            blockageId,
            latitude: parseFloat(body.latitude),
            longitude: parseFloat(body.longitude),
            radius: body.radius || 100, // Default 100 meters
            description: body.description || 'Road blockage reported',
            severity: body.severity || 'medium', // low, medium, high
            isActive: true,
            timestamp,
            reportedBy: body.reportedBy || 'web-ui',
            expiresAt: body.expiresAt || null, // Optional expiration time
        };
        
        // Save to DynamoDB
        const command = new PutCommand({
            TableName: tableName,
            Item: blockage,
        });
        
        await docClient.send(command);
        
        return {
            statusCode: 201,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                message: 'Road blockage added successfully',
                blockage,
            }),
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ 
                error: 'Failed to add road blockage',
                details: error.message 
            }),
        };
    }
};

