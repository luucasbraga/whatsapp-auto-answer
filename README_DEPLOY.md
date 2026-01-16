# Guia de Deploy - WhatsApp Auto-Answer

Este guia descreve como fazer o deploy da aplicação WhatsApp Auto-Answer em um servidor remoto usando Docker e SSH.

## Pré-requisitos

### No seu computador local:
- Git instalado
- rsync instalado
- Acesso SSH ao servidor remoto
- Chave SSH configurada (ou senha do servidor)

### No servidor remoto (root@103.199.187.188):
- Docker instalado
- Docker Compose instalado
- Porta 3000 liberada no firewall

## Instalação do Docker no Servidor

Se o Docker não estiver instalado no servidor, conecte-se via SSH e execute:

```bash
# Conectar ao servidor
ssh root@103.199.187.188

# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Iniciar Docker
systemctl start docker
systemctl enable docker

# Verificar instalação
docker --version
docker compose version
```

## Deploy Automático

O script `deploy.sh` automatiza todo o processo de deploy:

### 1. Primeiro Deploy

```bash
# Dar permissão de execução ao script
chmod +x deploy.sh

# Executar deploy
./deploy.sh
```

O script irá:
1. ✅ Verificar conexão SSH com o servidor
2. ✅ Verificar se Docker está instalado
3. ✅ Criar estrutura de diretórios
4. ✅ Sincronizar arquivos da aplicação
5. ✅ Criar arquivo .env (se não existir)
6. ✅ Fazer build da imagem Docker
7. ✅ Iniciar os containers
8. ✅ Mostrar status da aplicação

### 2. Comandos Úteis

```bash
# Ver logs em tempo real
./deploy.sh logs

# Verificar status da aplicação
./deploy.sh status

# Reiniciar a aplicação
./deploy.sh restart

# Parar a aplicação
./deploy.sh stop

# Ajuda
./deploy.sh help
```

## Deploy Manual

Se preferir fazer o deploy manualmente:

### 1. Conectar ao Servidor

```bash
ssh root@103.199.187.188
```

### 2. Criar Diretórios

```bash
mkdir -p /opt/whatsapp-auto-answer/data/{.wwebjs_auth,logs}
cd /opt/whatsapp-auto-answer
```

### 3. Enviar Arquivos

Do seu computador local:

```bash
rsync -avz --exclude 'node_modules' --exclude '.git' \
  --exclude 'data' --exclude '.wwebjs_auth' \
  ./ root@103.199.187.188:/opt/whatsapp-auto-answer/
```

### 4. Configurar Ambiente

No servidor, criar arquivo `.env`:

```bash
cat > /opt/whatsapp-auto-answer/.env << 'EOF'
# Bot Configuration
BOT_NAME=Assistente Virtual
WELCOME_DELAY_MS=1000

# Server Configuration
PORT=3000
HOST=0.0.0.0

# Session
SESSION_NAME=whatsapp-session

# Logging
LOG_LEVEL=info
EOF
```

### 5. Iniciar Aplicação

```bash
cd /opt/whatsapp-auto-answer

# Build e start
docker compose build --no-cache
docker compose up -d

# Verificar status
docker compose ps
docker compose logs -f
```

## Acessar a Aplicação

Após o deploy, a aplicação estará disponível em:

```
http://103.199.187.188:3000
```

### Primeira Conexão

1. Acesse a URL acima no navegador
2. Você verá o QR Code na interface web
3. Abra o WhatsApp no celular
4. Vá em **Configurações → Dispositivos Conectados**
5. Toque em **Conectar um Dispositivo**
6. Escaneie o QR Code exibido
7. Aguarde a conexão ser estabelecida

## Estrutura de Diretórios no Servidor

```
/opt/whatsapp-auto-answer/
├── src/                      # Código fonte
├── public/                   # Interface web
├── data/                     # Dados persistentes
│   ├── .wwebjs_auth/        # Sessão do WhatsApp (persiste entre restarts)
│   └── logs/                # Logs da aplicação
├── .env                      # Variáveis de ambiente
├── Dockerfile               # Configuração Docker
├── docker-compose.yml       # Orquestração Docker
└── package.json             # Dependências Node.js
```

## Comandos Docker Úteis

```bash
# Ver logs
docker compose logs -f

# Ver logs das últimas 100 linhas
docker compose logs --tail=100

# Parar containers
docker compose down

# Iniciar containers
docker compose up -d

# Restart containers
docker compose restart

# Ver status
docker compose ps

# Entrar no container
docker exec -it whatsapp-auto-answer sh

# Ver uso de recursos
docker stats whatsapp-auto-answer

# Remover tudo e começar do zero
docker compose down -v
rm -rf data/.wwebjs_auth/*
docker compose up -d --build
```

## Manutenção

### Atualizar Aplicação

```bash
# Do seu computador local
./deploy.sh
```

### Backup da Sessão

É importante fazer backup da pasta `.wwebjs_auth` para não precisar escanear o QR Code novamente:

```bash
# No servidor
cd /opt/whatsapp-auto-answer
tar -czf backup-session-$(date +%Y%m%d).tar.gz data/.wwebjs_auth/

# Copiar backup para local
scp root@103.199.187.188:/opt/whatsapp-auto-answer/backup-session-*.tar.gz ./
```

### Restaurar Sessão

```bash
# No servidor
cd /opt/whatsapp-auto-answer
docker compose down
tar -xzf backup-session-YYYYMMDD.tar.gz
docker compose up -d
```

### Limpar Logs Antigos

```bash
# Limpar logs do Docker
docker system prune -a -f

# Limpar logs da aplicação
rm -f data/logs/*.log
```

## Firewall

Se necessário, libere a porta 3000:

```bash
# UFW (Ubuntu)
ufw allow 3000/tcp

# iptables
iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
iptables-save > /etc/iptables/rules.v4
```

## HTTPS (Opcional)

Para adicionar HTTPS, você pode usar Nginx como proxy reverso:

### 1. Instalar Nginx

```bash
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx
```

### 2. Configurar Nginx

```bash
cat > /etc/nginx/sites-available/whatsapp << 'EOF'
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -s /etc/nginx/sites-available/whatsapp /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 3. Adicionar SSL

```bash
certbot --nginx -d seu-dominio.com
```

## Troubleshooting

### Container não inicia

```bash
# Ver logs completos
docker compose logs

# Verificar se a porta está em uso
netstat -tlnp | grep 3000

# Verificar recursos do sistema
free -h
df -h
```

### QR Code não aparece

```bash
# Reiniciar aplicação
docker compose restart

# Limpar sessão antiga
docker compose down
rm -rf data/.wwebjs_auth/*
docker compose up -d
```

### Erro de memória

Ajuste os limites no `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      memory: 2G  # Aumentar limite
```

### Não consegue conectar ao servidor

```bash
# Verificar se SSH está rodando
systemctl status sshd

# Verificar firewall
ufw status

# Testar conexão
ping 103.199.187.188
telnet 103.199.187.188 22
```

## Segurança

### Recomendações:

1. **Alterar porta SSH** (opcional)
2. **Desabilitar login root via senha** (usar apenas chave SSH)
3. **Configurar firewall** (liberar apenas portas necessárias)
4. **Adicionar autenticação** na interface web
5. **Usar HTTPS** em produção
6. **Fazer backups regulares** da sessão

### Adicionar autenticação básica:

Edite `docker-compose.yml` e adicione:

```yaml
environment:
  - BASIC_AUTH_USER=admin
  - BASIC_AUTH_PASS=sua-senha-forte
```

E modifique `src/webServer.js` para implementar autenticação básica.

## Monitoramento

### Verificar saúde do container:

```bash
docker inspect --format='{{.State.Health.Status}}' whatsapp-auto-answer
```

### Monitorar recursos:

```bash
docker stats whatsapp-auto-answer --no-stream
```

### Logs de sistema:

```bash
journalctl -u docker -f
```

## Contato e Suporte

Para problemas ou dúvidas:
1. Verifique os logs: `./deploy.sh logs`
2. Consulte a documentação principal no README.md
3. Verifique issues no repositório

---

**Importante:** Mantenha sempre um backup da pasta `data/.wwebjs_auth` para não precisar escanear o QR Code novamente após um restore.
