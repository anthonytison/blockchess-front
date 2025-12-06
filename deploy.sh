#!/bin/bash

# BlockChess Deployment Script
# Usage: ./deploy.sh [command]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking requirements..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    if [ ! -f .env ]; then
        log_warn ".env file not found"
        if [ -f .env.docker ]; then
            log_info "Copying .env.docker to .env"
            cp .env.docker .env
            log_warn "Please edit .env with your configuration"
            exit 1
        else
            log_error "No environment file found"
            exit 1
        fi
    fi
    
    log_info "Requirements check passed"
}

build() {
    log_info "Building Docker image..."
    docker-compose build --no-cache
    log_info "Build completed"
}

start() {
    log_info "Starting services..."
    docker-compose up -d
    log_info "Services started"
    
    log_info "Waiting for services to be healthy..."
    sleep 10
    
    if docker-compose ps | grep -q "Up"; then
        log_info "Services are running"
        docker-compose ps
    else
        log_error "Services failed to start"
        docker-compose logs
        exit 1
    fi
}

stop() {
    log_info "Stopping services..."
    docker-compose stop
    log_info "Services stopped"
}

restart() {
    log_info "Restarting services..."
    docker-compose restart
    log_info "Services restarted"
}

down() {
    log_info "Removing services..."
    docker-compose down
    log_info "Services removed"
}

logs() {
    docker-compose logs -f "${2:-app}"
}

migrate() {
    log_info "Running database migrations..."
    docker-compose exec app node scripts/migrate.js
    log_info "Migrations completed"
}

backup() {
    BACKUP_DIR="./backups"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    
    mkdir -p "$BACKUP_DIR"
    
    log_info "Creating backup..."
    
    # Backup PostgreSQL
    if docker-compose ps postgres | grep -q "Up"; then
        log_info "Backing up PostgreSQL database..."
        docker-compose exec -T postgres pg_dump -U blockchess blockchess_db > "$BACKUP_DIR/postgres_$TIMESTAMP.sql"
        log_info "PostgreSQL backup saved to $BACKUP_DIR/postgres_$TIMESTAMP.sql"
    fi
    
    # Backup volumes
    log_info "Backing up volumes..."
    docker run --rm \
        -v blockchess_postgres-data:/data \
        -v "$(pwd)/$BACKUP_DIR":/backup \
        alpine tar czf "/backup/volumes_$TIMESTAMP.tar.gz" /data
    
    log_info "Backup completed"
}

restore() {
    if [ -z "$2" ]; then
        log_error "Please specify backup file: ./deploy.sh restore <backup-file>"
        exit 1
    fi
    
    BACKUP_FILE="$2"
    
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    
    log_warn "This will restore the database from backup. Continue? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        log_info "Restore cancelled"
        exit 0
    fi
    
    log_info "Restoring database from $BACKUP_FILE..."
    cat "$BACKUP_FILE" | docker-compose exec -T postgres psql -U blockchess blockchess_db
    log_info "Restore completed"
}

health() {
    log_info "Checking health..."
    
    # Check containers
    docker-compose ps
    
    # Check application health endpoint
    if curl -f http://localhost:3050/api/health &> /dev/null; then
        log_info "Application health check: OK"
    else
        log_error "Application health check: FAILED"
    fi
}

clean() {
    log_warn "This will remove all containers, volumes, and images. Continue? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        log_info "Clean cancelled"
        exit 0
    fi
    
    log_info "Cleaning up..."
    docker-compose down -v
    docker system prune -af
    log_info "Cleanup completed"
}

update() {
    log_info "Updating application..."
    
    # Pull latest code
    log_info "Pulling latest code..."
    git pull origin main
    
    # Pull latest images
    log_info "Pulling latest Docker images..."
    docker-compose pull
    
    # Rebuild
    log_info "Rebuilding..."
    docker-compose build
    
    # Restart services
    log_info "Restarting services..."
    docker-compose up -d
    
    # Run migrations
    log_info "Running migrations..."
    sleep 5
    docker-compose exec app node scripts/migrate.js
    
    log_info "Update completed"
}

shell() {
    SERVICE="${2:-app}"
    log_info "Opening shell in $SERVICE container..."
    docker-compose exec "$SERVICE" sh
}

stats() {
    log_info "Container statistics:"
    docker stats --no-stream
}

usage() {
    cat << EOF
BlockChess Deployment Script

Usage: ./deploy.sh [command]

Commands:
    build       Build Docker images
    start       Start all services
    stop        Stop all services
    restart     Restart all services
    down        Stop and remove all services
    logs        View logs (optional: specify service name)
    migrate     Run database migrations
    backup      Create database backup
    restore     Restore database from backup
    health      Check service health
    clean       Remove all containers, volumes, and images
    update      Update application (pull, rebuild, restart)
    shell       Open shell in container (optional: specify service name)
    stats       Show container statistics
    help        Show this help message

Examples:
    ./deploy.sh start
    ./deploy.sh logs app
    ./deploy.sh backup
    ./deploy.sh restore ./backups/postgres_20240101_120000.sql
    ./deploy.sh shell postgres

EOF
}

# Main
case "${1:-help}" in
    build)
        check_requirements
        build
        ;;
    start)
        check_requirements
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    down)
        down
        ;;
    logs)
        logs "$@"
        ;;
    migrate)
        migrate
        ;;
    backup)
        backup
        ;;
    restore)
        restore "$@"
        ;;
    health)
        health
        ;;
    clean)
        clean
        ;;
    update)
        check_requirements
        update
        ;;
    shell)
        shell "$@"
        ;;
    stats)
        stats
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        log_error "Unknown command: $1"
        usage
        exit 1
        ;;
esac
