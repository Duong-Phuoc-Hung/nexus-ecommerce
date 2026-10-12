#!/usr/bin/env bash
# ==============================================================================
# Project Nexus - Build & Tag All Microservice Docker Images
# ==============================================================================
set -euo pipefail

REGISTRY="${CI_REGISTRY_IMAGE:-nexus}"
TAG="${CI_COMMIT_SHORT_SHA:-latest}"

SERVICES=(
  "api-gateway"
  "user-service"
  "catalog-service"
  "commerce-service"
  "auction-service"
  "fulfillment-service"
  "notification-service"
)

echo "=============================================================================="
echo "🐳 Building all 7 Nexus Microservices Docker Images"
echo "Registry: ${REGISTRY}"
echo "Tag:      ${TAG}"
echo "=============================================================================="

for SERVICE in "${SERVICES[@]}"; do
  echo ""
  echo "🔨 Building [${SERVICE}]..."
  IMAGE_NAME="${REGISTRY}/${SERVICE}"
  
  docker build \
    -f "backend/${SERVICE}/Dockerfile" \
    -t "${IMAGE_NAME}:${TAG}" \
    -t "${IMAGE_NAME}:latest" \
    .
    
  echo "✅ Built ${IMAGE_NAME}:${TAG} and ${IMAGE_NAME}:latest"
done

echo ""
echo "=============================================================================="
echo "🎉 All 7 images built successfully!"
echo "=============================================================================="
