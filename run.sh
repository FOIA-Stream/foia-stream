#!/usr/bin/env bash
#
# FOIA Stream - Development & Production Runner
# Usage: ./run.sh [command]
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Helper functions
log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

# Check dependencies
check_deps() {
    local missing=()

    command -v docker &> /dev/null || missing+=("docker")
    command -v bun &> /dev/null || missing+=("bun")

    if [ ${#missing[@]} -ne 0 ]; then
        log_error "Missing dependencies: ${missing[*]}"
        exit 1
    fi
}

# Setup environment files
setup_env() {
    log_info "Setting up environment files..."

    if [ ! -f "$PROJECT_ROOT/.env.api" ]; then
        if [ -f "$PROJECT_ROOT/.env.api.example" ]; then
            cp "$PROJECT_ROOT/.env.api.example" "$PROJECT_ROOT/.env.api"
            log_warn "Created .env.api from example - please configure it!"
        fi
    fi

    if [ ! -f "$PROJECT_ROOT/.env.anubis" ]; then
        log_warn ".env.anubis not found - using defaults"
    fi

    log_success "Environment files ready"
}

# Build frontend
build_frontend() {
    log_info "Building Astro frontend..."
    cd "$PROJECT_ROOT/apps/astro"
    bun install
    bun run build
    cd "$PROJECT_ROOT"
    log_success "Frontend built"
}

# Build API
build_api() {
    log_info "Building API..."
    cd "$PROJECT_ROOT/apps/api"
    bun install
    bun run build
    cd "$PROJECT_ROOT"
    log_success "API built"
}

# Build shared package (no build needed - exports TS directly)
build_shared() {
    log_info "Installing shared package deps..."
    cd "$PROJECT_ROOT/packages/shared"
    bun install
    cd "$PROJECT_ROOT"
    log_success "Shared package ready"
}

# Build all
build_all() {
    log_info "Building all packages..."
    cd "$PROJECT_ROOT"
    bun install
    build_shared
    build_api
    build_frontend
    log_success "All packages built"
}

# Start Docker stack
docker_up() {
    log_info "Starting Docker stack..."
    cd "$PROJECT_ROOT"
    docker compose up -d
    log_success "Docker stack started"
    echo ""
    log_info "Services:"
    echo "  → Frontend + API: http://localhost:8080 (via Anubis)"
    echo "  → Metrics:        http://localhost:9090"
}

# Stop Docker stack
docker_down() {
    log_info "Stopping Docker stack..."
    cd "$PROJECT_ROOT"
    docker compose down
    log_success "Docker stack stopped"
}

# View logs
docker_logs() {
    cd "$PROJECT_ROOT"
    docker compose logs -f "$@"
}

# Development mode (local, no Docker)
dev() {
    log_info "Starting development servers..."
    cd "$PROJECT_ROOT"

    # Start API in background
    log_info "Starting API server..."
    (cd apps/api && bun run dev) &
    API_PID=$!

    # Start Astro
    log_info "Starting Astro dev server..."
    (cd apps/astro && bun run dev) &
    ASTRO_PID=$!

    # Trap to cleanup on exit
    trap "kill $API_PID $ASTRO_PID 2>/dev/null" EXIT

    log_success "Development servers started"
    echo ""
    log_info "Services:"
    echo "  → Frontend: http://localhost:4321"
    echo "  → API:      http://localhost:3001"
    echo ""
    echo "Press Ctrl+C to stop"

    # Wait for processes
    wait
}

# Full production start
start() {
    check_deps
    setup_env
    build_all
    docker_up
}

# Quick start (skip build if already built)
quick_start() {
    check_deps
    setup_env

    if [ ! -d "$PROJECT_ROOT/apps/astro/dist" ]; then
        log_warn "Frontend not built, building..."
        build_all
    fi

    docker_up
}

# Status
status() {
    cd "$PROJECT_ROOT"
    docker compose ps
}

# Clean everything
clean() {
    log_info "Cleaning build artifacts..."
    rm -rf "$PROJECT_ROOT/apps/astro/dist"
    rm -rf "$PROJECT_ROOT/apps/api/dist"
    rm -rf "$PROJECT_ROOT/packages/shared/dist"
    rm -rf "$PROJECT_ROOT/node_modules"
    log_success "Cleaned"
}

# Help
show_help() {
    echo "FOIA Stream Runner"
    echo ""
    echo "Usage: ./run.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start       Build everything and start Docker stack"
    echo "  quick       Start Docker stack (skip build if already built)"
    echo "  stop        Stop Docker stack"
    echo "  restart     Restart Docker stack"
    echo "  dev         Start local dev servers (no Docker)"
    echo "  build       Build all packages"
    echo "  logs        View Docker logs (add service name for specific)"
    echo "  status      Show Docker container status"
    echo "  clean       Remove build artifacts"
    echo "  help        Show this help"
    echo ""
    echo "Examples:"
    echo "  ./run.sh start        # Full production start"
    echo "  ./run.sh dev          # Local development"
    echo "  ./run.sh logs api     # View API logs"
}

# Main
case "${1:-help}" in
    start)      start ;;
    quick)      quick_start ;;
    stop)       docker_down ;;
    restart)    docker_down && docker_up ;;
    dev)        dev ;;
    build)      build_all ;;
    logs)       shift; docker_logs "$@" ;;
    status)     status ;;
    clean)      clean ;;
    help|*)     show_help ;;
esac
