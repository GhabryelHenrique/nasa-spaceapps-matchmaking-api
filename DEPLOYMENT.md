# Deployment Guide

## GitHub Actions SSH Deployment Setup

This project is configured for automatic deployment to your SSH server using GitHub Actions.

### Required GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions, and add these secrets:

1. **SSH_HOST**: `31.97.171.230`
2. **SSH_USERNAME**: `root`
3. **SSH_PASSWORD**: `1029384756Gh@`

### How it Works

The deployment workflow (`.github/workflows/deploy.yml`) will:

1. **Trigger on**: Push to `master` branch or manual workflow dispatch
2. **Build Process**: Install dependencies, build the application, and run tests
3. **Deploy Process**: Connect to your SSH server and:
   - Clone/pull the latest code to `/opt/nasa-spaceapps-matchmaking-api`
   - Install dependencies and build
   - Restart the application using PM2 (if available) or fallback to nohup

### Manual Deployment

You can also deploy manually using the `deploy.sh` script:

```bash
# On your SSH server
bash deploy.sh
```

### Server Requirements

The deployment assumes your server has:
- Node.js 20+ (will be installed/upgraded by the deployment script)
- Git
- PM2 (recommended) or basic process management

**Note**: The project requires Node.js 20+ due to NestJS 11 dependencies. The deployment script will automatically upgrade Node.js if needed.

### Environment Variables

Create a `.env.production` file in your repository root with production environment variables. This file will be copied to `.env` during deployment.

### Security Recommendations

**⚠️ IMPORTANT**: The current setup uses password-based SSH authentication. For better security, consider:

1. **Switch to SSH keys**: Generate an SSH key pair and use `SSH_PRIVATE_KEY` instead of password
2. **Create a dedicated deployment user**: Instead of using root, create a specific user for deployments
3. **Use environment variables**: Store sensitive configuration in GitHub secrets instead of committing them

### Monitoring

After deployment, you can monitor your application:
- View logs: `pm2 logs nasa-matchmaking-api` (if using PM2)
- Check status: `pm2 status` (if using PM2)
- Manual logs: `tail -f /opt/nasa-spaceapps-matchmaking-api/app.log`

---

# Manual Deployment Guide (Alternative)

Este guia explica como fazer o deploy da API de matchmaking da NASA Space Apps em um servidor Linux com Nginx.

## Pré-requisitos

- Servidor Linux (Ubuntu 20.04+ recomendado)
- Acesso root ou usuário com sudo
- Domínio configurado (opcional, mas recomendado)
- Chave de conta de serviço do Google Sheets

## Arquivos de Deploy Criados

O projeto agora inclui os seguintes arquivos para facilitar o deploy:

- `deploy.sh` - Script automatizado de deploy
- `ecosystem.config.js` - Configuração do PM2
- `nginx.conf` - Configuração do Nginx
- `nasa-matchmaking-api.service` - Arquivo de serviço systemd
- `.env.example` - Template de variáveis de ambiente

## Deploy Automático (Recomendado)

1. **Transfira os arquivos para o servidor:**
   ```bash
   scp -r . user@your-server:/tmp/nasa-matchmaking-api
   ```

2. **Execute o script de deploy:**
   ```bash
   ssh user@your-server
   cd /tmp/nasa-matchmaking-api
   chmod +x deploy.sh
   sudo ./deploy.sh
   ```

3. **Configure as variáveis de ambiente:**
   ```bash
   sudo nano /opt/nasa-matchmaking-api/.env
   ```

4. **Reinicie os serviços:**
   ```bash
   sudo systemctl restart nasa-matchmaking-api nginx
   ```

## Deploy Manual

### 1. Preparação do Servidor

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar Nginx
sudo apt install nginx -y

# Instalar MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Instalar PM2 globalmente
sudo npm install -g pm2
```

### 2. Configuração da Aplicação

```bash
# Criar usuário para a aplicação
sudo useradd -r -s /bin/false nodeuser

# Criar diretório da aplicação
sudo mkdir -p /opt/nasa-matchmaking-api
sudo chown nodeuser:nodeuser /opt/nasa-matchmaking-api

# Copiar arquivos da aplicação
sudo cp -r /path/to/your/project/* /opt/nasa-matchmaking-api/
cd /opt/nasa-matchmaking-api

# Instalar dependências e build
sudo -u nodeuser npm ci --only=production
sudo -u nodeuser npm run build
```

### 3. Configuração do Ambiente

```bash
# Copiar e configurar .env
sudo cp .env.example .env
sudo nano .env
```

Configure as seguintes variáveis:
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/nasa-spaceapps-matchmaking
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=/opt/nasa-matchmaking-api/google-service-account.json
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
```

### 4. Configuração do Systemd

```bash
# Copiar arquivo de serviço
sudo cp nasa-matchmaking-api.service /etc/systemd/system/

# Habilitar e iniciar serviço
sudo systemctl daemon-reload
sudo systemctl enable nasa-matchmaking-api
sudo systemctl start nasa-matchmaking-api
```

### 5. Configuração do Nginx

```bash
# Copiar configuração do Nginx
sudo cp nginx.conf /etc/nginx/sites-available/nasa-matchmaking-api

# Habilitar site
sudo ln -s /etc/nginx/sites-available/nasa-matchmaking-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### 6. Configuração do Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Configuração SSL (Recomendado)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obter certificado SSL
sudo certbot --nginx -d your-domain.com

# Configurar renovação automática
sudo crontab -e
# Adicionar: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Comandos Úteis

### Gerenciamento do Serviço
```bash
# Status do serviço
sudo systemctl status nasa-matchmaking-api

# Reiniciar serviço
sudo systemctl restart nasa-matchmaking-api

# Ver logs
sudo journalctl -u nasa-matchmaking-api -f

# Parar serviço
sudo systemctl stop nasa-matchmaking-api
```

### Nginx
```bash
# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### MongoDB
```bash
# Status do MongoDB
sudo systemctl status mongod

# Conectar ao MongoDB
mongosh

# Ver logs do MongoDB
sudo tail -f /var/log/mongodb/mongod.log
```

## Monitoramento

### Logs da Aplicação
```bash
# Logs em tempo real
sudo journalctl -u nasa-matchmaking-api -f

# Logs das últimas 100 linhas
sudo journalctl -u nasa-matchmaking-api -n 100
```

### Verificação de Saúde
```bash
# Verificar se a API está respondendo
curl http://localhost:3000/health

# Verificar através do Nginx
curl http://your-domain.com/health
```

## Troubleshooting

### Problemas Comuns

1. **Serviço não inicia:**
   ```bash
   sudo journalctl -u nasa-matchmaking-api -n 50
   ```

2. **Erro de conexão MongoDB:**
   ```bash
   sudo systemctl status mongod
   mongosh # testar conexão
   ```

3. **Nginx retorna 502:**
   ```bash
   sudo systemctl status nasa-matchmaking-api
   sudo tail -f /var/log/nginx/error.log
   ```

4. **Problemas de permissão:**
   ```bash
   sudo chown -R nodeuser:nodeuser /opt/nasa-matchmaking-api
   ```

### Reinicialização Completa
```bash
sudo systemctl restart nasa-matchmaking-api
sudo systemctl restart nginx
sudo systemctl restart mongod
```

## Backup

### Backup do MongoDB
```bash
# Criar backup
mongodump --db nasa-spaceapps-matchmaking --out /backup/mongodb/

# Restaurar backup
mongorestore --db nasa-spaceapps-matchmaking /backup/mongodb/nasa-spaceapps-matchmaking/
```

### Backup da Aplicação
```bash
# Backup dos arquivos
sudo tar -czf /backup/nasa-matchmaking-api-$(date +%Y%m%d).tar.gz /opt/nasa-matchmaking-api
```

## Atualizações

```bash
# Parar serviço
sudo systemctl stop nasa-matchmaking-api

# Atualizar código
cd /opt/nasa-matchmaking-api
sudo -u nodeuser git pull  # se usando git
sudo -u nodeuser npm ci --only=production
sudo -u nodeuser npm run build

# Reiniciar serviço
sudo systemctl start nasa-matchmaking-api
```

## Segurança

- Mantenha o sistema sempre atualizado
- Use firewall (ufw)
- Configure SSL/TLS
- Use senhas fortes para MongoDB
- Mantenha backups regulares
- Monitore logs regularmente