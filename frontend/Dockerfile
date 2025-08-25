FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /workspace

# Copy the package.json and package-lock.json files into the container
COPY package*.json .

# Install the Node.js dependencies
RUN npm install

# Copy the entire frontend code into the container
COPY . .

# Expose port for frontend dev server (usually port 3000)
EXPOSE 3000

# Command to run the frontend development server
CMD ["npm", "run", "dev"]
