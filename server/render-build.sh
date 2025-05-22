set -o errexit

echo "====== Starting Render Build Process ======"

echo "Node version:"
node --version

echo "NPM version:"
npm --version

echo "Installing dependencies..."
npm install --force

echo "Installing type definitions..."
npm install --save-dev @types/cookie-parser @types/cors @types/swagger-ui-express

echo "Creating build directory..."
mkdir -p dist

echo "Creating type declaration directory if not exists..."
mkdir -p src/types

echo "Creating fallback type declarations..."
echo "declare module 'cookie-parser';" > src/types/cookie-parser.d.ts
echo "declare module 'cors';" > src/types/cors.d.ts
echo "declare module 'swagger-ui-express';" > src/types/swagger-ui-express.d.ts

echo "Building project..."
npm run build

echo "Pruning dev dependencies for production..."
npm prune --production

echo "Creating required directories..."
node dist/scripts/create-directories.js || echo "No create-directories script found, skipping"

echo "====== Build completed successfully! ======"