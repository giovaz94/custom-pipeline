#!/bin/bash

# Docker Hub username
USERNAME="lorenzobacchiani"

# List of image names
IMAGES=(
  "entrypoint"
  "parser"
  "virus-scanner"
  "attachment-manager"
  "image-analyzer"
  #"image-recognizer"
  #"nsfw-detector"
  "message-analyzer"
  "text-analyzer"
  "link-analyzer"
  "header-analyzer"
)

# Loop through each image name
for IMAGE in "${IMAGES[@]}"; do
  # Define the full image name
  FULL_IMAGE_NAME="$USERNAME/$IMAGE"

  echo "Building Docker image: $FULL_IMAGE_NAME"

  # Build the Docker image
  docker build -t "$FULL_IMAGE_NAME" "./$IMAGE"

  if [ $? -ne 0 ]; then
    echo "Error building image: $FULL_IMAGE_NAME"
    exit 1
  fi

  echo "Pushing Docker image: $FULL_IMAGE_NAME"

  # Push the Docker image to Docker Hub
  docker push "$FULL_IMAGE_NAME"

  if [ $? -ne 0 ]; then
    echo "Error pushing image: $FULL_IMAGE_NAME"
    exit 1
  fi

  echo "Successfully built and pushed: $FULL_IMAGE_NAME"
done

echo "All images built and pushed successfully!"
