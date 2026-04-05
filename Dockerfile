FROM node:20

WORKDIR /app

# Copy the root package.json mapping
COPY package.json ./

# Copy client and server package configurations
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install dependencies
RUN cd client && npm install
RUN cd server && npm install

# Copy source code
COPY . .

# Build the client for production
RUN npm run build --prefix client

# Expose port 3000 where the Express server runs
EXPOSE 3000

# Set environment variables for the database path
# We map it to /app/data so we can persist it via a volume easily
ENV DB_PATH=/app/data/movies.db
ENV PORT=3000

# Start the Node.js server
CMD ["npm", "start"]
