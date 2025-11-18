#!/bin/bash

################################################################################
# IFC-OpenWorld Development Environment Startup Script
#
# This script starts all services required for development:
# - Docker Compose (PostgreSQL, Redis, MinIO, IFC Processor, ClamAV)
# - Backend API server (Node.js + Express)
# - Frontend dev server (Vite + React)
#
# Usage: ./start-dev.sh
# Stop: Press Ctrl+C to stop all services gracefully
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ASCII Art Banner
echo -e "${CYAN}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║      ██╗███████╗ ██████╗     ██████╗ ██████╗ ███████╗███╗   ██╗
║      ██║██╔════╝██╔════╝    ██╔═══██╗██╔══██╗██╔════╝████╗  ██║
║      ██║█████╗  ██║         ██║   ██║██████╔╝█████╗  ██╔██╗ ██║
║      ██║██╔══╝  ██║         ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║
║      ██║██║     ╚██████╗    ╚██████╔╝██║     ███████╗██║ ╚████║
║      ╚═╝╚═╝      ╚═════╝     ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝
║                                                              ║
║               WORLD Development Environment                  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✔ ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${NC} $1"
}

print_error() {
    echo -e "${RED}✗ ${NC} $1"
}

print_step() {
    echo -e "${MAGENTA}▶ ${NC} $1"
}

# Trap Ctrl+C and cleanup
cleanup() {
    echo ""
    print_warning "Received interrupt signal. Shutting down gracefully..."

    # Kill background processes
    if [ ! -z "$FRONTEND_PID" ]; then
        print_step "Stopping frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null || true
    fi

    if [ ! -z "$BACKEND_PID" ]; then
        print_step "Stopping backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null || true
    fi

    print_step "Stopping Docker services..."
    docker-compose down

    print_success "All services stopped. Goodbye!"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Ensure script runs from its own directory (handles WSL invoked from PowerShell)
# If the script is executed while the current working directory is different
# (WSL defaulting to the Linux home), switch to the script's directory or
# a parent that contains `docker-compose.yml`.
SCRIPT_PATH="$(realpath "${BASH_SOURCE[0]}" 2>/dev/null || readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || printf '%s\n' "${BASH_SOURCE[0]}")"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" >/dev/null 2>&1 && pwd || printf '%s\n' ".")"
if [ -n "$SCRIPT_DIR" ]; then
    if [ -f "$SCRIPT_DIR/docker-compose.yml" ]; then
        print_step "Switching to script directory: $SCRIPT_DIR"
        cd "$SCRIPT_DIR"
    else
        # Try searching up a few parent directories for docker-compose.yml
        SEARCH_DIR="$SCRIPT_DIR"
        FOUND=""
        for i in 1 2 3 4 5; do
            if [ -f "$SEARCH_DIR/docker-compose.yml" ]; then
                FOUND="$SEARCH_DIR"
                break
            fi
            SEARCH_DIR="$(dirname "$SEARCH_DIR")"
        done
        if [ -n "$FOUND" ]; then
            print_step "Found docker-compose.yml in parent: $FOUND"
            cd "$FOUND"
        else
            print_warning "docker-compose.yml not found in script dir; will check current directory."
        fi
    fi
fi

# Check if Docker is running
print_step "Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi
print_success "Docker is running"

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml not found. Are you in the project root?"
    exit 1
fi

# Check if backend and frontend directories exist
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    print_error "backend or frontend directory not found"
    exit 1
fi

# Step 1: Start Docker Compose services
print_step "Starting Docker services (PostgreSQL, Redis, MinIO, IFC Processor, ClamAV)..."
docker-compose up -d

# Wait for services to be healthy
print_info "Waiting for services to be ready..."
sleep 5

# Check PostgreSQL
print_step "Checking PostgreSQL..."
max_attempts=30
attempt=0
until docker-compose exec -T postgres pg_isready -U ifc_user > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        print_error "PostgreSQL failed to start after 30 seconds"
        docker-compose logs postgres
        exit 1
    fi
    echo -n "."
    sleep 1
done
echo ""
print_success "PostgreSQL is ready"

# Check Redis
print_step "Checking Redis..."
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    print_success "Redis is ready"
else
    print_warning "Redis might not be fully ready yet, continuing anyway..."
fi

# Check MinIO
print_step "Checking MinIO..."
if curl -s http://localhost:9000/minio/health/live > /dev/null 2>&1; then
    print_success "MinIO is ready"
else
    print_warning "MinIO might not be fully ready yet, continuing anyway..."
fi

print_success "All Docker services started successfully!"
echo ""
print_info "Docker services available at:"
echo "  - PostgreSQL:  localhost:5433 (user: ifc_user, db: ifc_openworld)"
echo "  - Redis:       localhost:6379"
echo "  - MinIO API:   http://localhost:9000 (user: minioadmin)"
echo "  - MinIO UI:    http://localhost:9001"
echo ""

# Step 2: Check if backend dependencies are installed
print_step "Checking backend dependencies..."
if [ ! -d "backend/node_modules" ]; then
    print_warning "Backend dependencies not found. Installing..."
    cd backend
    npm install
    cd ..
    print_success "Backend dependencies installed"
else
    print_success "Backend dependencies already installed"
fi

# Step 3: Start Backend
print_step "Starting Backend API server..."
cd backend

# Check if .env exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found in backend. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success "Created .env from .env.example"
    else
        print_error ".env.example not found. Please create .env manually."
        exit 1
    fi
fi

# Start backend in background
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

sleep 3

# Check if backend started successfully
if kill -0 $BACKEND_PID 2>/dev/null; then
    print_success "Backend started (PID: $BACKEND_PID)"
    print_info "Backend API: http://localhost:3001"
    print_info "Backend logs: tail -f backend.log"
else
    print_error "Backend failed to start. Check backend.log for details."
    tail -20 backend.log
    cleanup
    exit 1
fi

echo ""

# Step 4: Check if frontend dependencies are installed
print_step "Checking frontend dependencies..."
if [ ! -d "frontend/node_modules" ]; then
    print_warning "Frontend dependencies not found. Installing..."
    cd frontend
    npm install
    cd ..
    print_success "Frontend dependencies installed"
else
    print_success "Frontend dependencies already installed"
fi

# Step 5: Start Frontend
print_step "Starting Frontend dev server..."
cd frontend

# Check if .env exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found in frontend. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success "Created .env from .env.example"
    else
        print_error ".env.example not found. Please create .env manually."
        cleanup
        exit 1
    fi
fi

# Start frontend in background
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

sleep 3

# Check if frontend started successfully
if kill -0 $FRONTEND_PID 2>/dev/null; then
    print_success "Frontend started (PID: $FRONTEND_PID)"
    print_info "Frontend URL: http://localhost:5173"
    print_info "Frontend logs: tail -f frontend.log"
else
    print_error "Frontend failed to start. Check frontend.log for details."
    tail -20 frontend.log
    cleanup
    exit 1
fi

# Success message
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                              ║${NC}"
echo -e "${GREEN}║              🚀  ALL SERVICES STARTED SUCCESSFULLY! 🚀        ║${NC}"
echo -e "${GREEN}║                                                              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}📍 Quick Links:${NC}"
echo -e "   Frontend:         ${YELLOW}http://localhost:5173${NC}"
echo -e "   Backend API:      ${YELLOW}http://localhost:3001${NC}"
echo -e "   MinIO Console:    ${YELLOW}http://localhost:9001${NC} (minioadmin/minioadmin)"
echo -e "   API Health:       ${YELLOW}http://localhost:3001/api/v1/health${NC}"
echo ""
echo -e "${CYAN}📊 Monitoring:${NC}"
echo -e "   Backend logs:     ${YELLOW}tail -f backend.log${NC}"
echo -e "   Frontend logs:    ${YELLOW}tail -f frontend.log${NC}"
echo -e "   Docker logs:      ${YELLOW}docker-compose logs -f${NC}"
echo ""
echo -e "${CYAN}🛑 Stop Services:${NC}"
echo -e "   Press ${RED}Ctrl+C${NC} to stop all services gracefully"
echo ""
echo -e "${GREEN}Happy coding! 🎨${NC}"
echo ""

# Follow logs (combined)
print_info "Following logs (Ctrl+C to stop)..."
echo ""

# Create a named pipe for log aggregation
LOG_PIPE=$(mktemp -u)
mkfifo "$LOG_PIPE"

# Function to cleanup pipe on exit
cleanup_pipe() {
    rm -f "$LOG_PIPE"
}
trap cleanup_pipe EXIT

# Tail logs to the pipe with prefixes
tail -f backend.log 2>/dev/null | sed 's/^/[BACKEND]  /' >> "$LOG_PIPE" &
TAIL_BACKEND=$!

tail -f frontend.log 2>/dev/null | sed 's/^/[FRONTEND] /' >> "$LOG_PIPE" &
TAIL_FRONTEND=$!

# Display aggregated logs
cat "$LOG_PIPE" &
CAT_PID=$!

# Wait for interrupt
wait $CAT_PID

# Cleanup will be called by trap
