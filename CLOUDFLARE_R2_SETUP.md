# Cloudflare R2 Storage Setup Guide

> This guide walks you through configuring Cloudflare R2 as the storage backend for Lumen Listings.
> All media (photos, videos, documents) are stored in R2 and accessed through Supabase Edge Functions.

---

## Overview

**Why Cloudflare R2?**
- Zero egress fees (unlimited bandwidth for serving media)
- S3-compatible API (easy integration)
- Global CDN built-in via Cloudflare network
- 10GB free storage + unlimited downloads on free tier
- Custom domain support for media URLs

**Architecture:**
```
Browser → Supabase Edge Function → Cloudflare R2
                                       ↓
                              Public CDN URL (thumbnails/web)
                              Signed URL (originals/private)
```

The frontend NEVER has direct access to R2 credentials. All operations flow through Edge Functions.

---

## Step 1: Create a Cloudflare Account

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Click "Sign Up" and create a free account
3. Verify your email address
4. Log in to the Cloudflare dashboard

---

## Step 2: Enable R2 Storage

1. In the Cloudflare dashboard left sidebar, click **"R2 Object Storage"**
2. Click **"Get Started"** or **"Activate R2"**
3. You will need to add a payment method (credit/debit card)
   - R2 has a generous free tier: 10GB storage, 10 million Class A operations/month, 1 million Class B operations/month
   - You will NOT be charged unless you exceed the free tier
4. Once activated, note your **Account ID** (visible in the URL: `dash.cloudflare.com/<ACCOUNT_ID>/r2`)

---

## Step 3: Create an R2 Bucket

1. In the R2 section, click **"Create bucket"**
2. Set the bucket name: `lumen-listings-media`
   - This name must be globally unique
   - Use lowercase letters, numbers, and hyphens only
3. Choose a location hint (optional):
   - "Automatic" is fine for most cases
   - Or choose the region closest to your primary users
4. Click **"Create bucket"**

---

## Step 4: Create R2 API Credentials

1. In the R2 section, click **"Manage R2 API Tokens"** (top-right area)
2. Click **"Create API Token"**
3. Configure the token:
   - **Token name:** `lumen-listings-edge-functions`
   - **Permissions:** Object Read & Write
   - **Specify bucket(s):** Select `lumen-listings-media` (or "Apply to all buckets" if you prefer)
   - **TTL (optional):** Leave blank for no expiry
4. Click **"Create API Token"**
5. **IMPORTANT: Copy both values immediately!**
   - **Access Key ID** — looks like: `a1b2c3d4e5f6...`
   - **Secret Access Key** — looks like: `AbCdEfGh1234...`
   - The Secret Access Key is shown ONLY ONCE. If you lose it, you must create a new token.

---

## Step 5: Configure CORS Policy

This is required if you plan to upload directly from the browser to R2 using presigned URLs.

1. Go to your bucket (`lumen-listings-media`)
2. Click **"Settings"** tab
3. Scroll to **"CORS Policy"**
4. Click **"Add CORS policy"** and enter:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:5173",
      "https://your-production-domain.com"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

Replace `https://your-production-domain.com` with your actual app domain.

---

## Step 6: Set Up Public Access (Optional but Recommended)

Public access allows optimized/thumbnail images to be served directly via CDN without signed URLs.

### Option A: R2.dev subdomain (Quick setup)

1. In bucket settings, find **"R2.dev subdomain"**
2. Click **"Allow Access"**
3. Your public URL will be: `https://<bucket>.r2.dev/<object-key>`
4. Note: This has some limitations and is meant for development

### Option B: Custom Domain (Recommended for production)

1. In bucket settings, click **"Connect Domain"** under "Custom Domains"
2. Enter a subdomain: `media.yourdomain.com`
   - Your domain must already be managed by Cloudflare DNS
3. Cloudflare will auto-configure:
   - DNS CNAME record
   - SSL certificate
   - CDN caching
4. Your public media URL will be: `https://media.yourdomain.com/<object-key>`

---

## Step 7: Add Secrets to Supabase Edge Functions

These credentials must be stored as Edge Function secrets in Supabase. They are NEVER placed in frontend code.

### Required Secrets

| Secret Name | Value | Example |
|-------------|-------|---------|
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | `a1b2c3d4e5f6g7h8i9j0` |
| `R2_ACCESS_KEY_ID` | From Step 4 | `abc123def456` |
| `R2_SECRET_ACCESS_KEY` | From Step 4 | `SecretKey123456789` |
| `R2_BUCKET_NAME` | Bucket name from Step 3 | `lumen-listings-media` |
| `R2_ENDPOINT` | S3-compatible endpoint | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `R2_PUBLIC_BASE_URL` | Public CDN URL from Step 6 | `https://media.yourdomain.com` |

### How to Set Secrets

**Via Supabase Dashboard:**
1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **Edge Functions**
3. Click **"Manage Secrets"**
4. Add each secret name and value listed above

### Endpoint URL Format

The R2 S3-compatible endpoint is always:
```
https://<YOUR_ACCOUNT_ID>.r2.cloudflarestorage.com
```

Replace `<YOUR_ACCOUNT_ID>` with the account ID from Step 2.

---

## Step 8: Verify the Setup

### Test from Edge Function

Once secrets are configured, the `storage-upload` Edge Function should work:

```bash
curl -X POST \
  https://YOUR_SUPABASE_URL/functions/v1/storage-upload \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"listingId": "test-123", "filename": "test.jpg", "mimeType": "image/jpeg"}'
```

Expected response (success):
```json
{
  "key": "listings/test-123/1234567890-test.jpg",
  "uploadUrl": "https://<account>.r2.cloudflarestorage.com/lumen-listings-media/listings/test-123/1234567890-test.jpg",
  "publicUrl": "https://media.yourdomain.com/listings/test-123/1234567890-test.jpg",
  "bucket": "lumen-listings-media"
}
```

Expected response (not configured):
```json
{
  "error": "Storage not configured",
  "message": "Cloudflare R2 credentials are not set...",
  "setupGuide": "/setup/r2"
}
```

---

## Step 9: Object Key Structure

Media files are organized in R2 with this key pattern:

```
listings/{listing_id}/{timestamp}-{sanitized_filename}
```

Example:
```
listings/abc-123-def/1717000000000-living_room_01.jpg
listings/abc-123-def/1717000000001-kitchen_wide.jpg
listings/abc-123-def/1717000000002-walkthrough_4k.mp4
listings/abc-123-def/1717000000003-floorplan.pdf
```

Thumbnails and variants (when generated):
```
listings/{listing_id}/thumbnails/{timestamp}-{filename}_320w.webp
listings/{listing_id}/variants/{timestamp}-{filename}_1024w.webp
listings/{listing_id}/posters/{timestamp}-{filename}_poster.jpg
```

---

## Security Rules

| Rule | Explanation |
|------|-------------|
| Never expose `R2_SECRET_ACCESS_KEY` in frontend code | All R2 operations go through Edge Functions |
| Never expose `R2_ACCESS_KEY_ID` in frontend bundles | Same as above |
| Never expose `CLOUDFLARE_ACCOUNT_ID` client-side | Same as above |
| Original files use signed URLs with expiry | High-res downloads require authenticated access |
| Thumbnails/web versions can use public CDN URLs | Optimized images are safe to serve publicly |
| Edge Functions validate user authentication | JWT verified before generating signed URLs |
| Download URLs expire after a set time (e.g., 1 hour) | Prevents permanent URL sharing |

---

## Cost Estimate

| Usage Level | Storage | Operations | Egress | Monthly Cost |
|-------------|---------|-----------|--------|--------------|
| Free tier | 10 GB | 10M writes, 1M reads | Unlimited | $0 |
| 50 listings (~80GB) | 80 GB | ~50K/month | Unlimited | ~$1.05/month |
| 200 listings (~300GB) | 300 GB | ~200K/month | Unlimited | ~$4.35/month |

Storage: $0.015/GB/month beyond free tier.
Class A operations (writes): $4.50/million beyond free tier.
Class B operations (reads): $0.36/million beyond free tier.
Egress: Always $0.

---

## Troubleshooting

### "Storage not configured" error
- Verify all 6 secrets are set in Supabase Edge Function secrets
- Check that `R2_ENDPOINT` includes `https://` prefix
- Ensure `CLOUDFLARE_ACCOUNT_ID` matches your actual account ID

### CORS errors when uploading
- Verify CORS policy is set on the bucket (Step 5)
- Ensure your app's origin is listed in `AllowedOrigins`
- Check that `AllowedMethods` includes `PUT`

### 403 Forbidden on upload
- Verify the API token has "Object Read & Write" permission
- Verify the token is scoped to the correct bucket
- Check that the token hasn't expired (if TTL was set)

### Public URL returns 404
- Verify public access is enabled (Step 6)
- Check that the object key in the URL matches exactly (case-sensitive)
- Verify the file was actually uploaded successfully

### Objects not caching at CDN edge
- Objects must be accessed via the custom domain (not the S3 endpoint) for CDN caching
- First request is always a cache miss; subsequent requests from the same region will be cached
- Check `cf-cache-status` response header (should be `HIT` on repeat requests)
