#!/bin/bash
#
# School Portal VM Setup Script
# Run this script ON THE VM after SSH'ing in
#
# Usage: bash vm-setup.sh
#

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  School Portal VM Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Step 1: Update system
echo -e "${BLUE}[1/8] Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common git vim htop

# Step 2: Install Docker
echo -e "${BLUE}[2/8] Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    echo -e "${GREEN}✓ Docker installed${NC}"
else
    echo -e "${YELLOW}Docker already installed${NC}"
fi

# Step 3: Add user to docker group
echo -e "${BLUE}[3/8] Configuring Docker permissions...${NC}"
sudo usermod -aG docker $USER
echo -e "${YELLOW}NOTE: You'll need to logout and login again for docker group to take effect${NC}"

# Step 4: Install Docker Compose
echo -e "${BLUE}[4/8] Installing Docker Compose...${NC}"
if ! docker compose version &> /dev/null; then
    sudo apt install -y docker-compose-plugin
    echo -e "${GREEN}✓ Docker Compose installed${NC}"
else
    echo -e "${YELLOW}Docker Compose already installed${NC}"
fi

# Step 5: Configure Docker
echo -e "${BLUE}[5/8] Configuring Docker logging...${NC}"
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

sudo systemctl restart docker
echo -e "${GREEN}✓ Docker configured${NC}"

# Step 6: Clone repository
echo -e "${BLUE}[6/8] Cloning repository...${NC}"
cd ~
if [ -d "concetrateaiquiz" ]; then
    echo -e "${YELLOW}Repository already exists, pulling latest...${NC}"
    cd concetrateaiquiz
    git pull origin main
else
    git clone https://github.com/BrianDai22/concetrateaiquiz.git
    cd concetrateaiquiz
    echo -e "${GREEN}✓ Repository cloned${NC}"
fi

# Step 7: Verify installation
echo -e "${BLUE}[7/8] Verifying installations...${NC}"
echo "Docker version: $(docker --version)"
echo "Docker Compose version: $(docker compose version)"
echo "Git version: $(git --version)"

# Step 8: Display next steps
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT: Logout and login again for docker group to take effect${NC}"
echo ""
echo "To logout: ${GREEN}exit${NC}"
echo "To login: ${GREEN}gcloud compute ssh school-portal-vm --zone=us-central1-a${NC}"
echo ""
echo -e "${BLUE}After logging back in, run:${NC}"
echo "  ${GREEN}cd ~/concetrateaiquiz${NC}"
echo "  ${GREEN}bash deployment/configure-production.sh${NC}"
echo ""
