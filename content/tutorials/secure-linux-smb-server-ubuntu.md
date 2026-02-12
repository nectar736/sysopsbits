---
title: "How to Set Up a Secure Linux SMB Server with UFW Firewall Rules (Ubuntu 24.04)"
description: "Step-by-step guide to configure a secure Samba SMB server on Ubuntu 24.04 with UFW firewall rules, user authentication, and security hardening."
date: 2026-02-11T10:00:00Z
categories: ["Tutorials"]
tags: ["samba", "smb", "ubuntu", "security", "firewall", "file-sharing"]
featuredImage: "/images/secure-linux-smb-server-ubuntu.jpg"
---

SMB (Server Message Block) is the standard protocol for file sharing in Windows networks. This guide walks you through setting up a secure Samba server on Ubuntu 24.04 with proper firewall configuration and security hardening.

## What is SMB?

SMB is a network file sharing protocol that allows:
- Cross-platform file sharing between Windows, Linux, and macOS
- Centralized file storage with access controls
- Print sharing capabilities
- Active Directory integration (advanced setups)

**When to use SMB:**
- Office file sharing with Windows clients
- Centralized storage for mixed OS environments
- Replacing Windows File Server with Linux
- Home media sharing across devices

## Prerequisites

- Ubuntu 24.04 server with sudo access
- Static IP address configured
- At least 10GB free disk space for shares
- Network access for client machines

## Step 1: Install Samba

Update your system and install Samba packages:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install samba samba-common-bin -y
```

Verify the installation:

```bash
smbd --version
# Should output: Version 4.19.5-Ubuntu
```

## Step 2: Create Shared Directory

Create the main share directory with proper permissions:

```bash
# Create base shares directory
sudo mkdir -p /srv/samba/shares

# Create specific share directories
sudo mkdir -p /srv/samba/shares/public
sudo mkdir -p /srv/samba/shares/secure

# Set ownership to root (will be configured per-share)
sudo chown root:root /srv/samba/shares
sudo chmod 755 /srv/samba/shares
```

## Step 3: Configure smb.conf

Back up the original configuration and create a secure setup:

```bash
sudo cp /etc/samba/smb.conf /etc/samba/smb.conf.backup
sudo nano /etc/samba/smb.conf
```

Replace the contents with this secure configuration:

```ini
[global]
# Basic server settings
   workgroup = WORKGROUP
   server string = %h server (Samba, Ubuntu)
   server role = standalone server
   map to guest = Bad User
   obey pam restrictions = Yes
   pam password change = Yes
   passwd program = /usr/bin/passwd %u
   passwd chat = *Enter\snew\s*\spassword:* %n\n *Retype\snew\s*\spassword:* %n\n *password\supdated\ssuccessfully* .
   unix password sync = Yes

# Security settings
   security = user
   passdb backend = tdbsam
   guest account = nobody
   usershare allow guests = No

# Network interfaces (bind to specific interface)
   interfaces = 192.168.1.10/24 127.0.0.1/8
   bind interfaces only = Yes

# Performance tuning
   socket options = TCP_NODELAY IPTOS_LOWDELAY SO_KEEPALIVE
   use sendfile = Yes
   write cache size = 262144

# Logging
   log file = /var/log/samba/log.%m
   max log size = 1000
   syslog = 0
   panic action = /usr/share/samba/panic-action %d

# Name resolution
   dns proxy = No
   wins support = No

# Disable vulnerable SMBv1
   min protocol = SMB2_10
   max protocol = SMB3_11

# Share definitions
[public]
   comment = Public Share - Read Only
   path = /srv/samba/shares/public
   browseable = Yes
   guest ok = Yes
   read only = Yes
   create mask = 0644
   directory mask = 0755
   force user = nobody
   force group = nogroup

[secure]
   comment = Secure Share - Authenticated Users Only
   path = /srv/samba/shares/secure
   browseable = Yes
   guest ok = No
   read only = No
   create mask = 0660
   directory mask = 0770
   valid users = @smbusers
   write list = @smbusers
   veto files = /.*/lost+found/
   delete veto files = Yes
```

Save and exit (Ctrl+X, Y, Enter).

## Step 4: Create Samba Users

Create a dedicated group for SMB users and add users:

```bash
# Create SMB users group
sudo groupadd smbusers

# Create a new system user for SMB (replace with actual username)
sudo useradd -m -s /usr/sbin/nologin smbuser

# Add user to smbusers group
sudo usermod -aG smbusers smbuser

# Create Samba password for the user
sudo smbpasswd -a smbuser
# You'll be prompted to enter and confirm the password

# Enable the user in Samba
sudo smbpasswd -e smbuser

# For existing users, just add them to the group and create SMB password
sudo usermod -aG smbusers your_existing_user
sudo smbpasswd -a your_existing_user
```

Set permissions for the secure share:

```bash
# Set ownership for secure share
sudo chown -R root:smbusers /srv/samba/shares/secure
sudo chmod -R 2770 /srv/samba/shares/secure

# Set permissions for public share
sudo chown -R nobody:nogroup /srv/samba/shares/public
sudo chmod -R 755 /srv/samba/shares/public

# Create test files
echo "This is a public read-only file" | sudo tee /srv/samba/shares/public/readme.txt
echo "This is a secure shared file" | sudo tee /srv/samba/shares/secure/welcome.txt
```

## Step 5: Configure UFW Firewall Rules

Set up firewall rules to restrict SMB traffic to your local network only:

```bash
# First, allow SSH if not already allowed
sudo ufw allow ssh

# Allow Samba ports from your local subnet only
sudo ufw allow from 192.168.1.0/24 to any port 137 comment "SMB Name Service (UDP)"
sudo ufw allow from 192.168.1.0/24 to any port 138 comment "SMB Datagram Service (UDP)"
sudo ufw allow from 192.168.1.0/24 to any port 139 comment "SMB Session Service (TCP)"
sudo ufw allow from 192.168.1.0/24 to any port 445 comment "SMB over TCP"

# Enable UFW if not already enabled
sudo ufw --force enable
```

Verify the firewall rules:

```bash
sudo ufw status verbose
# You should see the SMB rules listed as "LIMIT" with your subnet

# Test firewall configuration
sudo ufw status numbered
```

**Important:** Replace `192.168.1.0/24` with your actual network subnet. Use `ip addr show` to find your network range.

## Step 6: Start and Enable Samba Services

Start the Samba services and enable them to start on boot:

```bash
# Start Samba services
sudo systemctl start smbd nmbd

# Enable services to start on boot
sudo systemctl enable smbd nmbd

# Check service status
sudo systemctl status smbd nmbd --no-pager

# Check if Samba is listening on correct ports
sudo netstat -tulpn | grep -E ':(137|138|139|445)'
```

Test the configuration:

```bash
# Test Samba configuration syntax
sudo testparm

# List available shares
smbclient -L localhost -U%
```

## Step 7: Test from Windows and Linux Clients

### Windows Client Testing

1. **File Explorer Method:**
   - Open File Explorer
   - In address bar, type: `\\192.168.1.10` (replace with your server IP)
   - You should see "public" and "secure" shares
   - "public" should be accessible without credentials
   - "secure" should prompt for username/password

2. **Command Line Method:**
```cmd
# List shares
net view \\192.168.1.10

# Map network drive
net use Z: \\192.168.1.10\secure /user:smbuser yourpassword
```

3. **PowerShell Method:**
```powershell
# Test connection
Test-NetConnection -ComputerName 192.168.1.10 -Port 445

# Map drive
New-PSDrive -Name S -Root "\\192.168.1.10\secure" -PSProvider FileSystem -Credential (Get-Credential)
```

### Linux Client Testing

```bash
# Install client tools
sudo apt install cifs-utils

# Test public share (no credentials)
smbclient //192.168.1.10/public -N

# Test secure share with credentials
smbclient //192.168.1.10/secure -U smbuser

# Mount secure share permanently
sudo mkdir -p /mnt/secure
sudo nano /etc/fstab
```

Add this line to fstab (replace with your credentials):

```fstab
//192.168.1.10/secure /mnt/secure cifs username=smbuser,password=yourpassword,uid=1000,gid=1000,file_mode=0660,dir_mode=0770 0 0
```

Mount the share:

```bash
sudo mount -a
df -h | grep /mnt/secure
```

## Step 8: Security Hardening

### Disable Vulnerable Protocols

Verify SMBv1 is disabled:

```bash
sudo smbcontrol smbd debuglevel 10
# Check logs for "SMB2_10" as minimum protocol
```

### Network Interface Binding

Ensure Samba only listens on the internal interface:

```bash
# Check which interfaces Samba is using
sudo netstat -tulpn | grep smbd
# Should only show your internal IP and localhost
```

### Implement Fail2Ban (Optional)

Install and configure Fail2Ban to protect against brute force attacks:

```bash
sudo apt install fail2ban -y

# Create Samba jail configuration
sudo nano /etc/fail2ban/jail.local
```

Add this configuration:

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[samba]
enabled = true
port = 137,138,139,445
filter = samba
logpath = /var/log/samba/log.smbd
maxretry = 3
bantime = 3600
```

Enable Fail2Ban:

```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
sudo fail2ban-client status samba
```

### Log Monitoring

Set up log monitoring for SMB access:

```bash
# Monitor SMB logs in real-time
sudo tail -f /var/log/samba/log.smbd

# Check for failed authentication attempts
sudo grep "pam_unix(smbd:auth): authentication failure" /var/log/auth.log

# Check Samba access logs
sudo journalctl -u smbd -f
```

### File System Monitoring

Set up auditd to monitor share access:

```bash
sudo apt install auditd

# Create audit rule for share directory
sudo auditctl -w /srv/samba/shares/ -p rwxa -k samba_access

# Check audit logs
sudo ausearch -k samba_access
```

## Step 9: Performance Tuning

### SMB3 Optimization

Add these performance settings to your smb.conf `[global]` section:

```ini
# Performance settings
   aio read size = 16384
   aio write size = 16384
   aio write behind = Yes
   
# Caching
   getwd cache = Yes
   name cache timeout = 660
   kernel change notify = Yes

# Large file support
   large readwrite = Yes
   max xmit = 65535
```

### System-level Optimizations

```bash
# Increase file descriptor limits
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Optimize network stack
echo "net.core.rmem_max = 16777216" | sudo tee -a /etc/sysctl.conf
echo "net.core.wmem_max = 16777216" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Step 10: Backup and Recovery

### Backup Configuration

Create a backup script for Samba configuration:

```bash
sudo nano /usr/local/bin/backup-samba.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backup/samba"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup configuration files
tar -czf "$BACKUP_DIR/smb-config-$DATE.tar.gz" \
    /etc/samba/smb.conf \
    /etc/samba/smb.conf.backup \
    /var/lib/samba/

# Backup share data (exclude temporary files)
tar -czf "$BACKUP_DIR/smb-shares-$DATE.tar.gz" \
    --exclude='/srv/samba/shares/*/tmp' \
    --exclude='/srv/samba/shares/*/.cache' \
    /srv/samba/shares/

echo "Backup completed: $BACKUP_DIR/smb-*-$DATE.tar.gz"

# Clean up old backups (keep last 7 days)
find "$BACKUP_DIR" -name "smb-*.tar.gz" -mtime +7 -delete
```

Make it executable and schedule:

```bash
sudo chmod +x /usr/local/bin/backup-samba.sh

# Add to cron (daily at 3 AM)
echo "0 3 * * * /usr/local/bin/backup-samba.sh" | sudo crontab -
```

## Troubleshooting

### Common Connection Issues

**Problem: Can't see shares from Windows**
```bash
# Check Samba is running
sudo systemctl status smbd nmbd

# Check firewall
sudo ufw status verbose

# Test network connectivity
nmap -p 139,445 your-server-ip

# Check logs
sudo tail -f /var/log/samba/log.smbd
```

**Problem: Authentication Failed**
```bash
# Verify user exists in Samba
sudo pdbedit -L

# Check password
sudo pdbedit -L -v smbuser

# Reset password if needed
sudo smbpasswd -a smbuser
```

**Problem: Permission Denied**
```bash
# Check directory permissions
ls -la /srv/samba/shares/

# Check Samba permissions
testparm -s

# Fix ownership issues
sudo chown -R root:smbusers /srv/samba/shares/secure
sudo chmod -R 2770 /srv/samba/shares/secure
```

### Firewall Problems

**Problem: Can't access from specific subnet**
```bash
# Check current rules
sudo ufw status numbered

# Add specific subnet rule
sudo ufw allow from 192.168.2.0/24 to any port 445

# Delete and recreate incorrect rules
sudo ufw delete [rule_number]
sudo ufw insert [position] allow from correct-subnet to any port 445
```

### Performance Issues

**Problem: Slow file transfers**
```bash
# Check network interface saturation
iftop -i eth0

# Check disk I/O
iotop -o

# Test network speed
iperf3 -c client-ip

# Optimize SMB settings in smb.conf
# (See Performance Tuning section above)
```

## Security Best Practices Checklist

- ✅ Disable SMBv1 protocol
- ✅ Restrict firewall to local subnet only
- ✅ Use strong passwords for SMB users
- ✅ Implement Fail2Ban for brute force protection
- ✅ Regular backup of configuration and data
- ✅ Monitor access logs regularly
- ✅ Use separate user accounts for each person
- ✅ Enable file system auditing for sensitive data
- ✅ Keep Samba packages updated
- ✅ Never expose SMB directly to internet

---

---
<div class="cta-section">
    <h3>Need a Cloud Server?</h3>
    <p>Deploy Ubuntu on <strong>DigitalOcean Droplets</strong> - Fast SSD cloud servers perfect for hosting Samba file shares. Starting at $4/month.</p>
    <p><a href="https://www.digitalocean.com/?refcode=YOURREF" target="_blank" rel="sponsored" class="btn btn-primary">Deploy Ubuntu Server →</a></p>
</div>

---

## Downloadable Configuration

Download our complete Samba configuration template:

<div class="download-section">
    <p><strong>Samba Setup Checklist:</strong> Complete configuration checklist and security hardening guide for quick reference.</p>
    <p><a href="/downloads/samba-server-checklist.txt" class="btn btn-secondary">Download Checklist →</a></p>
</div>

---

## FAQ Section

**What ports does SMB use?**
SMB uses UDP ports 137-138 for name service and datagram service, plus TCP ports 139-445 for file sharing and session service. Always restrict these to your local network using firewall rules.

**How to secure Samba properly?**
Enable user authentication, disable guest access, bind to specific network interfaces, restrict ports via firewall to local subnet only, disable SMBv1, implement Fail2Ban, and regularly monitor access logs.

**Can I expose SMB to the internet?**
Absolutely not. SMB was designed for trusted networks and has numerous vulnerabilities when exposed to the internet. Use VPN or SSH tunneling for remote access instead.

**What's the difference between SMB and NFS?**
SMB is Windows-optimized with better Active Directory integration, while NFS is Unix-native with slightly better performance. SMB is preferred for mixed Windows/Linux environments.

**How many users can Samba handle?**
Samba can handle hundreds of concurrent users on modern hardware. Performance depends on CPU, RAM, disk speed, and network bandwidth. Consider dedicated hardware for enterprise deployments.

**Should I use Active Directory with Samba?**
For small to medium networks, standalone mode is sufficient. For large enterprises, Samba AD integration provides centralized authentication and policy management across Windows and Linux systems.

---

*Looking for more Linux security guides? Check out our [Linux Server Hardening Guide](/linux-server-hardening) and [UFW Firewall Tutorial](/ufw-firewall-setup).*

faq:
  - question: "What ports does SMB use?"
    answer: "SMB uses UDP ports 137-138 for name service and datagram service, plus TCP ports 139-445 for file sharing and session service. Always restrict these to your local network using firewall rules."
  - question: "How to secure Samba properly?"
    answer: "Enable user authentication, disable guest access, bind to specific network interfaces, restrict ports via firewall to local subnet only, disable SMBv1, implement Fail2Ban, and regularly monitor access logs."
  - question: "Can I expose SMB to the internet?"
    answer: "Absolutely not. SMB was designed for trusted networks and has numerous vulnerabilities when exposed to the internet. Use VPN or SSH tunneling for remote access instead."
  - question: "What's the difference between SMB and NFS?"
    answer: "SMB is Windows-optimized with better Active Directory integration, while NFS is Unix-native with slightly better performance. SMB is preferred for mixed Windows/Linux environments."
  - question: "How many users can Samba handle?"
    answer: "Samba can handle hundreds of concurrent users on modern hardware. Performance depends on CPU, RAM, disk speed, and network bandwidth. Consider dedicated hardware for enterprise deployments."

relatedProducts:
  - name: "DigitalOcean Droplets"
    description: "Fast SSD cloud servers perfect for hosting Samba file shares with reliable performance."
    rating: 4
    affiliateLink: "https://www.digitalocean.com/?refcode=YOURREF"
  - name: "Vultr Cloud Compute"
    description: "High-performance cloud instances with global datacenters for low-latency file access."
    rating: 4
    affiliateLink: "https://www.vultr.com/?ref=YOURREF"
  - name: "Linode Cloud Servers"
    description: "Akamai-powered cloud hosting with excellent networking for demanding file sharing workloads."
    rating: 4
    affiliateLink: "https://www.linode.com/?r=YOURREF"