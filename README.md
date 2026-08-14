# Grok Video for iPhone — v2

This version adds a no-cost **Test OpenRouter connection** button and more detailed error reporting.

## Recommended update process in Vercel
If your v1 app is already deployed, replace the project files with this v2 version and redeploy.
Your existing `OPENROUTER_API_KEY` environment variable can remain in place.

## First thing to do after deployment
Open the app and tap **Test OpenRouter connection** before pressing Generate.

If it says **Connection OK**, Vercel can reach OpenRouter, the API key is accepted, and the app can see the video model.

If it gives an error, the message now identifies whether the problem is:
- Vercel environment variable
- malformed API key
- OpenRouter authentication
- OpenRouter/network connection

## Vercel API key
Project Settings → Environment Variables:
- Name: `OPENROUTER_API_KEY`
- Value: your OpenRouter key beginning with `sk-or-`

Paste only the key itself. Do not include quotes, `Bearer`, spaces, or line breaks.

After changing an environment variable, redeploy the project.

## Image → Video
Image uploads additionally require Vercel Blob (`BLOB_READ_WRITE_TOKEN`).
Text → Video does not require Blob.

## iPhone
Open the deployed site in Safari → Share → Add to Home Screen.

## Security
Anyone with access to the public deployment can submit paid video generations. Keep the URL private or add authentication.
