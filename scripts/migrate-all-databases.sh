#!/usr/bin/env bash

# =============================================================================
# Project Nexus - Database Migration Shell Script (Unix / Linux / macOS)
# Gọi trực tiếp qua Node.js script để đồng nhất logic cross-platform
# =============================================================================

set -e

node "$(dirname "$0")/migrate-all-databases.js"
