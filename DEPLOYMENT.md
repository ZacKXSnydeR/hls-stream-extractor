# DigitalOcean Deployment Guide

## Initial Setup (One-time)

### 1. SSH into your droplet:
```bash
ssh root@167.99.79.46
```
Enter the password you set during droplet creation.

### 2. Run the setup script:
```bash
curl -fsSL https://raw.githubusercontent.com/ZacKXSnydeR/hls-stream-extractor/main/setup.sh | bash
```

This will:
- Install Docker & Docker Compose
- Clone the repository
- Generate and set API key
- Build and start the application

**IMPORTANT:** Save the API key shown after setup!

---

## Auto-Update Setup (GitHub Actions)

### 1. Generate SSH key on DigitalOcean:
```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions -N ""
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github_actions
```

Copy the private key output.

### 2. Add GitHub Secrets:

Go to: https://github.com/ZacKXSnydeR/hls-stream-extractor/settings/secrets/actions

Add these secrets:
- **DO_HOST**: `167.99.79.46`
- **DO_SSH_KEY**: Paste the private key from step 1

### 3. Test Auto-Deploy:

Push any change to main branch:
```bash
git commit -am "test auto-deploy" --allow-empty
git push
```

Check: https://github.com/ZacKXSnydeR/hls-stream-extractor/actions

---

## Usage

### API Endpoint:
```
http://167.99.79.46:3000/api/extract?url=VIDEO_URL&key=YOUR_API_KEY
```

### Monitor Status:
```
http://167.99.79.46:3000/api/stats
```

### View Logs:
```bash
ssh root@167.99.79.46
cd /root/hls-extractor
docker-compose logs -f
```

### Restart Service:
```bash
docker-compose restart
```

---

## Maintenance

### Update manually (if needed):
```bash
cd /root/hls-extractor
git pull
docker-compose up -d --build
```

### Check memory:
```bash
free -h
docker stats --no-stream
```

### Clean up old Docker images:
```bash
docker system prune -a -f
```
