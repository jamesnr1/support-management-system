#!/bin/bash

# Support Management System Deployment Script
# This script handles the complete deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
DOCKER_COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

# Functions
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

check_requirements() {
    log_info "Checking deployment requirements..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if .env file exists
    if [ ! -f "$ENV_FILE" ]; then
        log_error ".env file not found. Please create it from env_example.txt"
        exit 1
    fi
    
    log_success "All requirements met"
}

run_tests() {
    log_info "Running tests..."
    
    # Backend tests
    if [ -d "$BACKEND_DIR" ]; then
        log_info "Running backend tests..."
        cd "$BACKEND_DIR"
        if [ -f "requirements.txt" ]; then
            python -m pytest --cov=. --cov-report=html || {
                log_error "Backend tests failed"
                exit 1
            }
        fi
        cd ..
    fi
    
    # Frontend tests
    if [ -d "$FRONTEND_DIR" ]; then
        log_info "Running frontend tests..."
        cd "$FRONTEND_DIR"
        if [ -f "package.json" ]; then
            yarn test --coverage --watchAll=false || {
                log_error "Frontend tests failed"
                exit 1
            }
        fi
        cd ..
    fi
    
    log_success "All tests passed"
}

build_images() {
    log_info "Building Docker images..."
    
    docker-compose -f "$DOCKER_COMPOSE_FILE" build --no-cache
    
    log_success "Docker images built successfully"
}

deploy_services() {
    log_info "Deploying services..."
    
    # Stop existing services
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    
    # Start services
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    log_success "Services deployed successfully"
}

wait_for_health() {
    log_info "Waiting for services to be healthy..."
    
    # Wait for backend to be healthy
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T backend python scripts/health_check.py > /dev/null 2>&1; then
            log_success "Backend is healthy"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "Backend failed to become healthy after $max_attempts attempts"
            exit 1
        fi
        
        log_info "Waiting for backend to be healthy... (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
}

run_security_audit() {
    log_info "Running security audit..."
    
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T backend python scripts/security_audit.py; then
        log_success "Security audit passed"
    else
        log_warning "Security audit found issues. Check the output above."
    fi
}

run_performance_test() {
    log_info "Running performance tests..."
    
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T backend python scripts/performance_test.py; then
        log_success "Performance tests passed"
    else
        log_warning "Performance tests found issues. Check the output above."
    fi
}

show_status() {
    log_info "Deployment Status:"
    echo ""
    
    # Show running containers
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps
    
    echo ""
    log_info "Service URLs:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend API: http://localhost:8000"
    echo "  Health Check: http://localhost:8000/health"
    echo "  Grafana: http://localhost:3001 (admin/admin)"
    echo "  Prometheus: http://localhost:9090"
    
    echo ""
    log_info "Useful Commands:"
    echo "  View logs: docker-compose -f $DOCKER_COMPOSE_FILE logs -f"
    echo "  Stop services: docker-compose -f $DOCKER_COMPOSE_FILE down"
    echo "  Restart services: docker-compose -f $DOCKER_COMPOSE_FILE restart"
}

cleanup() {
    log_info "Cleaning up..."
    
    # Remove unused Docker images
    docker image prune -f
    
    log_success "Cleanup completed"
}

# Main deployment function
main() {
    log_info "Starting Support Management System deployment..."
    
    # Parse command line arguments
    SKIP_TESTS=false
    SKIP_AUDIT=false
    SKIP_PERFORMANCE=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-audit)
                SKIP_AUDIT=true
                shift
                ;;
            --skip-performance)
                SKIP_PERFORMANCE=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --skip-tests        Skip running tests"
                echo "  --skip-audit        Skip security audit"
                echo "  --skip-performance  Skip performance tests"
                echo "  --help              Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run deployment steps
    check_requirements
    
    if [ "$SKIP_TESTS" = false ]; then
        run_tests
    else
        log_warning "Skipping tests"
    fi
    
    build_images
    deploy_services
    wait_for_health
    
    if [ "$SKIP_AUDIT" = false ]; then
        run_security_audit
    else
        log_warning "Skipping security audit"
    fi
    
    if [ "$SKIP_PERFORMANCE" = false ]; then
        run_performance_test
    else
        log_warning "Skipping performance tests"
    fi
    
    cleanup
    show_status
    
    log_success "Deployment completed successfully!"
    log_info "Your Support Management System is now running and ready to use."
}

# Run main function
main "$@"
