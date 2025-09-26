#!/bin/bash

# NASA Space Apps Matchmaking API Deployment Script
# This script handles the deployment process on the target server

set -e  # Exit on any error

PROJECT_DIR="/opt/nasa-matchmaking-api"
LOG_FILE="$PROJECT_DIR/deploy.log"

echo "Starting deployment at $(date)" | tee -a $LOG_FILE

# Create project directory if it doesn't exist
if [ ! -d "$PROJECT_DIR" ]; then
    echo "Creating project directory..." | tee -a $LOG_FILE
    mkdir -p $PROJECT_DIR
fi

cd $PROJECT_DIR

# Check if git repo exists
if [ ! -d ".git" ]; then
    echo "Initializing git repository..." | tee -a $LOG_FILE
    git init
    git remote add origin https://github.com/GhabryelHenrique/nasa-spaceapps-matchmaking-api.git
fi

# Pull latest changes
echo "Pulling latest changes..." | tee -a $LOG_FILE
git fetch origin
git reset --hard origin/master

# Check Node.js version and upgrade if needed
if ! node --version | grep -q "v20"; then
    echo "Installing Node.js 20..." | tee -a $LOG_FILE
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install dependencies
echo "Installing dependencies..." | tee -a $LOG_FILE
npm install

# Build the application
echo "Building application..." | tee -a $LOG_FILE
npm run build

# Copy environment file if it exists
if [ -f ".env.production" ]; then
    cp .env.production .env
    echo "Environment file updated" | tee -a $LOG_FILE
fi

# Stop existing application
echo "Stopping existing application..." | tee -a $LOG_FILE
if command -v pm2 &> /dev/null; then
    pm2 stop nasa-matchmaking-api || echo "PM2 process not found"
    pm2 delete nasa-matchmaking-api || echo "PM2 process not found"
else
    pkill -f "node.*dist/main.js" || echo "No existing process found"
fi

# Start the application
echo "Starting application..." | tee -a $LOG_FILE
if command -v pm2 &> /dev/null; then
    pm2 start dist/main.js --name nasa-matchmaking-api
    pm2 save
    echo "Application started with PM2" | tee -a $LOG_FILE
else
    nohup node dist/main.js > app.log 2>&1 &
    echo "Application started with nohup" | tee -a $LOG_FILE
fi

echo "Deployment completed successfully at $(date)" | tee -a $LOG_FILE