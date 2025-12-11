# Deployment Guide

This guide explains how to deploy BlockChess to production, including GitHub deployment, server setup, and best practices.

## Prerequisites

Before deploying, ensure you have:

- **GitHub Repository**: Code pushed to GitHub
- **Server Access**: SSH access to deployment server
- **Domain Name**: (Optional) Domain for your application
- **SSL Certificate**: (Optional) For HTTPS
- **Environment Variables**: All required variables configured

## Deployment Methods

### Method 1: Docker Deployment (Recommended)

The easiest way to deploy is using Docker Compose.

#### Step 1: Prepare Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin
```

#### Step 2: Clone Repository

```bash
git clone https://github.com/your-username/blockchess.git
cd blockchess
```

#### Step 3: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

**Required Environment Variables**:
```env
# Database
DATABASE_TYPE=postgres
POSTGRES_DB=blockchess_db
POSTGRES_USER=blockchess
POSTGRES_PASSWORD=secure_password_here

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Sui Blockchain
NEXT_PUBLIC_SUI_NETWORK_TYPE=mainnet
NEXT_PUBLIC_SUI_NETWORK_MAINNET_PACKAGE_ID=0x...
NEXT_PUBLIC_SUI_NETWORK_GRAPHQL_URL=https://sui-mainnet.mystenlabs.com/graphql

# Computer Player
NEXT_PUBLIC_HAL_ID=computer-player
```

#### Step 4: Deploy

```bash
# Use deployment script
cd front
./deploy.sh build
./deploy.sh start

# Or manually
docker compose build
docker compose up -d
```

#### Step 5: Initialize Database

```bash
# Run database migrations
docker compose exec app node scripts/migrate-sqlite-schema.js

# Or for PostgreSQL
docker compose exec postgres psql -U blockchess -d blockchess_db -f /docker-entrypoint-initdb.d/schema.sql
```

#### Step 6: Verify Deployment

```bash
# Check services
docker compose ps

# Check logs
docker compose logs -f app

# Health check
curl http://localhost:3050/api/health
```

### Method 2: Manual Deployment

#### Step 1: Server Setup

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib
```

#### Step 2: Clone and Build

```bash
# Clone repository
git clone https://github.com/your-username/blockchess.git
cd blockchess/front/app

# Install dependencies
pnpm install

# Build application
pnpm build
```

#### Step 3: Setup Database

```bash
# Create database
sudo -u postgres createdb blockchess_db
sudo -u postgres createuser blockchess

# Initialize schema
psql -U blockchess -d blockchess_db -f sql/postgres/schema.sql
```

#### Step 4: Run Application

```bash
# Using PM2 (recommended)
npm install -g pm2
pm2 start npm --name "blockchess" -- start
pm2 save
pm2 startup
```

## Production Checklist

### Before Deployment

- [ ] All environment variables configured
- [ ] Database schema initialized
- [ ] Computer player created
- [ ] Sui package deployed
- [ ] Package IDs updated in `.env`
- [ ] SSL certificate configured (if using HTTPS)
- [ ] Domain DNS configured
- [ ] Backup strategy in place

### Security

- [ ] Strong database passwords
- [ ] Environment variables secured
- [ ] HTTPS enabled
- [ ] Firewall configured
- [ ] Regular security updates
- [ ] Database backups automated

### Performance

- [ ] Database indexes created
- [ ] Caching configured
- [ ] CDN setup (if applicable)
- [ ] Image optimization
- [ ] Database connection pooling

### Monitoring

- [ ] Application logs configured
- [ ] Error tracking (e.g., Sentry)
- [ ] Uptime monitoring
- [ ] Performance monitoring
- [ ] Database monitoring

## Deployment Scripts

### Using deploy.sh

The `front/deploy.sh` script provides deployment commands:

```bash
# Build
./deploy.sh build

# Start services
./deploy.sh start

# Stop services
./deploy.sh stop

# Restart services
./deploy.sh restart

# View logs
./deploy.sh logs

# Health check
./deploy.sh health

# Backup database
./deploy.sh backup

# Update application
./deploy.sh update
```

## Database Migration

### Running Migrations

```bash
# SQLite
cd front/app
node scripts/migrate-sqlite-schema.js

# PostgreSQL
psql -U blockchess -d blockchess_db -f sql/postgres/schema.sql
```

### Migration Best Practices

1. **Backup First**: Always backup before migrations
2. **Test Locally**: Test migrations locally first
3. **Rollback Plan**: Have a rollback strategy
4. **Document Changes**: Document all schema changes

## Backup Strategy

### Database Backups

```bash
# PostgreSQL backup
pg_dump -U blockchess blockchess_db > backup_$(date +%Y%m%d).sql

# Restore
psql -U blockchess blockchess_db < backup_20240101.sql
```

### Automated Backups

Set up cron job for daily backups:

```bash
# Edit crontab
crontab -e

# Add backup job (runs daily at 2 AM)
0 2 * * * /path/to/backup-script.sh
```

## Monitoring

### Application Monitoring

- **Logs**: Check application logs regularly
- **Errors**: Monitor error rates
- **Performance**: Track response times
- **Uptime**: Monitor service availability

### Database Monitoring

- **Connection Pool**: Monitor connection usage
- **Query Performance**: Track slow queries
- **Disk Space**: Monitor database size
- **Backups**: Verify backup success

## Troubleshooting

### Common Issues

1. **Application Won't Start**:
   - Check environment variables
   - Verify database connection
   - Check application logs

2. **Database Connection Errors**:
   - Verify database is running
   - Check connection credentials
   - Verify network connectivity

3. **Build Failures**:
   - Check Node.js version
   - Verify dependencies
   - Check build logs

4. **Performance Issues**:
   - Check database indexes
   - Monitor resource usage
   - Review query performance

### Getting Help

- Check application logs
- Review error messages
- Verify configuration
- Check [INSTALL.md](./INSTALL.md) for setup issues

## Rollback Procedure

If deployment fails:

1. **Stop Services**:
   ```bash
   docker compose down
   # or
   pm2 stop blockchess
   ```

2. **Restore Previous Version**:
   ```bash
   git checkout previous-version-tag
   ```

3. **Restore Database** (if needed):
   ```bash
   psql -U blockchess -d blockchess_db < backup.sql
   ```

4. **Restart Services**:
   ```bash
   docker compose up -d
   # or
   pm2 restart blockchess
   ```

## Scaling

### Horizontal Scaling

- Use load balancer
- Multiple application instances
- Database replication
- Session management

### Vertical Scaling

- Increase server resources
- Optimize database
- Cache frequently accessed data
- Database query optimization

## Maintenance

### Regular Maintenance

- **Updates**: Keep dependencies updated
- **Security**: Apply security patches
- **Backups**: Verify backups regularly
- **Monitoring**: Review monitoring data
- **Optimization**: Optimize performance

### Update Procedure

1. Pull latest code
2. Install dependencies
3. Run migrations
4. Build application
5. Restart services
6. Verify deployment

## Resources

- **Docker Documentation**: https://docs.docker.com/
- **PM2 Documentation**: https://pm2.keymetrics.io/
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **Next.js Deployment**: https://nextjs.org/docs/deployment

## Support

For deployment issues:

- Check [INSTALL.md](./INSTALL.md)
- Review application logs
- Open GitHub issue
- Check documentation

---

*Remember: Always test deployments in a staging environment before production!*

