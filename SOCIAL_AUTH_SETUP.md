# Social Authentication Setup

To enable "Sign in with Google", you need to configure the following environment variables in your `.env` file:

```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## How to get Google Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Go to **APIs & Services** > **Credentials**.
4. Click **Create Credentials** > **OAuth client ID**.
5. Select **Web application**.
6. Set the **Authorized redirect URIs** to:
   - `http://localhost:3000/api/auth/callback/google` (for development)
   - `https://your-production-domain.com/api/auth/callback/google` (for production)
7. Copy the **Client ID** and **Client Secret** and add them to your `.env` file.

## Testing

1. Restart your development server (`npm run dev`).
2. Go to `/auth/login` or `/auth/register`.
3. Click "Continue with Google".
