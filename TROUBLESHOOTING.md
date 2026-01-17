# Troubleshooting - WhatsApp Auto Answer

## Erro de Logout: EBUSY lockfile

### Sintomas
```
Error: EBUSY: resource busy or locked, unlink '.wwebjs_auth\session-whatsapp-session\lockfile'
```

### Causa
Este erro ocorre quando o WhatsApp Web tenta fazer logout mas não consegue deletar o arquivo de lock porque ele está sendo usado por outro processo ou está travado pelo sistema operacional.

### Soluções Implementadas

#### 1. Tratamento Automático de Erro
O sistema agora detecta automaticamente este erro e tenta:
- Realizar retry com backoff exponencial (5 tentativas)
- Aguardar o sistema liberar o arquivo
- Limpar o lockfile manualmente se necessário

#### 2. Endpoint de Reset de Sessão
Se o problema persistir, você pode resetar completamente a sessão:

**Via API:**
```bash
curl -X POST http://localhost:3000/api/reset-session \
  -H "Cookie: session_token=YOUR_TOKEN"
```

**Via Socket.IO:**
```javascript
socket.emit('reset-session');
```

Este comando irá:
1. Desconectar o cliente WhatsApp
2. Limpar o lockfile com retry
3. Remover completamente a pasta de sessão
4. Permitir que você faça login novamente

#### 3. Limpeza Manual (último recurso)
Se nenhuma das soluções acima funcionar:

**Windows:**
```cmd
taskkill /F /IM node.exe
del /F /S /Q .wwebjs_auth\session-whatsapp-session\lockfile
```

**Linux/Mac:**
```bash
pkill -9 node
rm -f .wwebjs_auth/session-whatsapp-session/lockfile
```

Depois reinicie a aplicação:
```bash
npm start
```

### Prevenção
Para minimizar a ocorrência deste erro:
1. Sempre use o endpoint `/api/disconnect` ou o botão de desconectar na interface
2. Evite fechar a aplicação bruscamente (Ctrl+C múltiplas vezes)
3. Aguarde o graceful shutdown completar antes de reiniciar

### Logs Úteis
Quando o sistema detecta e corrige o erro, você verá logs como:
```
[INFO] Tentando limpar lockfile após logout...
[WARN] Lockfile ocupado, tentando novamente em 500ms (tentativa 1/5)
[INFO] Lockfile removido com sucesso após 2 tentativa(s)
```

## Outros Problemas Comuns

### QR Code não aparece
- Verifique se a porta 3000 está acessível
- Limpe o cache do navegador
- Verifique os logs para mensagens de erro

### Mensagens não são enviadas
- Verifique se o número está com DDD e código do país
- Confirme que o número está salvo nos seus contatos
- Verifique os logs para erros de autenticação

### Cliente desconecta sozinho
- Pode ser devido a múltiplas sessões abertas
- O WhatsApp só permite uma sessão web por vez
- Faça logout de outras sessões web
