# Use Node.js base image
FROM node:18-alpine AS blockchain

# Set working directory
WORKDIR /workspace

# Install necessary build tools
RUN apk add --no-cache python3 py3-pip make g++ bash

# Install Truffle globally
RUN npm install -g truffle

# Copy project files into the container
COPY . .

EXPOSE 7545

# Start Ganache CLI in the background, then run Truffle migration, and keep the container running
CMD truffle compile && truffle migrate --network ganache-local && tail -f /dev/null