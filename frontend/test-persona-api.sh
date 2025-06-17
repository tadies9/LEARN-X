#!/bin/bash

# Test persona API endpoint
echo "Testing persona API endpoint..."

# Get a valid auth token (you'll need to replace this with your actual token)
# You can get this from the browser's localStorage or from the network tab
AUTH_TOKEN="YOUR_AUTH_TOKEN_HERE"

# Test data
DATA='{
  "academicCareer": {
    "currentStatus": "Finance Major",
    "aspiredIndustry": "Education",
    "fieldOfStudy": "",
    "careerGoalsLearningObjectives": ""
  },
  "interests": {
    "primary": ["Basketball"],
    "secondary": [],
    "learningTopics": ["Machine Learning"]
  },
  "learningStyle": {
    "primary": "visual",
    "secondary": "reading",
    "preferenceStrength": 0.8
  },
  "contentPreferences": {
    "density": "balanced",
    "examplesPerConcept": 2,
    "summaryStyle": "bullet_points",
    "detailTolerance": "medium",
    "repetitionPreference": "moderate"
  },
  "communication": {
    "style": "professional_friendly",
    "encouragementLevel": "moderate",
    "humorAppropriate": false
  }
}'

# Make the request
curl -X POST http://localhost:8080/api/v1/persona \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "$DATA" \
  -v

echo ""
echo "Done!"