# Deployment Instructions for Google Cloud Platform (Cloud Run)

## Prerequisites
- Google Cloud SDK (`gcloud`) installed and configured.
- A GCP Project created.
- Billing enabled for the project.

## 1. Authenticate with GCP
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

## 2. Enable Required Services
```bash
gcloud services enable cloudbuild.googleapis.com run.googleapis.com
```

## 3. Build and Push the Docker Image
Replace `YOUR_PROJECT_ID` with your actual project ID.
```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/bank-backend
```

## 4. Deploy to Cloud Run
Replace `YOUR_PROJECT_ID` and `YOUR_DB_URL` with your actual values.
You need to pass the `DATABASE_URL` and other environment variables defined in your `.env` file.

```bash
gcloud run deploy bank-backend \
  --image gcr.io/YOUR_PROJECT_ID/bank-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL="YOUR_DATABASE_CONNECTION_STRING" \
  --set-env-vars JWT_SECRET="YOUR_JWT_SECRET" \
  --set-env-vars DIRECT_URL="YOUR_DIRECT_URL"
```

## Database Migrations
The Dockerfile does **not** run database migrations automatically. You should run them from your local machine or a separate job before deploying.

To run migrations locally (connecting to the production DB):
```bash
# Update .env with production DB URL temporarily or pass it directly
DATABASE_URL="YOUR_PROD_DB_URL" npx prisma migrate deploy
```
