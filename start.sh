#!/bin/bash

# File Transfer App Startup Script
echo "🚀 Starting File Transfer App..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js and try again."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm and try again."
    exit 1
fi

echo "✅ Node.js and npm found"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

# Create uploads directory if it doesn't exist
if [ ! -d "uploads" ]; then
    mkdir uploads
    echo "✅ Created uploads directory"
fi

# Check if .env file exists, if not create a basic one
if [ ! -f ".env" ]; then
    echo "⚙️  Creating basic .env file..."
    cat > .env << EOF
PORT=3000
NODE_ENV=development
JWT_SECRET=your-jwt-secret-key-change-this-in-production
MONGODB_URI=mongodb://localhost:27017/filetransfer
MAX_FILE_SIZE=50000000
UPLOAD_DIR=uploads
LINK_EXPIRY_HOURS=24
EOF
    echo "✅ .env file created"
fi

echo "🌐 Starting server on port 3000..."
echo "📱 Access the app at: http://localhost:3000"
echo "🛑 Press Ctrl+C to stop the server"
echo ""

# Start the server
node server.js