#!/bin/bash
# Test upload endpoints

echo "Testing POST /api/v1/upload/request..."
RESPONSE=$(curl -X POST http://localhost:3001/api/v1/upload/request \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test.ifc",
    "fileSize": 1024000,
    "contentType": "application/x-step"
  }')

echo "Response: $RESPONSE"

# Extract fileId and s3Key from response
FILE_ID=$(echo $RESPONSE | grep -o '"fileId":"[^"]*"' | cut -d'"' -f4)
S3_KEY=$(echo $RESPONSE | grep -o '"s3Key":"[^"]*"' | cut -d'"' -f4)

echo ""
echo "Extracted fileId: $FILE_ID"
echo "Extracted s3Key: $S3_KEY"

# Note: In a real scenario, you would upload the file to S3 using the presigned URL here
# For testing purposes, we skip this step

# Test complete endpoint (will fail because file is not actually uploaded to S3)
echo ""
echo "Testing POST /api/v1/upload/complete..."
curl -X POST http://localhost:3001/api/v1/upload/complete \
  -H "Content-Type: application/json" \
  -d "{
    \"fileId\": \"$FILE_ID\",
    \"s3Key\": \"$S3_KEY\"
  }"

echo ""
echo "Done!"
