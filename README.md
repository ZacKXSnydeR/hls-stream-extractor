# HLS Stream Extractor

A Docker-based API that extracts HLS/M3U8 streaming URLs from web pages using headless browser automation. Built with Puppeteer for reliable stream detection.

## What This Does

When you give it a URL containing a video player, this API:

1. Opens the page in a headless browser
2. Intercepts all network requests looking for `.m3u8` streams
3. Simulates user interaction (clicking play buttons)
4. Returns the stream URL along with the exact headers needed for playback

## Deployment

### Railway (Recommended - Free Tier Available)

1. Fork this repository
2. Go to [Railway](https://railway.app)
3. Create new project → Deploy from GitHub repo
4. Select your forked repository
5. Railway will auto-detect the Dockerfile and deploy

**Note:** This project requires Docker (uses Puppeteer with Chromium). Serverless platforms like Vercel, Netlify, or AWS Lambda are not supported due to missing system libraries.

### Other Docker Platforms

Works on any platform that supports Docker:
- Render.com
- Fly.io
- DigitalOcean App Platform
- Google Cloud Run
- Self-hosted servers

## API Reference

### Base URL
```
https://your-app.railway.app
```

### Endpoints

#### GET /
Returns API documentation.

#### GET /api/health
Health check endpoint.

#### GET /api/extract
Extract stream URL from a page.

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `url` | Yes | Target page URL |

**Example:**
```
GET /api/extract?url=https://example.com/video-page
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stream_url": "https://cdn.example.com/master.m3u8",
    "headers": {
      "Referer": "https://example.com/video-page",
      "User-Agent": "Mozilla/5.0...",
      "Origin": "https://example.com"
    }
  },
  "all_streams": [...]
}
```

## Usage Examples

### JavaScript
```javascript
const response = await fetch('https://your-app.railway.app/api/extract?url=' + encodeURIComponent(pageUrl));
const data = await response.json();

if (data.success) {
    const streamUrl = data.data.stream_url;
    const headers = data.data.headers;
}
```

### Python
```python
import requests

response = requests.get('https://your-app.railway.app/api/extract', params={'url': page_url})
data = response.json()

if data['success']:
    stream_url = data['data']['stream_url']
    headers = data['data']['headers']
```

### Android (Kotlin + ExoPlayer)
```kotlin
val headers = mapOf(
    "Referer" to response.data.headers["Referer"],
    "User-Agent" to response.data.headers["User-Agent"],
    "Origin" to response.data.headers["Origin"]
)

val dataSourceFactory = DefaultHttpDataSource.Factory()
    .setDefaultRequestProperties(headers)

val hlsSource = HlsMediaSource.Factory(dataSourceFactory)
    .createMediaSource(MediaItem.fromUri(streamUrl))

exoPlayer.setMediaSource(hlsSource)
exoPlayer.prepare()
exoPlayer.play()
```

### Electron Desktop App
```javascript
// main.js - Inject headers for CDN requests
const { session } = require('electron');

session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.vodvidl.site/*'] },
    (details, callback) => {
        details.requestHeaders['Referer'] = 'https://vidlink.pro/';
        details.requestHeaders['Origin'] = 'https://vidlink.pro';
        callback({ requestHeaders: details.requestHeaders });
    }
);
```

## Important Notes

### Headers Required
The extracted stream URLs typically require specific HTTP headers to play. Always use the `headers` object returned by the API when making requests to the stream URL.

### Browser Playback
Direct browser playback of extracted streams may not work due to:
- CORS restrictions
- CDN protection (Cloudflare)
- Missing Referer headers

Use the headers in your application (Android, iOS, Electron, etc.) for reliable playback.

## Project Structure

```
hls-stream-extractor/
├── Dockerfile          # Docker configuration with Puppeteer
├── server.js           # HTTP server and routing
├── api/
│   └── extract.js      # Extraction logic
├── package.json
└── README.md
```

## Local Development

```bash
# Using Docker
docker build -t hls-extractor .
docker run -p 3000:3000 hls-extractor

# Test
curl "http://localhost:3000/api/extract?url=https://example.com/video"
```

## Limitations

- Extraction takes 10-30 seconds per request
- Some heavily protected sites may block headless browsers
- Requires Docker environment (not compatible with serverless)

## Disclaimer

This project is for educational purposes only. Users are responsible for complying with applicable laws and terms of service.

## License

See [LICENSE](LICENSE) for details.
