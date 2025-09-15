#!/usr/bin/env node

/**
 * NASA Space Apps Matchmaking API - Log Analyzer
 * Analyzes application logs for debugging and monitoring purposes
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(process.cwd(), 'logs');
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

class LogAnalyzer {
  constructor() {
    this.logFiles = {
      error: path.join(LOG_DIR, 'error.log'),
      app: path.join(LOG_DIR, 'app.log'),
      audit: path.join(LOG_DIR, 'audit.log'),
      debug: path.join(LOG_DIR, 'debug.log')
    };
  }

  async analyzeErrors() {
    console.log(`${colors.red}🔍 Error Analysis${colors.reset}`);
    console.log('==================');

    if (!fs.existsSync(this.logFiles.error)) {
      console.log(`${colors.yellow}No error log file found${colors.reset}`);
      return;
    }

    const errors = this.readJsonLog(this.logFiles.error);
    if (errors.length === 0) {
      console.log(`${colors.green}✅ No errors found${colors.reset}`);
      return;
    }

    console.log(`${colors.red}Total errors: ${errors.length}${colors.reset}\n`);

    // Group errors by message
    const errorGroups = errors.reduce((groups, error) => {
      const key = error.message || 'Unknown error';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(error);
      return groups;
    }, {});

    // Sort by frequency
    const sortedGroups = Object.entries(errorGroups)
      .sort(([,a], [,b]) => b.length - a.length)
      .slice(0, 10);

    console.log('Top 10 Error Messages:');
    sortedGroups.forEach(([message, occurrences], index) => {
      console.log(`${index + 1}. ${colors.red}${message}${colors.reset} (${occurrences.length} times)`);
      
      // Show latest occurrence details
      const latest = occurrences[occurrences.length - 1];
      if (latest.timestamp) {
        console.log(`   Latest: ${latest.timestamp}`);
      }
      if (latest.context) {
        console.log(`   Context: ${latest.context}`);
      }
      console.log('');
    });

    // Timeline analysis
    this.analyzeErrorTimeline(errors);
  }

  analyzeErrorTimeline(errors) {
    console.log(`${colors.blue}📊 Error Timeline (Last 24 Hours)${colors.reset}`);
    console.log('================================');

    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentErrors = errors.filter(error => {
      if (!error.timestamp) return false;
      const errorTime = new Date(error.timestamp);
      return errorTime >= last24Hours;
    });

    if (recentErrors.length === 0) {
      console.log(`${colors.green}No errors in the last 24 hours${colors.reset}\n`);
      return;
    }

    // Group by hour
    const hourlyErrors = {};
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourKey = hour.getHours().toString().padStart(2, '0');
      hourlyErrors[hourKey] = 0;
    }

    recentErrors.forEach(error => {
      const errorTime = new Date(error.timestamp);
      const hour = errorTime.getHours().toString().padStart(2, '0');
      if (hourlyErrors[hour] !== undefined) {
        hourlyErrors[hour]++;
      }
    });

    Object.entries(hourlyErrors).forEach(([hour, count]) => {
      const bar = '█'.repeat(Math.min(count, 50));
      console.log(`${hour}:00 ${bar} ${count}`);
    });
    console.log('');
  }

  async analyzePerformance() {
    console.log(`${colors.blue}⚡ Performance Analysis${colors.reset}`);
    console.log('=====================');

    const appLogs = this.readJsonLog(this.logFiles.app);
    const performanceLogs = appLogs.filter(log => 
      log.category === 'performance' || 
      log.message?.includes('PERFORMANCE') ||
      log.duration !== undefined
    );

    if (performanceLogs.length === 0) {
      console.log(`${colors.yellow}No performance data found${colors.reset}\n`);
      return;
    }

    // Analyze response times
    const responseTimes = performanceLogs
      .filter(log => log.duration)
      .map(log => ({
        operation: log.operation || this.extractOperation(log.message),
        duration: log.duration
      }));

    if (responseTimes.length > 0) {
      const groupedByOperation = responseTimes.reduce((groups, item) => {
        if (!groups[item.operation]) {
          groups[item.operation] = [];
        }
        groups[item.operation].push(item.duration);
        return groups;
      }, {});

      console.log('Average Response Times:');
      Object.entries(groupedByOperation).forEach(([operation, durations]) => {
        const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        const max = Math.max(...durations);
        const min = Math.min(...durations);
        
        console.log(`${operation}:`);
        console.log(`  Average: ${avg.toFixed(2)}ms`);
        console.log(`  Range: ${min}ms - ${max}ms`);
        console.log(`  Samples: ${durations.length}`);
        console.log('');
      });
    }
  }

  async analyzeAudit() {
    console.log(`${colors.cyan}🔐 Audit Analysis${colors.reset}`);
    console.log('================');

    if (!fs.existsSync(this.logFiles.audit)) {
      console.log(`${colors.yellow}No audit log file found${colors.reset}\n`);
      return;
    }

    const auditLogs = this.readJsonLog(this.logFiles.audit);
    if (auditLogs.length === 0) {
      console.log(`${colors.yellow}No audit events found${colors.reset}\n`);
      return;
    }

    // Analyze user activities
    const userActivities = auditLogs.reduce((activities, log) => {
      const userId = log.userId || 'anonymous';
      if (!activities[userId]) {
        activities[userId] = [];
      }
      activities[userId].push(log);
      return activities;
    }, {});

    console.log('User Activity Summary:');
    Object.entries(userActivities)
      .sort(([,a], [,b]) => b.length - a.length)
      .slice(0, 10)
      .forEach(([userId, activities]) => {
        console.log(`${userId}: ${activities.length} actions`);
      });

    console.log('');

    // Analyze action types
    const actionTypes = auditLogs.reduce((types, log) => {
      const action = log.action || 'unknown';
      types[action] = (types[action] || 0) + 1;
      return types;
    }, {});

    console.log('Most Common Actions:');
    Object.entries(actionTypes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([action, count]) => {
        console.log(`${action}: ${count} times`);
      });

    console.log('');
  }

  async generateReport() {
    console.log(`${colors.green}📋 Comprehensive Log Report${colors.reset}`);
    console.log('============================');
    console.log(`Generated: ${new Date().toISOString()}\n`);

    await this.analyzeErrors();
    await this.analyzePerformance();
    await this.analyzeAudit();
    
    // System health check
    console.log(`${colors.blue}🏥 System Health Check${colors.reset}`);
    console.log('====================');
    
    const logSizes = {};
    Object.entries(this.logFiles).forEach(([type, filePath]) => {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        logSizes[type] = this.formatBytes(stats.size);
      } else {
        logSizes[type] = 'Not found';
      }
    });

    console.log('Log File Sizes:');
    Object.entries(logSizes).forEach(([type, size]) => {
      console.log(`${type}.log: ${size}`);
    });
  }

  readJsonLog(filePath) {
    if (!fs.existsSync(filePath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      return lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return { message: line, timestamp: null };
        }
      });
    } catch (error) {
      console.error(`Error reading ${filePath}:`, error.message);
      return [];
    }
  }

  extractOperation(message) {
    if (!message) return 'unknown';
    
    // Extract operation from performance messages
    const match = message.match(/PERFORMANCE: (.+?) completed/);
    if (match) return match[1];
    
    // Extract HTTP operations
    const httpMatch = message.match(/HTTP (GET|POST|PUT|DELETE) (.+?) -/);
    if (httpMatch) return `${httpMatch[1]} ${httpMatch[2]}`;
    
    return 'unknown';
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// CLI Interface
const analyzer = new LogAnalyzer();

const command = process.argv[2];

switch (command) {
  case 'errors':
    analyzer.analyzeErrors();
    break;
  case 'performance':
    analyzer.analyzePerformance();
    break;
  case 'audit':
    analyzer.analyzeAudit();
    break;
  case 'report':
  default:
    analyzer.generateReport();
    break;
}

console.log(`\n${colors.cyan}Usage:${colors.reset}`);
console.log('node scripts/log-analyzer.js [command]');
console.log('Commands: errors, performance, audit, report (default)');