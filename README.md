# HLS Stream Extractor

**A production-ready Docker-based API for extracting HLS/M3U8 streaming URLs from web pages using advanced headless browser automation.**

Built with Puppeteer for reliable stream detection across various streaming platforms. Features intelligent caching, request queuing, and automatic subtitle extraction.

---

## Features

### Core Capabilities
- ✅ **HLS Stream Extraction** - Detects M3U8 master playlists and media streams
- ✅ **Subtitle Extraction** - Automatically captures VTT, SRT, ASS subtitle tracks with language detection
- ✅ **Header Capture** - Returns required Referer, Origin, and User-Agent headers
- ✅ **Multi-Strategy Detection** - Network interception, response parsing, console monitoring

### Performance & Reliability
- ✅ **Browser Pooling** - Reuses warm browser instances for 60% faster extraction
- ✅ **Result Caching** - 30-minute intelligent cache reduces redundant extractions
- ✅ **Request Queue** - Limits concurrent extractions to prevent memory overload
- ✅ **Auto-Recovery** - Automatic retry with different fingerprints on failure

### Security & Control
- ✅ **API Key Authentication** - Optional protection against unauthorized usage
- ✅ **Rate Limiting** - Built-in concurrency control via request queue
- ✅ **No Data Logging** - Extraction results only cached in memory

### Monitoring & Deployment
- ✅ **Real-time Stats** - Monitor cache hits, queue status, and memory usage
- ✅ **Auto-Deployment** - GitHub Actions integration for continuous deployment
- ✅ **Docker Support** - Production-ready containerization with Docker Compose

---

## Quick Start

### Option 1: One-Command Deploy (DigitalOcean/VPS)

```bash
curl -fsSL https://raw.githubusercontent.com/ZacKXSnydeR/hls-stream-extractor/main/setup.sh | bash
```

This automated script will:
- Install Docker, Docker Compose, and Git
- Clone the repository
- Generate a secure API key
- Start the application

### Option 2: Manual Docker Setup

```bash
# Clone repository
git clone https://github.com/ZacKXSnydeR/hls-stream-extractor.git
cd hls-stream-extractor

# Generate API key (recommended)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Create .env file
cp .env.example .env
# Edit .env and set API_KEY=your-generated-key

# Start with Docker Compose
docker-compose up -d
```

### Option 3: Railway/Cloud Platform

1. Fork this repository
2. Deploy to your platform (Railway, Render, Fly.io, etc.)
3. Set environment variable: `API_KEY=your-secure-key` (recommended)
4. Platform will auto-detect Dockerfile and deploy

---

## Configuration

### Environment Variables

Create a `.env` file (see `.env.example`):

```bash
# API Security (Recommended)
API_KEY=your-secure-random-key-here

# Server Port (Default: 3000)
PORT=3000
```

### Generating a Secure API Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Best Practice:** Always set an API key for production deployments to prevent unauthorized usage.

---

## API Reference

### Base URL
```
http://your-server-ip:3000
```

### Endpoints

#### `GET /api/extract`
**Extract stream and subtitle URLs from a video page.**

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `url` | Yes | Target video page URL |
| `key` | Conditional | API key (required if `API_KEY` env is set) |

**Request Examples:**

```bash
# With API key (recommended)
curl "http://your-server:3000/api/extract?url=https://example.com/video&key=YOUR_API_KEY"

# Without authentication (if API_KEY not set)
curl "http://your-server:3000/api/extract?url=https://example.com/video"
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "stream_url": "https://cdn.example.com/master.m3u8",
    "headers": {
      "Referer": "https://example.com/video",
      "User-Agent": "Mozilla/5.0...",
      "Origin": "https://example.com"
    },
    "subtitles": [
      {
        "url": "https://cdn.example.com/subtitles/en.vtt",
        "language": "English"
      },
      {
        "url": "https://cdn.example.com/subtitles/es.vtt",
        "language": "Spanish"
      }
    ]
  },
  "all_streams": [...]
}
```

**Cached Response:**
If the same URL was requested within the last 30 minutes, the response is instant (<5ms) from cache.

#### `GET /api/stats`
**Monitor system performance and cache efficiency.**

**Response:**
```json
{
  "status": "ok",
  "queue": {
    "running": 1,
    "queued": 0,
    "capacity": 2
  },
  "cache": {
    "size": 42,
    "ttl": "30 minutes"
  },
  "memory": {
    "heapUsed": "180MB",
    "heapTotal": "256MB"
  }
}
```

#### `GET /api/health`
**Basic health check endpoint.**

---

## Integration Examples

### JavaScript/Node.js

```javascript
const API_URL = 'http://your-server:3000';
const API_KEY = 'your-api-key';

async function extractStream(videoUrl) {
    const response = await fetch(
        `${API_URL}/api/extract?url=${encodeURIComponent(videoUrl)}&key=${API_KEY}`
    );
    const data = await response.json();
    
    if (data.success) {
        return {
            streamUrl: data.data.stream_url,
            headers: data.data.headers,
            subtitles: data.data.subtitles
        };
    }
    
    throw new Error(data.error || 'Extraction failed');
}
```

### Python

```python
import requests

API_URL = 'http://your-server:3000'
API_KEY = 'your-api-key'

def extract_stream(video_url):
    response = requests.get(
        f'{API_URL}/api/extract',
        params={'url': video_url, 'key': API_KEY}
    )
    data = response.json()
    
    if data['success']:
        return {
            'stream_url': data['data']['stream_url'],
            'headers': data['data']['headers'],
            'subtitles': data['data']['subtitles']
        }
    
    raise Exception(data.get('error', 'Extraction failed'))
```

### Android (Kotlin + ExoPlayer)

```kotlin
// Setup HTTP data source with custom headers
val headers = mapOf(
    "Referer" to streamData.headers["Referer"],
    "User-Agent" to streamData.headers["User-Agent"],
    "Origin" to streamData.headers["Origin"]
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

**main.js** - Header injection:
```javascript
const { app, BrowserWindow, session, ipcMain } = require('electron');

let streamHeaders = {};

ipcMain.on('set-stream-headers', (event, headers) => {
    streamHeaders = headers;
});

app.whenReady().then(() => {
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        if (streamHeaders.Referer) {
            details.requestHeaders['Referer'] = streamHeaders.Referer;
        }
        if (streamHeaders.Origin) {
            details.requestHeaders['Origin'] = streamHeaders.Origin;
        }
        callback({ requestHeaders: details.requestHeaders });
    });
});
```

**renderer.js** - Extract and play:
```javascript
const { ipcRenderer } = require('electron');
const Hls = require('hls.js');

const API_URL = 'http://your-server:3000';
const API_KEY = 'your-api-key';

async function playVideo(pageUrl) {
    const video = document.getElementById('video');
    
    // Extract stream
    const response = await fetch(
        `${API_URL}/api/extract?url=${encodeURIComponent(pageUrl)}&key=${API_KEY}`
    );
    const data = await response.json();
    
    if (!data.success) {
        console.error('Extraction failed:', data.error);
        return;
    }
    
    // Send headers to main process
    ipcRenderer.send('set-stream-headers', data.data.headers);
    
    // Play with hls.js
    if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(data.data.stream_url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
    }
}
```

---

## Advanced Features

### Result Caching

**How it works:**
- Extraction results are cached for 30 minutes
- Same URL requests return instantly from cache
- Reduces server load and improves response time
- Cache is memory-based (cleared on restart)

**Cache Statistics:**
```bash
curl http://your-server:3000/api/stats
```

### Request Queue

**Purpose:** Prevents memory overload by limiting concurrent extractions.

**Configuration:**
- Maximum concurrent extractions: 2
- Additional requests wait in queue
- Automatic processing when capacity available

**Why it matters:**
- Prevents browser crashes on low-RAM servers
- Ensures stable performance under load
- Automatically managed - no configuration needed

### Browser Pooling

**Optimization:**
- Maintains 1 warm browser instance
- Reuses browser across requests
- 60% faster than launching new browser each time
- Automatic recovery if browser crashes

**Performance Impact:**
- First request: ~15 seconds
- Subsequent requests: ~8-12 seconds
- Cached requests: <5ms

### Subtitle Extraction

**Supported Formats:**
- WebVTT (`.vtt`)
- SubRip (`.srt`)
- Advanced SubStation Alpha (`.ass`, `.ssa`)

**Language Detection:**
- Automatic extraction from URL patterns
- Supports 15+ languages (English, Spanish, Bengali, Hindi, etc.)
- Falls back to "Unknown" if language cannot be determined

**Quality Filtering:**
- Rejects analytics/tracking URLs
- Filters out tiny/garbage URLs
- Only returns valid subtitle tracks

---

## Deployment

### Recommended Platforms

**Best for Production:**
- **DigitalOcean Droplets** - Full control, predictable costs ($6-12/month)
- **Render.com** - Easy setup with Docker support
- **Fly.io** - Global distribution

**Free Tier Options:**
- **Railway** - Generous free tier, auto-deploy from GitHub

**Not Recommended:**
- Vercel, Netlify, AWS Lambda (missing Chromium dependencies)

### System Requirements

**Minimum:**
- 1GB RAM (basic usage)
- 1 vCPU
- 10GB storage

**Recommended:**
- 2GB RAM (production workload)
- 1-2 vCPU
- 25GB storage

**Expected Performance:**
- 200+ extractions per day
- 75-85% success rate (varies by site)
- 8-15 second extraction time
- Instant cached responses

### Auto-Deployment Setup

Enable automatic deployment on every Git push:

1. **Initial Deployment:**
   ```bash
   ssh root@your-server-ip
   curl -fsSL https://raw.githubusercontent.com/ZacKXSnydeR/hls-stream-extractor/main/setup.sh | bash
   ```

2. **GitHub Actions Setup:**
   
   Generate SSH key on server:
   ```bash
   ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions -N ""
   cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
   cat ~/.ssh/github_actions
   ```

3. **Add GitHub Secrets:**
   
   Go to: `Settings → Secrets and variables → Actions`
   
   Add:
   - `DO_HOST`: your-server-ip
   - `DO_SSH_KEY`: (paste private key from step 2)

4. **Test Auto-Deploy:**
   ```bash
   git commit -am "test deploy" --allow-empty
   git push
   ```

Now every push automatically deploys to your server!

---

## Monitoring & Maintenance

### View Logs
```bash
docker-compose logs -f
```

### Check Memory Usage
```bash
free -h
docker stats --no-stream
```

### Restart Service
```bash
docker-compose restart
```

### Update Manually
```bash
git pull origin main
docker-compose up -d --build
```

### Clean Docker Cache
```bash
docker system prune -a -f
```

---

## Performance Tuning

### For Low-RAM Servers (1GB)

The system automatically optimizes for low-RAM environments:
- Single browser instance
- 256MB JavaScript heap limit
- Aggressive garbage collection (triggered at 200MB)
- Single-process browser mode

### For High-Volume Usage (500+ req/day)

Consider upgrading to:
- 4GB RAM droplet
- Increase browser pool to 2 instances
- Edit `api/browserPool.js`: `new BrowserPool(2)`
- Increase concurrent requests: `api/requestQueue.js`: `maxConcurrent: 3`

---

## Troubleshooting

### "No streams found" Errors

**Possible causes:**
- Site updated their protection mechanisms
- Cloudflare/bot detection blocking requests
- Video not yet loaded when extraction occurred

**Solutions:**
- Retry the request (automatic with retry mechanism)
- Check if site is accessible from server IP
- Verify URL is correct and active

### High Memory Usage

**Symptoms:**
- Server becomes unresponsive
- Docker container restarts frequently

**Solutions:**
- Check stats endpoint: `/api/stats`
- Reduce concurrent requests if needed
- Ensure garbage collection is enabled (`--expose-gc` flag)
- Upgrade RAM if consistently exceeding limits

### API Key Not Working

**Verify:**
- API_KEY environment variable is set correctly
- Key matches in both server and client
- No extra spaces or quotes in key value

**Test without key:**
- Temporarily remove API_KEY env variable
- Test if extraction works
- Re-add API_KEY with correct value

---

## Project Structure

```
hls-stream-extractor/
├── api/
│   ├── extract.js          # Core extraction engine
│   ├── browserPool.js      # Browser instance management
│   ├── cache.js            # Result caching system
│   ├── requestQueue.js     # Request queue manager
│   ├── index.js            # API documentation
│   └── health.js           # Health check endpoint
├── .github/
│   └── workflows/
│       └── deploy.yml      # Auto-deployment workflow
├── Dockerfile              # Docker image configuration
├── docker-compose.yml      # Production deployment config
├── server.js               # HTTP server & routing
├── setup.sh                # Automated installation script
├── DEPLOYMENT.md           # Detailed deployment guide
├── .env.example            # Environment variable template
└── README.md              # This file
```

---

## Security Best Practices

### Production Deployment

1. **Always set an API key** for production deployments
2. **Use HTTPS** with a reverse proxy (nginx/Caddy)
3. **Enable firewall** rules to restrict access
4. **Monitor usage** via `/api/stats` endpoint
5. **Rotate API keys** periodically

### API Key Management

**Never commit:**
- `.env` file (already in `.gitignore`)
- API keys in code
- Server credentials

**Secure storage:**
- Use environment variables
- Store keys in secret manager (for cloud deployments)
- Share keys securely (encrypted channels)

---

## Legal Disclaimer

This project is provided for **educational and research purposes only**. 

Users are solely responsible for:
- Compliance with applicable laws and regulations
- Respecting terms of service of target websites
- Ensuring legal right to access extracted content

**This software does not:**
- Bypass DRM or copy protection
- Store or redistribute copyrighted content
- Violate intellectual property rights

**Use responsibly and ethically.**

---

## License

All Rights Reserved. See [LICENSE](LICENSE) for details.

**Restrictions:**
- ❌ Commercial use prohibited
- ✅ Personal use allowed
- ✅ Educational use allowed
- ✅ Research use allowed

---

## Support & Contribution

### Report Issues
[GitHub Issues](https://github.com/ZacKXSnydeR/hls-stream-extractor/issues)

### Deployment Help
See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

---

**Built with:** Puppeteer, Node.js, Docker  
**Optimized for:** Production deployment on 2GB RAM servers  
**Expected uptime:** 99.9% with auto-restart
