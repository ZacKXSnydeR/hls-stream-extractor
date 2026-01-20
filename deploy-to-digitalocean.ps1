# Automated Deployment Script for DigitalOcean
# Run this from PowerShell

$SERVER_IP = "167.99.79.46"
$USER = "root"

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "HLS Extractor - Auto Deployment" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Commands to run on server
$DEPLOY_SCRIPT = @'
set -e
echo "🚀 Starting deployment..."

# Update system
echo "📦 Updating system..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh 2>&1 | grep -v "^#"
rm get-docker.sh

# Install Docker Compose
echo "📦 Installing Docker Compose..."
apt-get install -y -qq docker-compose

# Install Git  
echo "📦 Installing Git..."
apt-get install -y -qq git

# Clone repository
echo "📥 Cloning repository..."
cd /root
rm -rf hls-extractor
git clone https://github.com/ZacKXSnydeR/hls-stream-extractor.git hls-extractor
cd hls-extractor

# Generate API key
echo "🔑 Generating API key..."
API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Create .env
echo "📝 Creating .env file..."
cat > .env << EOF
API_KEY=$API_KEY
PORT=3000
EOF

# Start application
echo "🚀 Starting application..."
docker-compose up -d --build

# Wait for startup
sleep 10

# Test
echo "🧪 Testing API..."
curl -s http://localhost:3000/api/health || echo "API not ready yet (normal on first start)"

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "=================================="
echo "🔑 YOUR API KEY (SAVE THIS!):"
echo "$API_KEY"
echo "=================================="
echo ""
echo "📡 API Endpoints:"
echo "- Extract: http://167.99.79.46:3000/api/extract?url=VIDEO_URL&key=$API_KEY"
echo "- Stats: http://167.99.79.46:3000/api/stats"
echo "- Health: http://167.99.79.46:3000/api/health"
echo ""
'@

Write-Host "Connecting to server: $USER@$SERVER_IP" -ForegroundColor Yellow
Write-Host "You will be prompted for password..." -ForegroundColor Yellow
Write-Host ""

# SSH and run script
ssh "$USER@$SERVER_IP" "bash -s" <<< $DEPLOY_SCRIPT

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "Check output above for your API KEY" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
