#!/bin/bash

# Update browser list database
echo "Updating browserslist database..."
npx update-browserslist-db@latest

# Run the server with nodemon for hot reloading
echo "Starting development server with hot reloading..."
npx nodemon --exec tsx server/index.ts
