FROM --platform=linux/amd64 motiadev/motia:latest

# Install Dependencies
COPY package*.json ./
RUN npm ci --only=production

# Move application files
COPY . .

# Setup python steps dependencies
RUN npx motia@latest install

# Expose outside access to the motia project
EXPOSE 3000

# Run your application
CMD ["npm", "run", "start"]
