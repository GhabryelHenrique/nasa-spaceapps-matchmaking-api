#!/bin/bash

# NASA Space Apps Matchmaking API - Log Monitoring Script
# This script provides real-time log monitoring and alerting for production environments

LOG_DIR="./logs"
ERROR_LOG="$LOG_DIR/error.log"
APP_LOG="$LOG_DIR/app.log"
AUDIT_LOG="$LOG_DIR/audit.log"
DEBUG_LOG="$LOG_DIR/debug.log"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display usage
show_usage() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  -e, --errors     Monitor error logs in real-time"
    echo "  -a, --all        Monitor all logs in real-time"
    echo "  -s, --stats      Show log statistics"
    echo "  -c, --check      Check for critical errors in last hour"
    echo "  -r, --rotate     Rotate log files"
    echo "  -h, --help       Show this help message"
    echo ""
}

# Function to monitor error logs
monitor_errors() {
    echo -e "${RED}🔥 Monitoring error logs...${NC}"
    echo "Press Ctrl+C to stop"
    echo ""
    
    if [[ -f "$ERROR_LOG" ]]; then
        tail -f "$ERROR_LOG" | while IFS= read -r line; do
            echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') - $line"
        done
    else
        echo -e "${YELLOW}Warning: Error log file not found at $ERROR_LOG${NC}"
    fi
}

# Function to monitor all logs
monitor_all() {
    echo -e "${BLUE}📊 Monitoring all logs...${NC}"
    echo "Press Ctrl+C to stop"
    echo ""
    
    # Use multitail if available, otherwise fall back to tail
    if command -v multitail &> /dev/null; then
        multitail -ci red "$ERROR_LOG" -ci yellow "$APP_LOG" -ci green "$AUDIT_LOG"
    else
        echo -e "${YELLOW}Tip: Install 'multitail' for better multi-log monitoring${NC}"
        tail -f "$ERROR_LOG" "$APP_LOG" "$AUDIT_LOG" 2>/dev/null
    fi
}

# Function to show log statistics
show_stats() {
    echo -e "${GREEN}📈 Log Statistics${NC}"
    echo "===================="
    echo ""
    
    if [[ -f "$ERROR_LOG" ]]; then
        error_count=$(wc -l < "$ERROR_LOG" 2>/dev/null || echo "0")
        echo -e "Error log entries: ${RED}$error_count${NC}"
        
        # Count errors by hour
        echo "Errors in last 24 hours:"
        if [[ $error_count -gt 0 ]]; then
            tail -n 1000 "$ERROR_LOG" | grep -o '"timestamp":"[^"]*"' | cut -d'"' -f4 | cut -d'T' -f1 | sort | uniq -c | tail -24
        fi
    fi
    
    echo ""
    
    if [[ -f "$APP_LOG" ]]; then
        app_count=$(wc -l < "$APP_LOG" 2>/dev/null || echo "0")
        echo -e "Application log entries: ${BLUE}$app_count${NC}"
    fi
    
    if [[ -f "$AUDIT_LOG" ]]; then
        audit_count=$(wc -l < "$AUDIT_LOG" 2>/dev/null || echo "0")
        echo -e "Audit log entries: ${GREEN}$audit_count${NC}"
    fi
    
    echo ""
    echo "Log file sizes:"
    du -h "$LOG_DIR"/*.log 2>/dev/null | sort -hr
}

# Function to check for critical errors
check_critical() {
    echo -e "${YELLOW}🚨 Checking for critical errors in the last hour...${NC}"
    echo ""
    
    if [[ -f "$ERROR_LOG" ]]; then
        # Get timestamp from 1 hour ago
        one_hour_ago=$(date -d '1 hour ago' '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -v-1H '+%Y-%m-%d %H:%M:%S')
        
        # Search for recent critical errors
        critical_errors=$(grep -i "critical\|alert\|severity.*high" "$ERROR_LOG" | grep -v "$one_hour_ago" | tail -10)
        
        if [[ -n "$critical_errors" ]]; then
            echo -e "${RED}❌ Critical errors found:${NC}"
            echo "$critical_errors"
            
            # Extract unique error patterns
            echo ""
            echo -e "${YELLOW}Error patterns:${NC}"
            echo "$critical_errors" | grep -o '"message":"[^"]*"' | cut -d'"' -f4 | sort | uniq -c | sort -nr
            
            exit 1
        else
            echo -e "${GREEN}✅ No critical errors found in the last hour${NC}"
        fi
    else
        echo -e "${YELLOW}Warning: Error log file not found${NC}"
        exit 1
    fi
}

# Function to rotate log files
rotate_logs() {
    echo -e "${BLUE}🔄 Rotating log files...${NC}"
    
    timestamp=$(date '+%Y%m%d_%H%M%S')
    
    for log_file in "$ERROR_LOG" "$APP_LOG" "$AUDIT_LOG" "$DEBUG_LOG"; do
        if [[ -f "$log_file" ]]; then
            # Check if file is larger than 10MB
            if [[ $(stat -f%z "$log_file" 2>/dev/null || stat -c%s "$log_file") -gt 10485760 ]]; then
                backup_file="${log_file}.${timestamp}"
                echo "Rotating $log_file -> $backup_file"
                mv "$log_file" "$backup_file"
                touch "$log_file"
                
                # Compress old log file
                if command -v gzip &> /dev/null; then
                    gzip "$backup_file"
                    echo "Compressed: ${backup_file}.gz"
                fi
            else
                echo "Skipping $log_file (< 10MB)"
            fi
        fi
    done
    
    # Clean up old compressed logs (keep last 30 days)
    find "$LOG_DIR" -name "*.gz" -mtime +30 -delete 2>/dev/null
    
    echo -e "${GREEN}✅ Log rotation completed${NC}"
}

# Function to setup log monitoring alerts
setup_alerts() {
    echo -e "${BLUE}🔔 Setting up log monitoring alerts...${NC}"
    
    # Create a simple systemd service for monitoring (Linux)
    if command -v systemctl &> /dev/null; then
        cat << EOF > /tmp/nasa-api-monitor.service
[Unit]
Description=NASA API Log Monitor
After=network.target

[Service]
Type=simple
ExecStart=$PWD/scripts/monitor-logs.sh --check
Restart=always
RestartSec=300

[Install]
WantedBy=multi-user.target
EOF
        echo "Systemd service template created at /tmp/nasa-api-monitor.service"
        echo "To install: sudo cp /tmp/nasa-api-monitor.service /etc/systemd/system/"
        echo "Then run: sudo systemctl enable nasa-api-monitor.service"
    fi
    
    # Create a cron job for log rotation
    echo "# NASA API Log Rotation - runs daily at 2 AM"
    echo "0 2 * * * $PWD/scripts/monitor-logs.sh --rotate"
    echo ""
    echo "Add the above line to your crontab with: crontab -e"
}

# Main script logic
case "$1" in
    -e|--errors)
        monitor_errors
        ;;
    -a|--all)
        monitor_all
        ;;
    -s|--stats)
        show_stats
        ;;
    -c|--check)
        check_critical
        ;;
    -r|--rotate)
        rotate_logs
        ;;
    --setup-alerts)
        setup_alerts
        ;;
    -h|--help|*)
        show_usage
        ;;
esac