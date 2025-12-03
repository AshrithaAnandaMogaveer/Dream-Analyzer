#!/bin/bash

echo "Starting Dream Analyzer Development Environment..."
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed or not in PATH"
    exit 1
fi

echo "Node.js version:"
node --version
echo "npm version:"
npm --version
echo

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing server dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Error installing server dependencies"
        exit 1
    fi
fi

if [ ! -d "client/node_modules" ]; then
    echo "Installing client dependencies..."
    cd client
    npm install
    if [ $? -ne 0 ]; then
        echo "Error installing client dependencies"
        exit 1
    fi
    cd ..
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    if [ -f "env.example" ]; then
        cp env.example .env
    else
        echo "Warning: env.example not found. Please create .env manually."
    fi
fi

echo "Starting development servers..."
echo
echo "Backend will run on: http://localhost:5000"
echo "Frontend will run on: http://localhost:3000"
echo
echo "Press Ctrl+C to stop both servers"
echo

# Start both servers concurrently
npm run dev
