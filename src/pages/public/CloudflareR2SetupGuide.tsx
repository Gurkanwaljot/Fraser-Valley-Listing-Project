import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import { APP_NAME } from '../../lib/constants';

export default function CloudflareR2SetupGuide() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 8 }}>
      <Container maxWidth="md">
        <Typography variant="overline" sx={{ color: 'primary.main', display: 'block', mb: 1 }}>
          {APP_NAME} - Setup Guide
        </Typography>
        <Typography variant="h3" sx={{ color: 'text.primary', fontWeight: 400, mb: 4 }}>
          Cloudflare R2 Storage Configuration
        </Typography>

        <Paper sx={{ p: { xs: 3, sm: 5 }, bgcolor: 'surface.main', mb: 4 }}>
          <Typography variant="h5" sx={{ color: 'text.primary', mb: 2 }}>
            Overview
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
            Fraser Valley Real Estate Photography uses Cloudflare R2 as its primary storage provider for photos, videos, and documents.
            R2 provides S3-compatible object storage with zero egress fees, making it ideal for media-heavy
            applications. All sensitive credentials are stored in Supabase Edge Function secrets - never in
            frontend code.
          </Typography>
          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" sx={{ color: 'text.primary', mb: 2 }}>
            Step 1: Create a Cloudflare Account
          </Typography>
          <Typography component="div" variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
            <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>
              <li>Go to <code>dash.cloudflare.com</code></li>
              <li>Sign up for a free account (or log in if you have one)</li>
              <li>Verify your email address</li>
            </ol>
          </Typography>
          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" sx={{ color: 'text.primary', mb: 2 }}>
            Step 2: Enable R2 Storage
          </Typography>
          <Typography component="div" variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
            <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>
              <li>In Cloudflare dashboard, click "R2 Object Storage" in left sidebar</li>
              <li>Click "Get Started" to enable R2 (requires adding a payment method, but free tier includes 10GB storage and unlimited egress)</li>
              <li>Note your Account ID (visible in the dashboard URL or overview page)</li>
            </ol>
          </Typography>
          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" sx={{ color: 'text.primary', mb: 2 }}>
            Step 3: Create an R2 Bucket
          </Typography>
          <Typography component="div" variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
            <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>
              <li>Click "Create bucket"</li>
              <li>Name: <code>lumen-listings-media</code> (or your preferred name)</li>
              <li>Location: Choose closest to your primary audience (auto is fine)</li>
              <li>Click "Create bucket"</li>
            </ol>
          </Typography>
          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" sx={{ color: 'text.primary', mb: 2 }}>
            Step 4: Create R2 API Credentials
          </Typography>
          <Typography component="div" variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
            <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>
              <li>In R2 section, click "Manage R2 API Tokens"</li>
              <li>Click "Create API token"</li>
              <li>Name: <code>lumen-listings-edge-functions</code></li>
              <li>Permissions: "Object Read & Write"</li>
              <li>Specify bucket: select your bucket</li>
              <li>Click "Create API Token"</li>
              <li><strong>SAVE IMMEDIATELY</strong>: Copy the Access Key ID and Secret Access Key. The secret is shown only once.</li>
            </ol>
          </Typography>
          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" sx={{ color: 'text.primary', mb: 2 }}>
            Step 5: Configure CORS (Optional - for direct browser uploads)
          </Typography>
          <Typography component="div" variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
            <p>In bucket settings, add a CORS policy:</p>
            <Box component="pre" sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1, overflow: 'auto', fontSize: '0.8rem' }}>
{`[
  {
    "AllowedOrigins": ["https://your-app-domain.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]`}
            </Box>
          </Typography>
          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" sx={{ color: 'text.primary', mb: 2 }}>
            Step 6: Set Up Public Custom Domain (Optional)
          </Typography>
          <Typography component="div" variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
            <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>
              <li>In bucket settings, click "Connect Domain" under Public access</li>
              <li>Enter a subdomain like <code>media.yourdomain.com</code></li>
              <li>Cloudflare will auto-configure DNS and SSL</li>
              <li>Public media will be accessible at <code>https://media.yourdomain.com/path/to/file</code></li>
            </ol>
            <p style={{ marginTop: '0.75rem' }}>If you skip this step, public media can still be served via the R2 public bucket URL.</p>
          </Typography>
          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" sx={{ color: 'text.primary', mb: 2 }}>
            Step 7: Add Secrets to Supabase Edge Functions
          </Typography>
          <Typography component="div" variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
            <p>These environment variables must be configured as Supabase Edge Function secrets (not in frontend code):</p>
            <Box component="pre" sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1, overflow: 'auto', fontSize: '0.8rem' }}>
{`CLOUDFLARE_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=lumen-listings-media
R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
R2_PUBLIC_BASE_URL=https://media.yourdomain.com
STORAGE_PROVIDER=cloudflare_r2`}
            </Box>
            <p style={{ marginTop: '0.75rem' }}>
              These are set via the Supabase dashboard under Project Settings &gt; Edge Functions &gt; Secrets,
              or via the Supabase CLI.
            </p>
          </Typography>
          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" sx={{ color: 'text.primary', mb: 2 }}>
            Step 8: R2 Endpoint URL Format
          </Typography>
          <Typography component="div" variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
            <p>The R2 S3-compatible endpoint URL format is:</p>
            <Box component="pre" sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1, overflow: 'auto', fontSize: '0.8rem' }}>
              {`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`}
            </Box>
            <p style={{ marginTop: '0.75rem' }}>Replace <code>&lt;ACCOUNT_ID&gt;</code> with your Cloudflare account ID.</p>
          </Typography>
          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" sx={{ color: 'text.primary', mb: 2 }}>
            Security Rules
          </Typography>
          <Typography component="div" variant="body1" sx={{ color: 'text.secondary' }}>
            <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
              <li><strong>NEVER</strong> expose R2_SECRET_ACCESS_KEY in frontend code</li>
              <li><strong>NEVER</strong> expose R2_ACCESS_KEY_ID in frontend code</li>
              <li><strong>NEVER</strong> include CLOUDFLARE_ACCOUNT_ID in client bundles</li>
              <li>All upload/download operations go through Supabase Edge Functions</li>
              <li>Frontend only receives presigned URLs or public CDN URLs</li>
              <li>Original high-resolution files use signed URLs with expiry</li>
              <li>Public optimized thumbnails/web versions can use the public CDN domain</li>
            </ul>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
