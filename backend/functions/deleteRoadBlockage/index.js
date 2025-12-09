const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, DeleteCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.DYNAMODB_TABLE_NAME;

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    try {
        const blockageId = event.pathParameters?.blockageId;
        
        if (!blockageId) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ 
                    error: 'Missing blockageId in path parameters' 
                }),
            };
        }
        
        // Option 1: Soft delete (mark as inactive)
        // Uncomment this to use soft delete instead of hard delete
        /*
        const command = new UpdateCommand({
            TableName: tableName,
            Key: { blockageId },
            UpdateExpression: 'SET isActive = :inactive',
            ExpressionAttributeValues: {
                ':inactive': false,
            },
        });
        */
        
        // Option 2: Hard delete (remove from table)
        const command = new DeleteCommand({
            TableName: tableName,
            Key: { blockageId },
        });
        
        await docClient.send(command);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                message: 'Road blockage deleted successfully',
                blockageId,
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
                error: 'Failed to delete road blockage',
                details: error.message 
            }),
        };
    }
};

