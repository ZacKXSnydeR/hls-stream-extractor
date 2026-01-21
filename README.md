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
- ✅ **Fresh Browser Per Request** - Unique fingerprint for each extraction
- ✅ **Result Caching** - 30-minute intelligent cache reduces redundant extractions
- ✅ **Request Queue** - Limits concurrent extractions to prevent memory overload
- ✅ **Auto-Recovery** - Automatic cleanup after each request

### Security & Control
- ✅ **API Key Authentication** - Optional protection against unauthorized usage
- ✅ **Rate Limiting** - Built-in concurrency control via request queue
- ✅ **No Data Logging** - Extraction results only cached in memory

---

## Quick Start

### Option 1: Railway (Recommended)

1. Fork this repository
2. Go to [Railway](https://railway.app/) and create new project
3. Deploy from GitHub
4. Set environment variable: `API_KEY=your-secure-key`
5. Done! Railway auto-detects Dockerfile

### Option 2: Docker (Local/VPS)

```bash
# Clone repository
git clone https://github.com/ZacKXSnydeR/hls-stream-extractor.git
cd hls-stream-extractor

# Generate API key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Create .env file
echo "API_KEY=your-generated-key" > .env
echo "PORT=3000" >> .env

# Start with Docker Compose
docker-compose up -d
```

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_KEY` | API authentication key (recommended) | None |
| `PORT` | Server port | 3000 |

### Generating a Secure API Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## API Reference

### Extract Stream

**Endpoint:** `GET /api/extract`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Video page URL to extract from |
| `key` | string | If API_KEY set | Your API key |

**Example Request:**
```bash
curl "https://your-api.railway.app/api/extract?url=https://example.com/video&key=YOUR_API_KEY"
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "stream_url": "https://example.com/master.m3u8",
    "headers": {
      "Referer": "https://example.com/",
      "Origin": "https://example.com",
      "User-Agent": "..."
    },
    "subtitles": [
      {
        "url": "https://example.com/subs.vtt",
        "language": "English"
      }
    ]
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "No streams found"
}
```

### Health Check

**Endpoint:** `GET /api/health`

```bash
curl "https://your-api.railway.app/api/health"
```

### Stats

**Endpoint:** `GET /api/stats`

```bash
curl "https://your-api.railway.app/api/stats"
```

---

## Integration Example

### JavaScript/Node.js

```javascript
const API_URL = 'https://your-api.railway.app';
const API_KEY = 'your-api-key';

async function extractStream(videoUrl) {
    const url = `${API_URL}/api/extract?url=${encodeURIComponent(videoUrl)}&key=${API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success) {
        return {
            streamUrl: data.data.stream_url,
            headers: data.data.headers,
            subtitles: data.data.subtitles
        };
    }
    throw new Error(data.error);
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check API_KEY is set correctly |
| 404 Not Found | Ensure URL is properly encoded |
| No streams found | Some sites have anti-bot protection |
| Timeout | Try again, some pages load slowly |

---

## Project Structure

```
├── api/
│   ├── extract.js      # Core extraction logic
│   ├── browserPool.js  # Browser management
│   ├── cache.js        # Result caching
│   └── requestQueue.js # Concurrency control
├── server.js           # Express server
├── Dockerfile          # Docker configuration
├── docker-compose.yml  # Docker Compose setup
└── .env.example        # Environment template
```

---

## License

MIT License - see [LICENSE](LICENSE) file.

---

## Security

- Never commit API keys to version control
- Use environment variables for secrets
- The `.env` file is gitignored by default
