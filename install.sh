#!/bin/bash

set -e

echo "=========================================="
echo "BlockChess Installation Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Check if Docker is installed
check_docker() {
    echo "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        echo "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    print_success "Docker is installed: $(docker --version)"
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    print_success "Docker Compose is available"
}

# Check if .env file exists, if not create from template
setup_env_file() {
    echo ""
    echo "Setting up environment variables..."
    
    if [ -f .env ]; then
        print_warning ".env file already exists. Skipping creation."
        print_info "Please verify your .env file contains all required variables."
    else
        print_info "Creating .env file from template..."
        cat > .env << 'EOF'
# Database Configuration
DATABASE_TYPE=postgres
POSTGRES_DB=blockchess_db
POSTGRES_PORT=5434
POSTGRES_USER=blockchess
POSTGRES_PASSWORD=blochess_password
POSTGRES_SSL=false

# Application Configuration
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3050

# SUI Blockchain Configuration
NEXT_PUBLIC_SUI_NETWORK_TYPE=localnet
NEXT_PUBLIC_SUI_NETWORK_GRAPHQL_URL=http://127.0.0.1:9125/graphql
SUI_NETWORK_URL=http://127.0.0.1:9000
SUI_NETWORK_MODULE=game
NEXT_PUBLIC_SUI_NETWORK_LOCALNET_PACKAGE_ID=0x39c62a7fc9e67b3642f110991315d68bba52d8020c1e6600bcedccdfc6991edb
NEXT_PUBLIC_SUI_NETWORK_LOCALNET_BADGE_REGISTRY_ID=
NEXT_PUBLIC_SUI_NETWORK_TESTNET_PACKAGE_ID=
NEXT_PUBLIC_SUI_NETWORK_TESTNET_BADGE_REGISTRY_ID=
NEXT_PUBLIC_SUI_NETWORK_MAINNET_PACKAGE_ID=
NEXT_PUBLIC_SUI_NETWORK_MAINNET_BADGE_REGISTRY_ID=
NEXT_PUBLIC_HAL_ID=computer-player
SUI_PRIVATE_KEY=9cc7958e8e6291b2b4c7c54ed325dd302579bbd4073ff2a89d5ace94a4d69b73
MINT_QUEUE_DELAY_MS=1000
EOF
        print_success ".env file created"
        print_warning "Please edit .env file with your actual configuration values before continuing!"
        echo ""
        read -p "Press Enter to continue after editing .env file, or Ctrl+C to exit..."
    fi
}

# Pull Docker images and build
build_images() {
    echo ""
    echo "Building Docker images..."
    docker compose build
    print_success "Docker images built successfully"
}

# Start services
start_services() {
    echo ""
    echo "Starting services..."
    docker compose up -d
    print_success "Services started"
}

# Wait for PostgreSQL to be ready
wait_for_postgres() {
    echo ""
    echo "Waiting for PostgreSQL to be ready..."
    max_attempts=30
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker compose exec -T postgres pg_isready -U blockchess > /dev/null 2>&1; then
            print_success "PostgreSQL is ready"
            return 0
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    print_error "PostgreSQL did not become ready in time"
    return 1
}

# Initialize database schema
initialize_database() {
    echo ""
    echo "Initializing database schema..."
    
    if docker compose exec -T postgres psql -U blockchess -d blockchess_db -c "\dt" | grep -q "players"; then
        print_warning "Database schema appears to already exist. Skipping initialization."
    else
        print_info "Running database schema initialization..."
        docker compose exec -T postgres psql -U blockchess -d blockchess_db -f /docker-entrypoint-initdb.d/schema.sql > /dev/null 2>&1 || {
            print_warning "Schema initialization script may have already run. Checking database..."
            docker compose exec -T postgres psql -U blockchess -d blockchess_db -c "\dt" || {
                print_error "Failed to initialize database schema"
                return 1
            }
        }
        print_success "Database schema initialized"
    fi
}

# Check service health
check_services() {
    echo ""
    echo "Checking service health..."
    
    # Check PostgreSQL
    if docker compose exec -T postgres pg_isready -U blockchess > /dev/null 2>&1; then
        print_success "PostgreSQL is healthy"
    else
        print_error "PostgreSQL is not healthy"
        return 1
    fi
    
    # Check App (wait a bit for it to start)
    sleep 5
    max_attempts=20
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost:3050/api/health > /dev/null 2>&1 || docker compose exec -T app node -e "require('http').get('http://localhost:3050/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" > /dev/null 2>&1; then
            print_success "Application is healthy"
            return 0
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 3
    done
    
    print_warning "Application health check timed out. It may still be starting up."
    print_info "Check logs with: docker compose logs app"
}

# Main installation flow
main() {
    echo "Starting installation process..."
    echo ""
    
    check_docker
    setup_env_file
    build_images
    start_services
    wait_for_postgres
    initialize_database
    check_services
    
    echo ""
    echo "=========================================="
    print_success "Installation completed!"
    echo "=========================================="
    echo ""
    echo "Your BlockChess application is now running!"
    echo ""
    echo "Access the application at: http://localhost:3050"
    echo ""
    echo "Useful commands:"
    echo "  - View logs:        docker compose logs -f"
    echo "  - Stop services:    docker compose down"
    echo "  - Restart services: docker compose restart"
    echo "  - View status:      docker compose ps"
    echo ""
    print_warning "Remember to update your .env file with production values!"
}

# Run main function
main

