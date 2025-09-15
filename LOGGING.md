# 🚀 NASA Space Apps Matchmaking API - Logging & Monitoring

Sistema completo de logs e monitoramento para depuração em servidor Linux.

## 📋 Visão Geral

O sistema implementa logging estruturado usando **Winston** com múltiplos níveis e transports, middleware de monitoramento HTTP, e ferramentas de análise para facilitar a depuração em produção.

## 🏗️ Arquitetura de Logging

### Estrutura de Arquivos
```
logs/
├── error.log      # Erros críticos e exceções
├── app.log        # Logs gerais da aplicação
├── audit.log      # Logs de auditoria (ações de usuários)
└── debug.log      # Logs detalhados de debug
```

### Níveis de Log
- **error**: Erros críticos e exceções
- **warn**: Avisos e situações atípicas
- **info**: Informações gerais da aplicação
- **debug**: Informações detalhadas para debug

## ⚙️ Configuração

### Variáveis de Ambiente
```bash
# Nível de log (production: info, development: debug)
LOG_LEVEL=info

# Ambiente da aplicação
NODE_ENV=production

# CORS origin para logs
CORS_ORIGIN=https://yourapp.com
```

### Configuração de Produção
```typescript
// src/infrastructure/config/logger.config.ts
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
```

## 📊 Monitoramento HTTP

### Request/Response Logging
- **Request ID único** para rastreamento
- **Sanitização** de dados sensíveis (passwords, tokens)
- **Performance tracking** com duração de requests
- **Audit logging** para operações críticas

### Middleware Implementados
1. **LoggingMiddleware**: Log de todas as requisições HTTP
2. **ErrorMonitoringMiddleware**: Captura e log de erros HTTP

## 🔍 Ferramentas de Análise

### 1. Monitor de Logs em Tempo Real
```bash
# Monitorar apenas erros
./scripts/monitor-logs.sh --errors

# Monitorar todos os logs
./scripts/monitor-logs.sh --all

# Verificar estatísticas
./scripts/monitor-logs.sh --stats

# Verificar erros críticos da última hora
./scripts/monitor-logs.sh --check
```

### 2. Analisador de Logs
```bash
# Relatório completo
node scripts/log-analyzer.js report

# Análise apenas de erros
node scripts/log-analyzer.js errors

# Análise de performance
node scripts/log-analyzer.js performance

# Análise de auditoria
node scripts/log-analyzer.js audit
```

## 🚨 Alertas e Monitoramento

### Rotação Automática de Logs
- **Tamanho máximo**: 10MB para error.log e app.log
- **Retenção**: 5 arquivos de erro, 10 arquivos de app
- **Compressão**: Logs antigos são comprimidos automaticamente

### Script de Rotação
```bash
# Rotação manual
./scripts/monitor-logs.sh --rotate

# Configuração de cron (diária às 2h)
0 2 * * * /path/to/your/app/scripts/monitor-logs.sh --rotate
```

## 📈 Análise de Performance

### Métricas Coletadas
- **Tempo de resposta** de todas as requisições HTTP
- **Duração de operações** críticas do sistema
- **Estatísticas por endpoint**
- **Padrões de erro** e frequência

### Logs de Performance
```typescript
performanceLogger('Email check', duration, {
  email: 'user@example.com',
  isRegistered: true
});
```

## 🔐 Logs de Auditoria

### Eventos Auditados
- Verificações de email
- Autenticação de usuários
- Criação/atualização de perfis
- Operações de matchmaking
- Acesso a dados da NASA API

### Formato de Audit Log
```json
{
  "level": "info",
  "message": "AUDIT: Email check performed",
  "category": "audit",
  "audit": true,
  "action": "Email check performed",
  "userId": "user@example.com",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🛠️ Depuração em Produção

### 1. Verificação de Saúde do Sistema
```bash
# Status geral dos logs
./scripts/monitor-logs.sh --stats

# Verificação de erros críticos
./scripts/monitor-logs.sh --check
```

### 2. Rastreamento de Problemas
```bash
# Buscar por request ID específico
grep "req_1642248600_abc123" logs/*.log

# Buscar por email específico
grep "user@example.com" logs/*.log

# Buscar por erro específico
grep -i "mongodb connection" logs/error.log
```

### 3. Análise de Tendências
```bash
# Análise completa com gráficos de tempo
node scripts/log-analyzer.js report

# Verificar performance por endpoint
node scripts/log-analyzer.js performance
```

## 📋 Logs Estruturados

### Formato Padrão
```json
{
  "level": "info",
  "message": "Request completed successfully",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "context": "RegistrationController",
  "requestId": "req_1642248600_abc123",
  "pid": 12345,
  "hostname": "api-server-01",
  "service": "nasa-matchmaking-api",
  "environment": "production",
  "duration": 150,
  "statusCode": 200
}
```

### Sanitização de Dados
- **Passwords**: Removidos/mascarados
- **Tokens de autenticação**: Mascarados
- **Códigos de verificação**: Mascarados
- **Headers sensíveis**: Authorization, Cookie

## 🚀 Comandos Rápidos

### Monitoramento em Tempo Real
```bash
# Terminal 1: Monitorar erros
tail -f logs/error.log | jq .

# Terminal 2: Monitorar aplicação
tail -f logs/app.log | jq .

# Terminal 3: Monitorar performance
grep "PERFORMANCE" logs/app.log | tail -10
```

### Análise de Problemas
```bash
# Últimos 10 erros
tail -10 logs/error.log | jq '.message'

# Erros por hora nas últimas 24h
grep $(date -d '24 hours ago' '+%Y-%m-%d') logs/error.log | cut -d'T' -f2 | cut -d':' -f1 | sort | uniq -c

# Usuários mais ativos
grep "userId" logs/audit.log | jq -r '.userId' | sort | uniq -c | sort -nr | head -10
```

## 🔧 Configuração de Sistema

### Systemd Service (Linux)
```ini
[Unit]
Description=NASA API Log Monitor
After=network.target

[Service]
Type=simple
ExecStart=/path/to/app/scripts/monitor-logs.sh --check
Restart=always
RestartSec=300

[Install]
WantedBy=multi-user.target
```

### Logrotate (Linux)
```bash
/path/to/app/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 user group
    postrotate
        systemctl reload nasa-api
    endscript
}
```

## 📞 Suporte e Troubleshooting

### Problemas Comuns

1. **Logs não aparecem**: Verificar permissões da pasta `logs/`
2. **Arquivos muito grandes**: Executar rotação manual
3. **Performance degradada**: Reduzir nível de log para `warn` ou `error`

### Contatos
- **Logs de erro**: Verificar `logs/error.log`
- **Status da aplicação**: `GET /health` endpoint
- **Documentação da API**: `http://localhost:3000/api/docs`

---

**Nota**: Este sistema de logging foi projetado especificamente para facilitar a depuração em servidores Linux de produção, fornecendo visibilidade completa das operações da API NASA Space Apps Matchmaking.