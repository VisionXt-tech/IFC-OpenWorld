#!/bin/bash

################################################################################
# IFC-OpenWorld Development Environment Shutdown Script
#
# This script stops all running services:
# - Frontend dev server
# - Backend API server
# - Docker Compose services
#
# Usage: ./stop-dev.sh
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✔ ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${NC} $1"
}

print_step() {
    echo -e "${BLUE}▶ ${NC} $1"
}

echo -e "${YELLOW}"
cat << "EOF"
╔══════════════════════════════════════════════════════════╗
║     Stopping IFC-OpenWorld Development Environment      ║
╚══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Kill frontend processes
print_step "Stopping frontend..."
pkill -f "vite" || print_warning "No frontend process found"
print_success "Frontend stopped"

# Kill backend processes
print_step "Stopping backend..."
pkill -f "tsx.*src/index.ts" || print_warning "No backend process found"
print_success "Backend stopped"

# Stop Docker services
print_step "Stopping Docker services..."
if [ -f "docker-compose.yml" ]; then
    docker-compose down
    print_success "Docker services stopped"
else
    print_warning "docker-compose.yml not found, skipping Docker shutdown"
fi

# Cleanup log files (optional)
if [ -f "backend.log" ]; then
    print_info "Backend log file preserved: backend.log"
fi

if [ -f "frontend.log" ]; then
    print_info "Frontend log file preserved: frontend.log"
fi

echo ""
print_success "All services stopped successfully!"
echo ""
