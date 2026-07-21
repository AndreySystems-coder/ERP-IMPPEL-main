# Deployment Checklist - ERP IMPPEL

Checklist objetivo para publicar o ERP em Replit, VPS, Railway, Render, DigitalOcean, Docker, Coolify ou plataforma equivalente.

## 1. Variaveis obrigatorias

Configurar no painel/ambiente da plataforma:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
SESSION_SECRET=uma-chave-longa-e-segura
DEFAULT_ADMIN_USERNAME=Admin
DEFAULT_ADMIN_PASSWORD=senha-inicial-definida-pelo-responsavel
NODE_ENV=production
PORT=5000
```

Nunca versionar valores reais.

Para acesso inicial previsivel, configurar:

```bash
DEFAULT_ADMIN_USERNAME=Admin
DEFAULT_ADMIN_PASSWORD=<senha inicial combinada com o responsavel do ambiente>
```

## 2. Banco correto

Antes de iniciar:

- confirmar se o banco e Desenvolvimento, Homologacao ou Producao;
- confirmar provider PostgreSQL;
- confirmar que `DATABASE_URL` aponta para o banco correto;
- fazer backup antes de qualquer operacao em banco real.

## 3. Schema

Em banco novo:

```bash
npm install
npm run db:push
```

Nao executar `db:push`, restore ou importacao em producao sem confirmacao explicita do alvo.

## 4. Build e start

```bash
npm install
npx tsc --noEmit --incremental false
npm run build
npm run test
npm start
```

O servidor deve escutar em `0.0.0.0` usando `PORT`.

## 5. Bootstrap do Admin

Ao iniciar com schema aplicado:

- se nao existir Admin, o backend cria `Admin` usando `DEFAULT_ADMIN_PASSWORD`;
- se Admin ja existir, nao duplica;
- se existir `admin` legado, normaliza para `Admin`;
- senha existente em bcrypt e preservada;
- senha nunca e salva em texto puro.

Validar:

- login com `Admin`;
- `/api/auth/me`;
- logout;
- reiniciar servidor e confirmar que continua existindo apenas um Admin.

## 6. Sessoes e proxy

Validar:

- `SESSION_SECRET` configurado;
- cookie HTTP-only;
- `secure=true` em producao HTTPS;
- `sameSite=lax`;
- `trust proxy` ativo quando houver proxy HTTPS.

## 7. Importacao de backups PDF

Ordem recomendada:

1. Usuarios e Cargos
2. Catalogo de Produtos
3. Catalogo de Servicos
4. Estoque
5. Controle de Materiais

Regras:

- `inventory_id` e obrigatorio para itens de Controle de Materiais;
- resolver por ID explicito, nome exato ou nome normalizado;
- material sem correspondencia fica bloqueado ou parcial;
- responsavel historico nao vira usuario de login;
- Controle de Materiais cria historico, mas nao reaplica saldo ja refletido pelo PDF de Estoque;
- importacao parcial exige `IMPORTAR PARCIALMENTE`;
- segunda importacao deve resultar em duplicados/ignorados, sem novo impacto no saldo.

## 8. Validacao apos publicar

Testar pela URL publicada:

- login Admin;
- dashboard;
- usuarios;
- produtos;
- servicos;
- estoque;
- ferramentas;
- movimentacoes;
- controle de materiais;
- backup/importacao;
- APIs retornando JSON;
- logs sem credenciais.

## 9. Reversao

Antes de restore em producao:

- gerar backup completo;
- registrar hash/arquivo usado;
- registrar usuario responsavel;
- validar preview;
- manter caminho para restaurar o backup anterior.
