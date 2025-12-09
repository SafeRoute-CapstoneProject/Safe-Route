const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.DYNAMODB_TABLE_NAME;

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    try {
        // Get query parameters for filtering
        const queryParams = event.queryStringParameters || {};
        const activeOnly = queryParams.activeOnly !== 'false'; // Default to true
        
        // Scan DynamoDB table
        const params = {
            TableName: tableName,
        };
        
        // Add filter for active blockages only
        if (activeOnly) {
            params.FilterExpression = 'isActive = :active';
            params.ExpressionAttributeValues = {
                ':active': true,
            };
        }
        
        const command = new ScanCommand(params);
        const result = await docClient.send(command);
        
        // Filter out expired blockages
        const now = new Date().toISOString();
        const blockages = result.Items.filter(item => {
            if (!item.expiresAt) return true;
            return item.expiresAt > now;
        });
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                count: blockages.length,
                blockages,
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
                error: 'Failed to retrieve road blockages',
                details: error.message 
            }),
        };
    }
};

