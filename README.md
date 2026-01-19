# HLS Stream Extractor

A serverless API that extracts HLS/M3U8 streaming URLs from web pages using headless browser automation. Built for developers who need to programmatically obtain video stream URLs along with the required HTTP headers for playback.

## What This Does

When you give it a URL containing a video player, this API:

1. Opens the page in a headless browser with anti-detection measures
2. Intercepts all network requests looking for `.m3u8` streams
3. Simulates user interaction (clicking play buttons, etc.)
4. Returns the stream URL along with the exact headers needed for playback

This solves the common problem where video streams require specific `Referer` or authentication headers that browsers automatically send but your application doesn't know about.

---

## Quick Start

### Deploy to Vercel

```bash
git clone https://github.com/ZacKXSnydeR/hls-stream-extractor.git
cd hls-stream-extractor
npm install
vercel --prod
```

After deployment, you'll get a URL like `https://your-project.vercel.app`

### Make Your First Request

```
GET https://your-project.vercel.app/api/extract?url=https://example.com/video-page
```

Response:
```json
{
  "success": true,
  "data": {
    "stream_url": "https://cdn.example.com/video/master.m3u8",
    "headers": {
      "Referer": "https://example.com/video-page",
      "User-Agent": "Mozilla/5.0...",
      "Origin": "https://example.com"
    }
  }
}
```

---

## API Reference

### GET /api/extract

Extracts stream URL from the given page.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `url` | Yes | The page URL containing the video player |

### GET /api/health

Returns server status. Useful for uptime monitoring.

### GET /

Returns API documentation in JSON format.

---

## Integration Examples

### JavaScript / React / Next.js

```javascript
async function getStreamUrl(pageUrl) {
  const API_BASE = 'https://your-project.vercel.app';
  
  const response = await fetch(
    `${API_BASE}/api/extract?url=${encodeURIComponent(pageUrl)}`
  );
  
  const data = await response.json();
  
  if (data.success) {
    return {
      url: data.data.stream_url,
      headers: data.data.headers
    };
  }
  
  throw new Error(data.error);
}

// Usage
const stream = await getStreamUrl('https://example.com/video-page');
console.log(stream.url);
console.log(stream.headers);
```

### Using with Video.js

```javascript
const stream = await getStreamUrl(pageUrl);

const player = videojs('my-video', {
  sources: [{
    src: stream.url,
    type: 'application/x-mpegURL'
  }]
});

// Note: Browser-side Video.js can't set custom headers.
// You'll need a proxy server or CORS-enabled streams.
```

### Using with hls.js

```javascript
import Hls from 'hls.js';

const stream = await getStreamUrl(pageUrl);

const video = document.getElementById('video');
const hls = new Hls({
  xhrSetup: (xhr, url) => {
    xhr.setRequestHeader('Referer', stream.headers.Referer);
  }
});

hls.loadSource(stream.url);
hls.attachMedia(video);
```

---

### Android (Kotlin + ExoPlayer)

This is where the headers really matter. ExoPlayer needs the exact headers or the stream won't play.

```kotlin
import com.google.android.exoplayer2.ExoPlayer
import com.google.android.exoplayer2.MediaItem
import com.google.android.exoplayer2.source.hls.HlsMediaSource
import com.google.android.exoplayer2.upstream.DefaultHttpDataSource

class VideoPlayerActivity : AppCompatActivity() {
    
    private lateinit var player: ExoPlayer
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Call your API
        val streamData = fetchStreamData("https://example.com/video-page")
        
        // Build headers map
        val headers = mapOf(
            "Referer" to streamData.headers.referer,
            "User-Agent" to streamData.headers.userAgent,
            "Origin" to streamData.headers.origin
        )
        
        // Create data source with headers
        val dataSourceFactory = DefaultHttpDataSource.Factory()
            .setDefaultRequestProperties(headers)
        
        // Create HLS source
        val hlsSource = HlsMediaSource.Factory(dataSourceFactory)
            .createMediaSource(MediaItem.fromUri(streamData.streamUrl))
        
        // Initialize player
        player = ExoPlayer.Builder(this).build()
        player.setMediaSource(hlsSource)
        player.prepare()
        player.play()
    }
    
    private fun fetchStreamData(pageUrl: String): StreamResponse {
        val client = OkHttpClient()
        val apiUrl = "https://your-project.vercel.app/api/extract?url=${URLEncoder.encode(pageUrl, "UTF-8")}"
        
        val request = Request.Builder().url(apiUrl).build()
        val response = client.newCall(request).execute()
        
        return Gson().fromJson(response.body?.string(), StreamResponse::class.java)
    }
}

data class StreamResponse(
    val success: Boolean,
    val data: StreamData
)

data class StreamData(
    val stream_url: String,
    val headers: StreamHeaders
)

data class StreamHeaders(
    val Referer: String,
    val `User-Agent`: String,
    val Origin: String
)
```

---

### Android (Java + ExoPlayer)

```java
public class VideoPlayerActivity extends AppCompatActivity {
    
    private ExoPlayer player;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Fetch from your API (use Retrofit, Volley, etc.)
        String streamUrl = "https://cdn.example.com/master.m3u8";
        String referer = "https://example.com/video-page";
        String userAgent = "Mozilla/5.0...";
        String origin = "https://example.com";
        
        // Build headers
        Map<String, String> headers = new HashMap<>();
        headers.put("Referer", referer);
        headers.put("User-Agent", userAgent);
        headers.put("Origin", origin);
        
        // Create data source factory with headers
        DefaultHttpDataSource.Factory dataSourceFactory = 
            new DefaultHttpDataSource.Factory()
                .setDefaultRequestProperties(headers);
        
        // Create HLS source
        HlsMediaSource hlsSource = new HlsMediaSource.Factory(dataSourceFactory)
            .createMediaSource(MediaItem.fromUri(Uri.parse(streamUrl)));
        
        // Initialize player
        player = new ExoPlayer.Builder(this).build();
        player.setMediaSource(hlsSource);
        player.prepare();
        player.play();
    }
}
```

---

### iOS (Swift + AVPlayer)

```swift
import AVKit

class VideoPlayerViewController: UIViewController {
    
    var player: AVPlayer?
    
    func playStream(from pageUrl: String) {
        // Fetch stream data from API
        fetchStreamData(pageUrl: pageUrl) { result in
            switch result {
            case .success(let streamData):
                self.setupPlayer(
                    url: streamData.streamUrl,
                    headers: streamData.headers
                )
            case .failure(let error):
                print("Error: \(error)")
            }
        }
    }
    
    func setupPlayer(url: String, headers: [String: String]) {
        guard let streamUrl = URL(string: url) else { return }
        
        // Create asset with headers
        let asset = AVURLAsset(url: streamUrl, options: [
            "AVURLAssetHTTPHeaderFieldsKey": headers
        ])
        
        let playerItem = AVPlayerItem(asset: asset)
        player = AVPlayer(playerItem: playerItem)
        
        let playerViewController = AVPlayerViewController()
        playerViewController.player = player
        
        present(playerViewController, animated: true) {
            self.player?.play()
        }
    }
    
    func fetchStreamData(pageUrl: String, completion: @escaping (Result<StreamData, Error>) -> Void) {
        let encoded = pageUrl.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let apiUrl = URL(string: "https://your-project.vercel.app/api/extract?url=\(encoded)")!
        
        URLSession.shared.dataTask(with: apiUrl) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let data = data else { return }
            
            do {
                let response = try JSONDecoder().decode(APIResponse.self, from: data)
                DispatchQueue.main.async {
                    completion(.success(response.data))
                }
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }
}

struct APIResponse: Codable {
    let success: Bool
    let data: StreamData
}

struct StreamData: Codable {
    let stream_url: String
    let headers: StreamHeaders
    
    var streamUrl: String { stream_url }
}

struct StreamHeaders: Codable {
    let Referer: String
    let UserAgent: String
    let Origin: String
    
    enum CodingKeys: String, CodingKey {
        case Referer
        case UserAgent = "User-Agent"
        case Origin
    }
}
```

---

### Flutter (Dart)

```dart
import 'package:http/http.dart' as http;
import 'package:video_player/video_player.dart';
import 'dart:convert';

class StreamService {
  static const String apiBase = 'https://your-project.vercel.app';
  
  static Future<StreamData> getStream(String pageUrl) async {
    final encodedUrl = Uri.encodeComponent(pageUrl);
    final response = await http.get(
      Uri.parse('$apiBase/api/extract?url=$encodedUrl')
    );
    
    final json = jsonDecode(response.body);
    
    if (json['success'] == true) {
      return StreamData.fromJson(json['data']);
    }
    
    throw Exception(json['error']);
  }
}

class StreamData {
  final String streamUrl;
  final Map<String, String> headers;
  
  StreamData({required this.streamUrl, required this.headers});
  
  factory StreamData.fromJson(Map<String, dynamic> json) {
    return StreamData(
      streamUrl: json['stream_url'],
      headers: Map<String, String>.from(json['headers']),
    );
  }
}

// Usage with better_player or video_player
class VideoPlayerWidget extends StatefulWidget {
  final String pageUrl;
  
  const VideoPlayerWidget({required this.pageUrl});
  
  @override
  _VideoPlayerWidgetState createState() => _VideoPlayerWidgetState();
}

class _VideoPlayerWidgetState extends State<VideoPlayerWidget> {
  VideoPlayerController? _controller;
  
  @override
  void initState() {
    super.initState();
    _initPlayer();
  }
  
  Future<void> _initPlayer() async {
    final stream = await StreamService.getStream(widget.pageUrl);
    
    _controller = VideoPlayerController.network(
      stream.streamUrl,
      httpHeaders: stream.headers,
    );
    
    await _controller!.initialize();
    setState(() {});
    _controller!.play();
  }
  
  @override
  Widget build(BuildContext context) {
    if (_controller?.value.isInitialized ?? false) {
      return AspectRatio(
        aspectRatio: _controller!.value.aspectRatio,
        child: VideoPlayer(_controller!),
      );
    }
    return const CircularProgressIndicator();
  }
}
```

---

### Python

```python
import requests

API_BASE = "https://your-project.vercel.app"

def get_stream(page_url: str) -> dict:
    response = requests.get(
        f"{API_BASE}/api/extract",
        params={"url": page_url}
    )
    
    data = response.json()
    
    if data.get("success"):
        return {
            "url": data["data"]["stream_url"],
            "headers": data["data"]["headers"]
        }
    
    raise Exception(data.get("error", "Unknown error"))


# Usage
stream = get_stream("https://example.com/video-page")

# Download with headers
response = requests.get(stream["url"], headers=stream["headers"], stream=True)

# Or use with streamlink/ffmpeg
# ffmpeg -headers "Referer: {referer}" -i "{url}" output.mp4
```

### Python + FFmpeg Download

```python
import subprocess

stream = get_stream("https://example.com/video-page")

headers = f"Referer: {stream['headers']['Referer']}\r\n"
headers += f"User-Agent: {stream['headers']['User-Agent']}\r\n"
headers += f"Origin: {stream['headers']['Origin']}"

subprocess.run([
    "ffmpeg",
    "-headers", headers,
    "-i", stream["url"],
    "-c", "copy",
    "output.mp4"
])
```

---

### cURL

```bash
# Get stream data
curl "https://your-project.vercel.app/api/extract?url=https://example.com/video"

# Download the stream with headers
curl -H "Referer: https://example.com" \
     -H "User-Agent: Mozilla/5.0..." \
     "https://cdn.example.com/master.m3u8" -o stream.m3u8
```

---

## Project Structure

```
hls-stream-extractor/
├── api/
│   ├── extract.js     # Main extraction logic
│   ├── health.js      # Health check
│   └── index.js       # API docs
├── server.js          # Local dev server
├── vercel.json        # Vercel config
├── package.json
└── README.md
```

---

## Local Development

```bash
npm install
npm start
```

Server runs at `http://localhost:3000`

Test with: `http://localhost:3000/api/extract?url=https://example.com`

Note: Local development requires Chromium. The serverless version uses `@sparticuz/chromium` which only works on Vercel/AWS Lambda.

---

## Configuration

The extraction engine is configured in `api/extract.js`:

| Setting | Default | Description |
|---------|---------|-------------|
| `TOTAL_TIMEOUT` | 55s | Maximum extraction time |
| `NAVIGATION_TIMEOUT` | 20s | Page load timeout |
| `STREAM_WAIT_TIME` | 20s | Time to wait for stream |
| `MAX_CLICK_ATTEMPTS` | 8 | Number of click attempts |
| `RETRY_COUNT` | 2 | Retries with new fingerprint |

---

## Troubleshooting

**Stream not found:**
- Some sites load players dynamically. The API clicks multiple times to trigger playback.
- Very slow sites might timeout. Consider increasing `STREAM_WAIT_TIME`.

**403 Forbidden when playing:**
- You're probably not sending the headers. Make sure your player includes all three: `Referer`, `User-Agent`, and `Origin`.

**Works locally but not on Vercel:**
- Check Vercel function logs for errors.
- Ensure `vercel.json` has enough memory (1024MB minimum for Puppeteer).

---

## Limitations

- Extraction takes 10-30 seconds depending on the site
- Vercel has a 60-second function timeout limit
- Some heavily protected sites may still block headless browsers
- This won't work on sites that require actual user login

---

## Disclaimer

This tool is provided for educational purposes. It demonstrates browser automation, network interception, and API design patterns.

Users are responsible for:
- Complying with target website terms of service
- Respecting copyright and intellectual property rights
- Using the tool legally in their jurisdiction

The authors are not responsible for misuse of this software.

---

## License

MIT License - see [LICENSE](LICENSE) for details.
