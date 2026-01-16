#!/bin/bash

#############################################
# WhatsApp Auto-Answer - Deploy Script
# Deploy via SSH to remote server
#############################################

set -e  # Exit on error

# Configuration
SERVER_USER="root"
SERVER_HOST="103.199.187.188"
SERVER_PATH="/opt/whatsapp-auto-answer"
SSH_KEY=""  # Leave empty to use default SSH key, or set path like: ~/.ssh/id_rsa

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if rsync is available
check_rsync() {
    if ! command -v rsync &> /dev/null; then
        log_error "rsync is not installed. Please install it first."
        log_info "Ubuntu/Debian: sudo apt-get install rsync"
        log_info "macOS: brew install rsync"
        exit 1
    fi
}

# Build SSH command
build_ssh_cmd() {
    if [ -n "$SSH_KEY" ]; then
        echo "ssh -i $SSH_KEY"
    else
        echo "ssh"
    fi
}

# Build rsync SSH option
build_rsync_ssh() {
    if [ -n "$SSH_KEY" ]; then
        echo "ssh -i $SSH_KEY"
    else
        echo "ssh"
    fi
}

# Test SSH connection
test_connection() {
    log_info "Testing SSH connection to $SERVER_USER@$SERVER_HOST..."

    SSH_CMD=$(build_ssh_cmd)
    if $SSH_CMD -o ConnectTimeout=10 -o BatchMode=yes $SERVER_USER@$SERVER_HOST "echo 'Connection successful'" &> /dev/null; then
        log_success "SSH connection successful"
        return 0
    else
        log_error "Cannot connect to server. Please check:"
        log_info "  1. Server is reachable: ping $SERVER_HOST"
        log_info "  2. SSH service is running on the server"
        log_info "  3. SSH key is properly configured"
        log_info "  4. Port 22 is open in firewall"
        exit 1
    fi
}

# Check if Docker is installed on remote server
check_remote_docker() {
    log_info "Checking Docker installation on remote server..."

    SSH_CMD=$(build_ssh_cmd)
    if $SSH_CMD $SERVER_USER@$SERVER_HOST "command -v docker &> /dev/null"; then
        log_success "Docker is installed on remote server"
    else
        log_error "Docker is not installed on remote server"
        log_info "Please install Docker first:"
        log_info "  curl -fsSL https://get.docker.com | sh"
        exit 1
    fi

    if $SSH_CMD $SERVER_USER@$SERVER_HOST "command -v docker-compose &> /dev/null || docker compose version &> /dev/null"; then
        log_success "Docker Compose is available on remote server"
    else
        log_error "Docker Compose is not installed on remote server"
        log_info "Please install Docker Compose"
        exit 1
    fi
}

# Create remote directory structure
setup_remote_directories() {
    log_info "Setting up remote directories..."

    SSH_CMD=$(build_ssh_cmd)
    $SSH_CMD $SERVER_USER@$SERVER_HOST "mkdir -p $SERVER_PATH/data/{.wwebjs_auth,logs}"

    log_success "Remote directories created"
}

# Sync files to remote server
sync_files() {
    log_info "Syncing files to remote server..."

    RSYNC_SSH=$(build_rsync_ssh)

    # Sync application files (exclude data directories, node_modules, git)
    rsync -avz --delete \
        -e "$RSYNC_SSH" \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude '.wwebjs_auth' \
        --exclude '.wwebjs_cache' \
        --exclude 'data' \
        --exclude 'logs' \
        --exclude '.env' \
        --exclude '*.log' \
        --progress \
        ./ $SERVER_USER@$SERVER_HOST:$SERVER_PATH/

    log_success "Files synced successfully"
}

# Create .env file on remote server if it doesn't exist
setup_env_file() {
    log_info "Checking .env file on remote server..."

    SSH_CMD=$(build_ssh_cmd)

    # Check if .env exists
    if $SSH_CMD $SERVER_USER@$SERVER_HOST "[ -f $SERVER_PATH/.env ]"; then
        log_warning ".env file already exists on remote server. Skipping..."
    else
        log_info "Creating .env file on remote server..."
        $SSH_CMD $SERVER_USER@$SERVER_HOST "cat > $SERVER_PATH/.env" << 'EOF'
# WhatsApp Auto-Answer Configuration

# Bot Configuration
BOT_NAME=Assistente Virtual
WELCOME_DELAY_MS=1000

# Server Configuration
PORT=3000
HOST=0.0.0.0

# Session
SESSION_NAME=whatsapp-session

# Logging
LOG_LEVEL=info
EOF
        log_success ".env file created"
    fi
}

# Deploy application
deploy() {
    log_info "Building and starting containers on remote server..."

    SSH_CMD=$(build_ssh_cmd)

    # Execute deployment commands on remote server
    $SSH_CMD $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && \
        echo '==> Stopping existing containers...' && \
        (docker-compose down 2>/dev/null || docker compose down 2>/dev/null || true) && \
        echo '==> Building new image...' && \
        (docker-compose build --no-cache 2>/dev/null || docker compose build --no-cache 2>/dev/null) && \
        echo '==> Starting containers...' && \
        (docker-compose up -d 2>/dev/null || docker compose up -d 2>/dev/null) && \
        echo '==> Deployment completed!' && \
        sleep 5 && \
        echo '==> Container status:' && \
        docker ps | grep whatsapp-auto-answer"

    log_success "Application deployed successfully"
}

# Show status
show_status() {
    log_info "Checking application status..."

    SSH_CMD=$(build_ssh_cmd)
    $SSH_CMD $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && docker-compose ps 2>/dev/null || docker compose ps 2>/dev/null"
}

# Show logs
show_logs() {
    log_info "Showing application logs (last 50 lines)..."
    log_info "Press Ctrl+C to exit log view"
    echo ""

    SSH_CMD=$(build_ssh_cmd)
    $SSH_CMD $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && (docker-compose logs --tail=50 -f 2>/dev/null || docker compose logs --tail=50 -f 2>/dev/null)"
}

# Main deployment process
main() {
    echo ""
    log_info "=========================================="
    log_info "WhatsApp Auto-Answer - Deployment Script"
    log_info "=========================================="
    echo ""
    log_info "Target: $SERVER_USER@$SERVER_HOST:$SERVER_PATH"
    echo ""

    # Pre-flight checks
    check_rsync
    test_connection
    check_remote_docker

    # Setup
    setup_remote_directories

    # Deploy
    sync_files
    setup_env_file
    deploy

    # Status
    echo ""
    show_status

    echo ""
    log_success "=========================================="
    log_success "Deployment completed successfully!"
    log_success "=========================================="
    echo ""
    log_info "Access the web interface at: http://$SERVER_HOST:3000"
    echo ""
    log_info "Useful commands:"
    log_info "  View logs:    ./deploy.sh logs"
    log_info "  Check status: ./deploy.sh status"
    log_info "  Restart:      ./deploy.sh restart"
    echo ""

    # Ask if user wants to see logs
    read -p "Do you want to see the logs now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        show_logs
    fi
}

# Handle script arguments
case "${1:-}" in
    logs)
        show_logs
        ;;
    status)
        SSH_CMD=$(build_ssh_cmd)
        $SSH_CMD $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && (docker-compose ps 2>/dev/null || docker compose ps 2>/dev/null) && echo '' && (docker-compose logs --tail=20 2>/dev/null || docker compose logs --tail=20 2>/dev/null)"
        ;;
    restart)
        log_info "Restarting application..."
        SSH_CMD=$(build_ssh_cmd)
        $SSH_CMD $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && (docker-compose restart 2>/dev/null || docker compose restart 2>/dev/null)"
        log_success "Application restarted"
        ;;
    stop)
        log_info "Stopping application..."
        SSH_CMD=$(build_ssh_cmd)
        $SSH_CMD $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && (docker-compose down 2>/dev/null || docker compose down 2>/dev/null)"
        log_success "Application stopped"
        ;;
    help|--help|-h)
        echo "Usage: ./deploy.sh [command]"
        echo ""
        echo "Commands:"
        echo "  (no args)  - Full deployment"
        echo "  logs       - Show application logs"
        echo "  status     - Show application status"
        echo "  restart    - Restart the application"
        echo "  stop       - Stop the application"
        echo "  help       - Show this help message"
        ;;
    *)
        main
        ;;
esac
