# Start from official Ganache CLI image
FROM trufflesuite/ganache-cli:latest

# Set working directory
WORKDIR /workspace

# Install necessary build tools
RUN apk add --no-cache python3 py3-pip make g++ bash


# Install Truffle globally
RUN npm install -g truffle

# Copy project files into the container
COPY . .

EXPOSE 7545

# Compile and deploy smart contracts to docker network
CMD truffle compile && truffle migrate --network docker && tail -f /dev/null