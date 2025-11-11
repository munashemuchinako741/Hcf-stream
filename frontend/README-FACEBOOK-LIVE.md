# Facebook Live Streaming Integration Guide

This guide explains how to integrate Facebook Live streaming into your HCF streaming application.

## Overview

The application now supports displaying live streams directly from a Facebook page using the Facebook Graph API. When a live stream is active on your Facebook page, it will automatically appear in the `/live` page.

## Setup Instructions

### 1. Create a Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or use an existing one
3. Add the "Facebook Login" product to your app
4. Add the "Live Video API" product

### 2. Get Your Page Access Token

1. Go to your Facebook Page
2. Get your Page ID from the URL (e.g., `https://www.facebook.com/YOUR_PAGE_NAME` - the Page ID is the number after the name)
3. Use the [Graph API Explorer](https://developers.facebook.com/tools/explorer/) to get a Page Access Token:
   - Select your app
   - Click "Get Token" → "Get User Access Token"
   - Add these permissions: `pages_show_list`, `pages_read_engagement`, `pages_read_user_content`, `pages_manage_posts`
   - Exchange for a long-lived token
   - Get Page Access Token using: `GET /me/accounts`

### 3. Configure Environment Variables

Add these to your `.env.local` file:

```env
# Facebook Live Streaming
NEXT_PUBLIC_FACEBOOK_ACCESS_TOKEN=your-page-access-token-here
NEXT_PUBLIC_FACEBOOK_PAGE_ID=your-facebook-page-id-here
```

### 4. Facebook Page Settings

1. Go to your Facebook Page Settings
2. Enable live streaming for your page
3. Ensure the page has appropriate permissions

## How It Works

### Components

- **`FacebookLivePlayer`**: Main component that displays the live stream
- **`FacebookLiveAPI`**: Service class for interacting with Facebook Graph API
- **`/api/facebook-live`**: Next.js API route for server-side Facebook API calls

### Features

- **Automatic Detection**: Automatically detects when a live stream is active
- **Real-time Updates**: Refreshes stream data every 30 seconds
- **Embed Integration**: Uses Facebook's official embed player
- **Fallback Display**: Shows appropriate messages when no stream is available
- **Viewer Count**: Displays current viewer count
- **Stream Info**: Shows stream title and description

### API Endpoints

#### GET `/api/facebook-live`

Fetches live streams from your Facebook page.

**Query Parameters:**
- `accessToken`: Your Facebook Page Access Token
- `pageId`: Your Facebook Page ID

**Response:**
```json
{
  "liveStreams": [
    {
      "id": "stream_id",
      "title": "Stream Title",
      "description": "Stream Description",
      "status": "LIVE",
      "embed_html": "<iframe>...</iframe>",
      "live_views": 150
    }
  ]
}
```

## Going Live on Facebook

1. Open Facebook and go to your Page
2. Click "Live" or "Go Live"
3. Configure your stream settings
4. Start streaming
5. The stream will automatically appear in your app

## Troubleshooting

### Common Issues

1. **"Facebook credentials not configured"**
   - Check that `NEXT_PUBLIC_FACEBOOK_ACCESS_TOKEN` and `NEXT_PUBLIC_FACEBOOK_PAGE_ID` are set

2. **"Failed to fetch live streams"**
   - Verify your access token is valid and has the required permissions
   - Check that your page ID is correct

3. **Stream not appearing**
   - Ensure the stream is actually live on Facebook
   - Wait up to 30 seconds for the app to detect the stream
   - Check browser console for API errors

### Token Permissions Required

Your Page Access Token needs these permissions:
- `pages_show_list`
- `pages_read_engagement`
- `pages_read_user_content`
- `pages_manage_posts`

### Rate Limits

Facebook Graph API has rate limits. The app refreshes every 30 seconds to stay within limits.

## Security Notes

- Never expose your access token in client-side code (use server-side API routes)
- Use environment variables for sensitive credentials
- Regularly rotate your access tokens
- Monitor API usage to avoid hitting rate limits

## Next Steps

1. Set up your Facebook app and get credentials
2. Configure environment variables
3. Test with a live stream
4. Customize the player UI as needed
5. Add additional features like stream scheduling or multiple camera support
