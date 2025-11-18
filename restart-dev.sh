#!/bin/bash

################################################################################
# IFC-OpenWorld Development Environment Restart Script
#
# This script restarts all services by:
# 1. Stopping all running services
# 2. Starting them again
#
# Usage: ./restart-dev.sh
################################################################################

set -e

# Colors
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
cat << "EOF"
╔══════════════════════════════════════════════════════════╗
║    Restarting IFC-OpenWorld Development Environment     ║
╚══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Stop services
./stop-dev.sh

# Wait a moment
sleep 2

# Start services
./start-dev.sh
