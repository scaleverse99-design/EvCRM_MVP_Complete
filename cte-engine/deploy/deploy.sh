#!/bin/bash

# CTE deployment script
# Builds Docker images and deploys them to Google Cloud Run

set -e

# Load environment variables
if [ -f .env ]; then
  export $(echo $(cat .env | sed 's/#.*//g' | xargs) | envsubst)
fi

PROJECT_ID=${GCP_PROJECT_ID:-"cte-engine"}
REGION=${GOOGLE_CLOUD_REGION:-"us-central1"}
REGISTRY="gcr.io"

echo "🚀 Starting CTE Cloud Run Deployment..."
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"

# 1. Authenticate Docker with GCR
echo "🔑 Configuring Docker authorization with Google Cloud..."
gcloud auth configure-docker --quiet

# 2. Build and push API Server
echo "🏗️ Building CTE API image..."
docker build -f docker/Dockerfile.api -t ${REGISTRY}/${PROJECT_ID}/cte-api:latest .

echo "📤 Pushing API image to registry..."
docker push ${REGISTRY}/${PROJECT_ID}/cte-api:latest

# 3. Build and push Crawler Scraper
echo "🏗️ Building CTE Crawler image..."
docker build -f docker/Dockerfile.crawler -t ${REGISTRY}/${PROJECT_ID}/cte-crawler:latest .

echo "📤 Pushing Crawler image to registry..."
docker push ${REGISTRY}/${PROJECT_ID}/cte-crawler:latest

# 4. Deploy API Server to Cloud Run
echo "🚀 Deploying API Server to Cloud Run..."
gcloud run deploy cte-api-evcrm \
  --image ${REGISTRY}/${PROJECT_ID}/cte-api:latest \
  --platform managed \
  --region $REGION \
  --memory 1Gi \
  --port 3000 \
  --allow-unauthenticated \
  --set-env-vars SUPABASE_URL=${SUPABASE_URL},SUPABASE_KEY=${SUPABASE_KEY},DOMAIN=cte.evcrm.in \
  --project $PROJECT_ID

# 5. Deploy Scraper to Cloud Run (for scheduled crawls)
echo "🚀 Deploying Crawler to Cloud Run..."
gcloud run deploy cte-crawler-evcrm \
  --image ${REGISTRY}/${PROJECT_ID}/cte-crawler:latest \
  --platform managed \
  --region $REGION \
  --memory 2Gi \
  --timeout 3600 \
  --set-env-vars SUPABASE_URL=${SUPABASE_URL},SUPABASE_KEY=${SUPABASE_KEY} \
  --project $PROJECT_ID

echo "✅ Cloud Run deployment complete!"
echo "🌐 Set up a CNAME for cte.evcrm.in pointing to your custom domain mapping in the GCP Cloud Run panel."
