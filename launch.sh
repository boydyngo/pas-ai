#!/bin/bash

# Load environment variables from .env file
set -a
source .env
set +a

# Build and start the services
docker-compose up -d --build

# Follow logs for monitoring
docker-compose logs -f