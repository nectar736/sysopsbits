---
title: "How to Set Up Automated Linux Backups with Restic"
description: "Complete guide to implementing automated, encrypted backups for Linux servers using Restic. Step-by-step commands with real-world examples."
date: 2026-01-18T09:00:00Z
categories: ["Tutorials"]
tags: ["backups", "restic", "linux", "automation", "security"]
featuredImage: "/images/automated-linux-backups-restic.jpg"
---

Restic is a modern backup solution that's fast, secure, and deduplicated. In this guide, you'll learn to set up automated, encrypted backups for your Linux servers with step-by-step commands you can run immediately.

## What is Restic?

Restic is an open-source backup tool that offers:
- **Client-side encryption** before data leaves your server
- **Deduplication** across backup snapshots
- **Multiple storage backends** (local, S3, Backblaze, etc.)
- **Incremental backups** with compression
- **Cross-platform** support

## Prerequisites

- Linux server (Ubuntu 20.04+, CentOS 8+, or similar)
- sudo/root access
- Backup storage destination (local disk, S3, or S3-compatible)

## Step 1: Install Restic

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install restic
```

### CentOS/RHEL/Fedora
```bash
# For recent versions
sudo dnf install restic

# For older versions, download binary
sudo curl -L https://github.com/restic/restic/releases/latest/download/restic_0.16.2_linux_amd64.bz2 -o /usr/local/bin/restic.bz2
sudo bunzip2 /usr/local/bin/restic.bz2
sudo chmod +x /usr/local/bin/restic
```

### Verify Installation
```bash
restic version
# Should output: restic 0.16.2 (or newer) compiled with go1.21.6 on linux/amd64
```

## Step 2: Choose Storage Backend

### Option A: Local Storage (Quick Start)
```bash
# Create backup directory
sudo mkdir -p /backup
sudo chown $USER:$USER /backup
```

### Option B: S3 Compatible Storage (Recommended)
```bash
# Install AWS CLI (if not already installed)
sudo apt install awscli

# Configure credentials
aws configure
# Enter your S3 access key, secret key, region
```

### Option C: Backblaze B2
```bash
# Install B2 CLI
pip install b2
b2 authorize-account YOUR_ACCOUNT_ID YOUR_APPLICATION_KEY
```

## Step 3: Initialize Repository

### Local Repository
```bash
export RESTIC_REPOSITORY=/backup/my-backups
export RESTIC_PASSWORD_FILE=/home/user/.restic-password
echo "YourSuperSecurePasswordHere" > ~/.restic-password
chmod 600 ~/.restic-password

restic init
```

### S3 Repository
```bash
export RESTIC_REPOSITORY=s3:s3.amazonaws.com/your-backup-bucket
export RESTIC_PASSWORD_FILE=/home/user/.restic-password
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key

restic init
```

### Backblaze B2 Repository
```bash
export RESTIC_REPOSITORY=b2:your-bucket-name
export RESTIC_PASSWORD_FILE=/home/user/.restic-password

restic init
```

## Step 4: Create Your First Backup

### Basic Website Backup
```bash
# Backup common web directories
restic backup /var/www/html /etc/nginx /etc/apache2 \
    --tag "web" \
    --tag "production" \
    --exclude "*.cache" \
    --exclude "*.log"
```

### Database Backup Integration
```bash
# Create MySQL backup before Restic
mysqldump -u root -p --all-databases | gzip > /tmp/mysql-backup-$(date +%Y%m%d).sql.gz

# Backup with database dump
restic backup /var/www/html /etc/nginx /tmp/mysql-backup-*.sql.gz \
    --tag "web" \
    --tag "database" \
    --tag "production"

# Clean up temporary SQL dump
rm /tmp/mysql-backup-*.sql.gz
```

### PostgreSQL Backup
```bash
# Create PostgreSQL dump
pg_dumpall -U postgres | gzip > /tmp/postgres-backup-$(date +%Y%m%d).sql.gz

# Backup with PostgreSQL
restic backup /var/www/html /etc/nginx /tmp/postgres-backup-*.sql.gz \
    --tag "web" \
    --tag "postgres"

# Clean up
rm /tmp/postgres-backup-*.sql.gz
```

## Step 5: Manage Snapshots

### List All Snapshots
```bash
restic snapshots
# Output shows: ID, Date, Host, Tags, Directory
```

### Restore Specific Snapshot
```bash
# Get snapshot ID from the list above
restic restore <snapshot-id> --target /tmp/restore-test

# Restore only specific files
restic restore <snapshot-id> --target /tmp/restore --include /var/www/html
```

### Remove Old Snapshots
```bash
# Keep last 7 daily, 4 weekly, 12 monthly snapshots
restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 12

# Preview what would be deleted
restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --dry-run

# Remove unreferenced data
restic prune
```

## Step 6: Automation with Cron

### Create Backup Script
```bash
sudo nano /usr/local/bin/restic-backup.sh
```

```bash
#!/bin/bash

# Restic automated backup script
set -euo pipefail

# Configuration
RESTIC_REPOSITORY="/backup/my-backups"
RESTIC_PASSWORD_FILE="/home/user/.restic-password"
LOG_FILE="/var/log/restic-backup.log"
BACKUP_DIRS="/var/www/html /etc/nginx /home/user"

# Export environment variables
export RESTIC_REPOSITORY
export RESTIC_PASSWORD_FILE

# Function to log messages
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Function to backup database
backup_database() {
    log "Starting database backup"
    
    # MySQL backup
    if command -v mysqldump &> /dev/null; then
        mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --all-databases | gzip > "/tmp/mysql-backup-$(date +%Y%m%d_%H%M%S).sql.gz"
        log "MySQL backup completed"
    fi
    
    # PostgreSQL backup
    if command -v pg_dumpall &> /dev/null; then
        pg_dumpall -U postgres | gzip > "/tmp/postgres-backup-$(date +%Y%m%d_%H%M%S).sql.gz"
        log "PostgreSQL backup completed"
    fi
}

# Function to cleanup database dumps
cleanup_database() {
    rm -f /tmp/mysql-backup-*.sql.gz
    rm -f /tmp/postgres-backup-*.sql.gz
    log "Database cleanup completed"
}

# Main backup function
perform_backup() {
    log "Starting Restic backup"
    
    # Backup database first
    backup_database
    
    # Perform restic backup
    restic backup $BACKUP_DIRS /tmp/*-backup-*.sql.gz \
        --tag "automated" \
        --tag "$(hostname)" \
        --exclude "*.cache" \
        --exclude "*.log" \
        --exclude "/tmp/*" 2>> "$LOG_FILE"
    
    # Cleanup database dumps
    cleanup_database
    
    # Cleanup old snapshots (keep last 7 daily, 4 weekly, 12 monthly)
    restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --prune 2>> "$LOG_FILE"
    
    # Check repository integrity
    restic check 2>> "$LOG_FILE"
    
    log "Backup completed successfully"
}

# Trap to handle errors
trap 'log "Backup failed with error on line $LINENO"' ERR

# Execute backup
perform_backup

log "Backup script finished"
```

### Make Script Executable
```bash
sudo chmod +x /usr/local/bin/restic-backup.sh
```

### Setup Cron Job
```bash
sudo crontab -e
```

```crontab
# Restic daily backup at 2 AM
0 2 * * * /usr/local/bin/restic-backup.sh

# Weekly backup check at 3 AM on Sundays
0 3 * * 0 /usr/local/bin/restic check >> /var/log/restic-check.log 2>&1
```

### Create Log Rotation
```bash
sudo nano /etc/logrotate.d/restic
```

```logrotate
/var/log/restic-backup.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
}
```

## Step 7: Advanced Configuration

### Environment Variables File
```bash
nano ~/.restic-env
```

```bash
#!/bin/bash
export RESTIC_REPOSITORY="s3:s3.amazonaws.com/your-backup-bucket"
export RESTIC_PASSWORD_FILE="/home/user/.restic-password"
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export MYSQL_ROOT_PASSWORD="your-mysql-password"
```

### Source in Cron
```crontab
0 2 * * * source /home/user/.restic-env && /usr/local/bin/restic-backup.sh
```

### Backup Verification Script
```bash
nano /usr/local/bin/restic-verify.sh
```

```bash
#!/bin/bash
source ~/.restic-env

# Check latest backup
LATEST_SNAPSHOT=$(restic snapshots --latest 1 --json | jq -r '.[0].id')
if [ -n "$LATEST_SNAPSHOT" ]; then
    echo "Latest backup: $LATEST_SNAPSHOT"
    
    # Restore to test location
    TEST_DIR="/tmp/backup-verify-$(date +%Y%m%d)"
    restic restore "$LATEST_SNAPSHOT" --target "$TEST_DIR"
    
    # Verify key files exist
    if [ -f "$TEST_DIR/var/www/html/index.html" ]; then
        echo "✅ Backup verification successful"
        rm -rf "$TEST_DIR"
    else
        echo "❌ Backup verification failed"
        exit 1
    fi
else
    echo "❌ No snapshots found"
    exit 1
fi
```

## Step 8: Monitoring and Alerts

### Simple Health Check
```bash
#!/bin/bash
# /usr/local/bin/check-restic.sh

source ~/.restic-env

# Check if backup ran in last 48 hours
LAST_BACKUP=$(restic snapshots --latest 1 --json | jq -r '.[0].time')
LAST_BACKUP_EPOCH=$(date -d "$LAST_BACKUP" +%s)
NOW_EPOCH=$(date +%s)
AGE_HOURS=$(( (NOW_EPOCH - LAST_BACKUP_EPOCH) / 3600 ))

if [ "$AGE_HOURS" -gt 48 ]; then
    echo "❌ No backup in $AGE_HOURS hours"
    # Send alert (example with curl to webhook)
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"❌ Backup alert: No backup in $AGE_HOURS hours on $(hostname)\"}" \
        YOUR_SLACK_WEBHOOK_URL
    exit 1
else
    echo "✅ Latest backup: $AGE_HOURS hours ago"
fi
```

### Add to Cron
```crontab
*/6 * * * * /usr/local/bin/check-restic.sh
```

## Best Practices

### Security
- Store password file with 600 permissions
- Use separate backup user account
- Enable bucket versioning on S3
- Use IAM roles instead of access keys when possible

### Performance
- Use exclude patterns for large temp directories
- Schedule backups during low-traffic hours
- Consider bandwidth throttling for remote storage
- Test restore procedures regularly

### Monitoring
- Monitor backup job success/failure
- Alert on storage capacity limits
- Track backup growth trends
- Regular restore testing

## Troubleshooting

### Common Issues

#### "password incorrect" error
```bash
# Check password file
cat ~/.restic-password

# Reset password (will lose all backups!)
restic --repo /backup/my-backups --password-file ~/.restic-password init
```

#### Out of memory errors
```bash
# Limit memory usage
restic backup --limit-upload 1000 /path/to/backup
```

#### Network timeouts
```bash
# Increase timeout
export RESTIC_PACK_SIZE=32
export RESTIC_READ_CONCURRENCY=2
```

## Cost Comparison (Monthly)

| Storage Size | Local | S3 Standard | Backblaze B2 |
|--------------|-------|-------------|--------------|
| 100 GB | Free (existing disk) | $23 | $6 |
| 500 GB | Free (existing disk) | $115 | $30 |
| 1 TB | Free (existing disk) | $230 | $60 |

*Prices as of January 2026*

## Final Words

This setup provides:
- ✅ Automated daily backups
- ✅ Client-side encryption
- ✅ Deduplication for efficiency
- ✅ Multiple retention policies
- ✅ Regular integrity checks
- ✅ Monitoring and alerts

Remember: A backup strategy isn't complete until you've successfully restored from it!

---
**Need reliable cloud storage for your backups?** Check out our comparison of [Best Cloud Storage for Backups](/best-cloud-storage-backups).

faq:
  - question: "How long does a typical backup take?"
    answer: "For 10GB of data: Local storage takes 2-5 minutes, S3 takes 5-15 minutes depending on bandwidth. Restic's deduplication means subsequent backups are much faster."
  - question: "Can I backup to multiple locations?"
    answer: "Yes! You can use 'restic copy' to replicate snapshots between repositories. This is great for 3-2-1 backup strategy compliance."
  - question: "How secure are the backups?"
    answer: "Restic uses AES-256 encryption with a key derived from your password using scrypt. As long as your password is strong, your data is secure even if the storage provider is compromised."
  - question: "Can I exclude files from backups?"
    answer: "Absolutely. Use --exclude patterns or --exclude-file to specify files/directories to skip. Common exclusions include /tmp/, *.log, *.cache, and node_modules/"

relatedProducts:
  - name: "AWS S3 Storage"
    description: "Reliable object storage with 99.999999999% durability and multiple storage classes."
    rating: 5
    affiliateLink: "https://aws.amazon.com/s3/"
  - name: "Backblaze B2"
    description: "Cost-effective cloud storage perfect for backups with S3-compatible API."
    rating: 4
    affiliateLink: "https://www.backblaze.com/b2/cloud-storage.html"
  - name: "Wasabi Hot Cloud Storage"
    description: "Fast S3-compatible storage with no egress fees, ideal for backup access."
    rating: 4
    affiliateLink: "https://wasabi.com/"