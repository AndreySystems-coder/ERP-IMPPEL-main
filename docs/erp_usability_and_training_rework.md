# Reorganizacao de UX, treinamento e preparo operacional

Data: 2026-08-24

## Diagnostico inicial

O ERP ja possuia as funcionalidades principais das Etapas 1 a 8, mas algumas telas ainda exigiam conhecimento previo para entender ordem de uso, termos internos e relacao entre modulos.

Problemas classificados:

- Critico: nenhum bug novo de dados foi identificado nesta rodada. Restaurações reais continuam proibidas sem confirmação de banco e backup.
- Medio: duplicidade visual entre CRM, Leads, WhatsApp, Marketing e Sistema Comercial; Central Como Trabalhar superficial para funcionario novo; Backup sem matriz clara de cobertura; Identidade Visual com termos internos como asset/kit sem explicacao suficiente.
- Melhoria: Vercel segue viavel apenas com arquitetura e variaveis corretas; Replit permanece o ambiente operacional temporario mais simples.

## Mudancas realizadas

### Navegacao

- O grupo principal `CRM` foi renomeado para `Comercial`.
- O menu principal passou a destacar `Sistema Comercial`, `Clientes` e `Identidade Visual`.
- Rotas antigas de Leads, WhatsApp e Marketing permanecem existentes para compatibilidade, mas deixam de aparecer como entradas duplicadas no menu principal.

### Sistema Comercial

O Sistema Comercial foi reorganizado em abas:

1. Visao Geral
2. Funil
3. Leads
4. Follow-ups
5. WhatsApp
6. Marketing
7. Ajuda

Foram adicionadas explicacoes operacionais para funil, lead, follow-up, duplicidade, WhatsApp manual e marketing sem IA externa configurada.

### Central Como Trabalhar

A central passou a funcionar como manual interativo com:

- fluxo recomendado do ERP;
- guias por modulo;
- ordem das acoes;
- orientacao para funcionario novo;
- orientacao para administrador;
- glossario pesquisavel por termos operacionais.

### Identidade Visual

A interface foi simplificada para linguagem de uso:

- Marca;
- Padrao de foto/video;
- Autorizacao de imagem;
- Biblioteca de midias;
- Antes e Depois;
- Templates.

Termos tecnicos continuam no backend quando necessario, mas a interface evita expor `asset` como conceito principal.

### Qualidade das Obras

Foi adicionada orientacao explicando:

- orcamento define o vendido;
- OS define a execucao;
- procedimento ensina;
- checklist comprova;
- ocorrencia registra problema;
- bloqueios impedem encerramento inseguro.

### Governanca Comercial

Foi adicionada orientacao explicando:

- para que serve;
- como usar;
- proximo passo administrativo;
- rascunhos nao representam regras definitivas da IMPPEL.

### Backup e restauracao

Foi adicionada matriz de cobertura Etapas 1 a 8, separando:

- backup completo;
- exportacao simples;
- restauracao;
- dependencias e ordem segura.

## Matriz de backup resumida

| Modulo | Backup completo | Exportacao simples | Restauracao | Dependencia |
| --- | --- | --- | --- | --- |
| Usuarios, cargos e permissoes | Sim | PDF operacional | PDF/backup tecnico | Antes de modulos com responsaveis |
| Clientes, leads, CRM e follow-ups | Sim | Parcial | Backup completo | Antes de orcamentos |
| Produtos e servicos | Sim | PDF | PDF/backup tecnico | Antes de estoque e materiais |
| Estoque, ferramentas e movimentacoes | Sim | PDF | PDF/backup tecnico | Produtos/servicos antes |
| Controle de materiais | Sim | PDF | PDF/backup tecnico | Usuarios e estoque antes |
| Orcamentos, OS e obra | Sim | Relatorio quando disponivel | Backup completo | Clientes, produtos e servicos antes |
| Financeiro, garantias e pos-venda | Sim | Relatorio quando disponivel | Backup completo | Clientes, orcamentos e OS |
| Governanca, qualidade, marketing e identidade | Sim | Backup tecnico/relatorio | Backup completo | Modulos das Etapas 4 a 8 |

## Replit

Replit permanece o ambiente operacional temporario recomendado, desde que:

- `DATABASE_URL` esteja configurado;
- `SESSION_SECRET` esteja configurado;
- `DEFAULT_ADMIN_USERNAME` e `DEFAULT_ADMIN_PASSWORD` estejam nos Secrets;
- `npm run db:push` seja executado somente no banco correto;
- restauração seja feita com preview e confirmação.

## Vercel

Vercel nao deve ser tratado como hospedagem estatica simples. Para uso seguro, ainda exige:

- PostgreSQL persistente acessivel pela aplicacao;
- variaveis `DATABASE_URL`, `SESSION_SECRET`, `DEFAULT_ADMIN_USERNAME`, `DEFAULT_ADMIN_PASSWORD`, `NODE_ENV`;
- validacao de sessoes/cookies em HTTPS;
- estrategia persistente para uploads/anexos;
- validacao real de APIs, login, backup, PDFs e restore.

Status: compativel com ressalvas e validacao externa. Replit nao deve ser bloqueado por isso.

## Testes esperados no fechamento

- `npm install`
- `npx tsc --noEmit --incremental false`
- `npm run build`
- `npm run test`
- `npm run test:backup`
- `npm run test:operational`
- `git diff --check`

## Pendencias operacionais

- Aprovar conteudo real da Central Como Trabalhar.
- Aprovar regras oficiais de governanca comercial.
- Configurar credenciais reais de Waseller/Meta/IA somente quando houver contrato e conta de teste.
- Homologar restauração real em PostgreSQL descartavel antes de usar em producao.
- Definir armazenamento persistente para anexos se sair do Replit.
