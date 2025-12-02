#!/bin/bash

# Script to run database seed
# Usage: ./scripts/run-seed.sh

echo "🌱 Running database seed..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with your database configuration."
    exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "⚠️  node_modules not found. Installing dependencies..."
    npm install
fi

# Run the seed script
npx ts-node -r tsconfig-paths/register src/database/seeds/initial-seed.ts

echo ""
echo "✅ Done!"

