#!/bin/bash

# This script starts the development server with hot reloading
echo "Starting development server with hot reloading..."
concurrently "npm run dev:server" "npm run dev:client"