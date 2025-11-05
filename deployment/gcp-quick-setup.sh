#!/bin/bash
#
# GCP Quick Setup Script
# Automates Phases 2-4 of the deployment
#
# Usage: ./gcp-quick-setup.sh [PROJECT_ID] [REGION]
#
# Example: ./gcp-quick-setup.sh school-portal-prod us-central1
#

set -e  # Exit on error

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  GCP School Portal - Quick Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}ERROR: gcloud CLI is not installed.${NC}"
    echo "Please install it first:"
    echo "  macOS: brew install google-cloud-sdk"
    echo "  Linux: curl https://sdk.cloud.google.com | bash"
    exit 1
fi

# Get parameters or use defaults
PROJECT_ID=${1:-"school-portal-prod-$(date +%s)"}
REGION=${2:-"us-central1"}
ZONE="${REGION}-a"

echo -e "${YELLOW}Configuration:${NC}"
echo "  Project ID: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Zone: $ZONE"
echo ""

read -p "Continue with this configuration? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 1
fi

echo -e "\n${GREEN}Step 1: Creating GCP Project...${NC}"
gcloud projects create $PROJECT_ID --name="School Portal Production" || {
    echo -e "${YELLOW}Project may already exist, continuing...${NC}"
}

echo -e "\n${GREEN}Step 2: Setting active project...${NC}"
gcloud config set project $PROJECT_ID

echo -e "\n${GREEN}Step 3: Checking billing...${NC}"
BILLING_ENABLED=$(gcloud billing projects describe $PROJECT_ID --format="value(billingEnabled)" 2>/dev/null || echo "false")

if [ "$BILLING_ENABLED" != "true" ]; then
    echo -e "${YELLOW}WARNING: Billing is not enabled for this project.${NC}"
    echo "Please enable billing at: https://console.cloud.google.com/billing"
    echo ""
    echo "List your billing accounts:"
    gcloud billing accounts list
    echo ""
    read -p "Enter billing account ID (or press Enter to skip): " BILLING_ACCOUNT

    if [ ! -z "$BILLING_ACCOUNT" ]; then
        echo "Linking billing account..."
        gcloud billing projects link $PROJECT_ID --billing-account=$BILLING_ACCOUNT
    else
        echo -e "${YELLOW}Skipping billing setup. You'll need to enable it manually.${NC}"
    fi
fi

echo -e "\n${GREEN}Step 4: Enabling required APIs...${NC}"
gcloud services enable compute.googleapis.com
gcloud services enable dns.googleapis.com

echo -e "\n${GREEN}Step 5: Reserving static IP address...${NC}"
gcloud compute addresses create school-portal-ip --region=$REGION 2>/dev/null || {
    echo -e "${YELLOW}IP address may already exist, continuing...${NC}"
}

STATIC_IP=$(gcloud compute addresses describe school-portal-ip \
  --region=$REGION \
  --format="get(address)")

echo -e "${GREEN}✓ Static IP Reserved: ${STATIC_IP}${NC}"

echo -e "\n${GREEN}Step 6: Configuring firewall rules...${NC}"
gcloud compute firewall-rules create school-portal-allow-web \
  --allow tcp:80,tcp:443,tcp:22 \
  --description="Allow HTTP, HTTPS, and SSH for School Portal" \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --target-tags=school-portal-server 2>/dev/null || {
    echo -e "${YELLOW}Firewall rule may already exist, continuing...${NC}"
}

echo -e "\n${GREEN}Step 7: Creating Compute Engine VM...${NC}"
gcloud compute instances create school-portal-vm \
  --zone=$ZONE \
  --machine-type=e2-standard-2 \
  --network-interface=address=school-portal-ip,network-tier=PREMIUM \
  --tags=school-portal-server,http-server,https-server \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=50GB \
  --boot-disk-type=pd-balanced \
  --metadata=startup-script='#!/bin/bash
apt-get update
apt-get install -y apt-transport-https ca-certificates curl software-properties-common git
' 2>/dev/null || {
    echo -e "${YELLOW}VM may already exist, continuing...${NC}"
}

echo -e "\n${GREEN}Step 8: Waiting for VM to start...${NC}"
sleep 30

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${GREEN}Important Information:${NC}"
echo -e "  Static IP: ${GREEN}${STATIC_IP}${NC}"
echo -e "  Project ID: ${GREEN}${PROJECT_ID}${NC}"
echo -e "  VM Name: ${GREEN}school-portal-vm${NC}"
echo -e "  Zone: ${GREEN}${ZONE}${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. SSH into the VM:"
echo -e "     ${GREEN}gcloud compute ssh school-portal-vm --zone=${ZONE}${NC}"
echo ""
echo "  2. Follow the deployment guide:"
echo -e "     ${GREEN}deployment/GCP_DEPLOYMENT_GUIDE.md${NC}"
echo "     Start at Phase 5: VM Setup"
echo ""
echo "  3. Configure your domain DNS:"
echo "     Point your A record to: ${STATIC_IP}"
echo ""
echo -e "${YELLOW}Estimated Monthly Cost: ~\$75${NC}"
echo -e "  - VM (e2-standard-2): ~\$49/month"
echo -e "  - Static IP: ~\$7/month"
echo -e "  - Disk (50GB): ~\$8/month"
echo -e "  - Network: ~\$12/month"
echo ""
echo -e "${GREEN}Ready to deploy! 🚀${NC}"
