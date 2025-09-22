# server/Dockerfile (FINAL, CORRECTED VERSION)

# Use a MODERN Node.js runtime as a parent image (THE FIX IS HERE)
FROM node:20-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Install system dependencies, including FFmpeg
# This is the key step that replaces the buildpack
RUN apt-get update && apt-get install -y ffmpeg

# Copy package.json and package-lock.json
# This caches our dependencies for faster builds
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of your application code into the container
COPY . .

# Your app binds to port 5000, so expose it
EXPOSE 5000

# Define the command to run your app
CMD [ "node", "server.js" ]