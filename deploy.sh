#!/bin/bash

# NASA Space Apps Matchmaking API Deployment Script
# Usage: ./deploy.sh

set -e

echo "🚀 Starting NASA Matchmaking API deployment..."

# Configuration
APP_NAME="nasa-matchmaking-api"
APP_DIR="/opt/$APP_NAME"
SERVICE_FILE="$APP_NAME.service"
NGINX_CONF="nginx.conf"
USER="nodeuser"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

# Install Node.js and npm if not present
if ! command -v node &> /dev/null; then
    print_status "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2..."
    git pull
    npm install -g pm2
fi

# Install nginx if not present
if ! command -v nginx &> /dev/null; then
    print_status "Installing Nginx..."
    apt-get update
    apt-get install -y nginx
fi

# Install MongoDB if not present
if ! command -v mongod &> /dev/null; then
    print_status "Installing MongoDB..."
    wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    apt-get update
    apt-get install -y mongodb-org
    systemctl start mongod
    systemctl enable mongod
fi

# Create application user if doesn't exist
if ! id "$USER" &>/dev/null; then
    print_status "Creating application user: $USER"
    useradd -r -s /bin/false $USER
fi

# Create application directory
print_status "Setting up application directory..."
mkdir -p $APP_DIR
chown $USER:$USER $APP_DIR

# Copy application files
print_status "Copying application files..."
cp -r . $APP_DIR/
cd $APP_DIR

# Install dependencies and build
print_status "Installing dependencies..."
npm ci --only=production

print_status "Building application..."
npm run build

# Set permissions
chown -R $USER:$USER $APP_DIR

# Setup environment file
if [ ! -f "$APP_DIR/.env" ]; then
    print_warning "Creating .env file from template..."
    cp .env.example .env
    print_warning "Please edit $APP_DIR/.env with your actual configuration"
fi

# Setup systemd service
print_status "Setting up systemd service..."
cp $SERVICE_FILE /etc/systemd/system/
systemctl daemon-reload
systemctl enable $APP_NAME
systemctl start $APP_NAME

# Setup Nginx
print_status "Configuring Nginx..."
cp $NGINX_CONF /etc/nginx/sites-available/$APP_NAME
ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# Setup firewall (if ufw is available)
if command -v ufw &> /dev/null; then
    print_status "Configuring firewall..."
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
fi

print_status "Deployment completed! 🎉"
print_status "Service status:"
systemctl status $APP_NAME --no-pager -l

print_warning "Next steps:"
echo "1. Edit $APP_DIR/.env with your actual configuration"
echo "2. Update nginx.conf with your actual domain name"
echo "3. Set up SSL certificates (recommended: certbot)"
echo "4. Restart services: sudo systemctl restart $APP_NAME nginx"

print_status "Useful commands:"
echo "- View logs: sudo journalctl -u $APP_NAME -f"
echo "- Restart service: sudo systemctl restart $APP_NAME"
echo "- Check service status: sudo systemctl status $APP_NAME"