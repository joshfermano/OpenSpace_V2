#!/bin/bash

# Exit on error
set -e

echo "====== Starting Render Build Process ======"

echo "Node version:"
node --version

echo "NPM version:"
npm --version

echo "Installing dependencies..."
npm install

echo "Running TypeScript build..."
npx tsc -p tsconfig.deploy.json

echo "Creating required directories..."
node dist/scripts/create-directories.js

echo "====== Build completed successfully! ======"