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
CMD ["ganache-cli", "--host", "0.0.0.0", "--port", "7545", "--networkId", "5777", "--deterministic"]