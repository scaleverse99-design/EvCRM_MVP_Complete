# deploy.ps1
# Load environment variables from .env
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $parts = $line -split '=', 2
            if ($parts.Length -eq 2) {
                $key = $parts[0].Trim()
                $value = $parts[1].Trim()
                [System.Environment]::SetEnvironmentVariable($key, $value)
                Set-Content "env:$key" $value
            }
        }
    }
}

$PROJECT_ID = $env:GCP_PROJECT_ID
if (-not $PROJECT_ID) { $PROJECT_ID = "cte-engine" }
$REGION = $env:GOOGLE_CLOUD_REGION
if (-not $REGION) { $REGION = "us-central1" }
$REGISTRY = "gcr.io"

Write-Host "[Deploy] Starting CTE Cloud Run Deployment..."
Write-Host "[Deploy] Project ID: $PROJECT_ID"
Write-Host "[Deploy] Region: $REGION"

# 1. Authenticate Docker with GCR
Write-Host "[Deploy] Configuring Docker authorization with Google Cloud..."
gcloud auth configure-docker --quiet

# 2. Build and push API Server
Write-Host "[Deploy] Building CTE API image..."
docker build -f docker/Dockerfile.api -t "$REGISTRY/$PROJECT_ID/cte-api:latest" .

Write-Host "[Deploy] Pushing API image to registry..."
docker push "$REGISTRY/$PROJECT_ID/cte-api:latest"

# 3. Build and push Crawler Scraper
Write-Host "[Deploy] Building CTE Crawler image..."
docker build -f docker/Dockerfile.crawler -t "$REGISTRY/$PROJECT_ID/cte-crawler:latest" .

Write-Host "[Deploy] Pushing Crawler image to registry..."
docker push "$REGISTRY/$PROJECT_ID/cte-crawler:latest"

# 4. Deploy API Server to Cloud Run
Write-Host "[Deploy] Deploying API Server to Cloud Run..."
gcloud run deploy cte-api-evcrm `
  --image "$REGISTRY/$PROJECT_ID/cte-api:latest" `
  --platform managed `
  --region $REGION `
  --memory 1Gi `
  --port 3000 `
  --allow-unauthenticated `
  --set-env-vars "SUPABASE_URL=$($env:SUPABASE_URL),SUPABASE_KEY=$($env:SUPABASE_KEY),DOMAIN=cte.evcrm.in" `
  --project $PROJECT_ID

# 5. Deploy Scraper to Cloud Run (for scheduled crawls)
Write-Host "[Deploy] Deploying Crawler to Cloud Run..."
gcloud run deploy cte-crawler-evcrm `
  --image "$REGISTRY/$PROJECT_ID/cte-crawler:latest" `
  --platform managed `
  --region $REGION `
  --memory 2Gi `
  --timeout 3600 `
  --allow-unauthenticated `
  --set-env-vars "SUPABASE_URL=$($env:SUPABASE_URL),SUPABASE_KEY=$($env:SUPABASE_KEY)" `
  --project $PROJECT_ID

Write-Host "[Deploy] Cloud Run deployment complete!"
Write-Host "[Deploy] Set up a CNAME for cte.evcrm.in pointing to your custom domain mapping in the GCP Cloud Run panel."
