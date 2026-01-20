#!/bin/bash

# DigitalOcean Initial Setup Script
# Run this once on your droplet: bash setup.sh

set -e

echo "🚀 Setting up HLS Stream Extractor..."

# Update system
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Install Docker Compose
echo "📦 Installing Docker Compose..."
apt-get install -y docker-compose

# Install Git
echo "📦 Installing Git..."
apt-get install -y git

# Clone repository
echo "📥 Cloning repository..."
cd /root
git clone https://github.com/ZacKXSnydeR/hls-stream-extractor.git hls-extractor
cd hls-extractor

# Generate API key
echo "🔑 Generating API key..."
API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Create .env file
echo "📝 Creating .env file..."
cat > .env << EOF
API_KEY=$API_KEY
PORT=3000
EOF

echo ""
echo "✅ Setup complete!"
echo ""
echo "🔑 Your API Key (SAVE THIS):"
echo "$API_KEY"
echo ""
echo "🚀 Starting application..."
docker-compose up -d --build

echo ""
echo "✅ Application is running!"
echo "📡 API URL: http://167.99.79.46:3000"
echo "📊 Stats: http://167.99.79.46:3000/api/stats"
echo ""
echo "📝 To view logs: docker-compose logs -f"
echo "🔄 To restart: docker-compose restart"
echo "🛑 To stop: docker-compose down"
