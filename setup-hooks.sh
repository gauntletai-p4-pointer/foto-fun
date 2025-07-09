#!/bin/bash

# Setup script to configure git hooks for the project

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up git hooks for quality control...${NC}"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Not in a git repository. Please run this from the project root.${NC}"
    exit 1
fi

# Create .githooks directory if it doesn't exist
if [ ! -d ".githooks" ]; then
    mkdir .githooks
    echo -e "${GREEN}Created .githooks directory${NC}"
fi

# Configure git to use our custom hooks directory
git config core.hooksPath .githooks

# Make sure the pre-push hook is executable
if [ -f ".githooks/pre-push" ]; then
    chmod +x .githooks/pre-push
    echo -e "${GREEN}✅ Pre-push hook configured and made executable${NC}"
else
    echo -e "${RED}❌ Pre-push hook not found in .githooks directory${NC}"
    exit 1
fi

# Test if bun is available
if ! command -v bun &> /dev/null; then
    echo -e "${RED}❌ bun is not installed or not in PATH${NC}"
    echo -e "${YELLOW}Please install bun first: https://bun.sh/docs/installation${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Git hooks setup complete!${NC}"
echo -e "${YELLOW}The pre-push hook will now run 'bun lint' and 'bun typecheck' before allowing pushes to main.${NC}"
echo -e "${YELLOW}To bypass the hook in emergency situations, use: git push --no-verify${NC}"
