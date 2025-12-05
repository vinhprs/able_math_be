#!/bin/bash

# Script to install Chromium and dependencies for Puppeteer on Ubuntu
# Run this script if you're running the backend directly on Ubuntu (not in Docker)

set -e

echo "Installing Chromium and dependencies for Puppeteer..."

# Update package list
sudo apt-get update

# Install Chromium and required dependencies
sudo apt-get install -y \
    chromium-browser \
    chromium-chromedriver \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    xdg-utils

echo "Chromium installation completed!"
echo ""
echo "Setting environment variables..."
echo "Add these to your .env file or export them:"
echo "  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true"
echo "  PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser"
echo ""
echo "Or run:"
echo "  export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true"
echo "  export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser"
