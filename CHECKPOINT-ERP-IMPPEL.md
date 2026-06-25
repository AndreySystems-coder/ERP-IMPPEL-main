# CHECKPOINT ERP IMPPEL

Data do checkpoint: 25/06/2026

## Commit Atual

- Base antes desta sprint: `b98a9b7ac277dc88fbf6d94d69f58c99ca3f6e0d`
- Branch: `main`
- Repositório: `origin/main`
- Status no início do checkpoint: árvore limpa antes dos ajustes finais desta sprint.

## Funcionalidades Implementadas

- Modelo operacional seguro de usuários:
  - `birthDate`
  - `mustChangePassword`
  - hash bcrypt para autenticação
  - senha inicial derivada de DDMMAAAA apenas enquanto `mustChangePassword=true`
  - troca obrigatória no primeiro login
- Importação operacional de usuários com preview.
- Exportação operacional JSON e PDF com:
  - login
  - senhaInicial
  - nomeCompleto
  - cargo
  - perfil
  - status
- Backup técnico de usuários e cargos apenas com hashes bcrypt.
- Backup completo técnico com manifesto, checksums e módulos separados.
- Restauração completa por módulos.
- Reset operacional com token gerado após backup completo.
- Venda de materiais com aprovação e baixa de estoque.
- Dashboard operacional com widgets automáticos para estoque, obras, equipe, vendas e financeiro.

## Backups

O sistema possui dois caminhos principais:

1. Backup técnico completo
   - Inclui módulos do ERP em JSON técnico.
   - Inclui manifesto e checksum.
   - Não inclui `.env`, `DATABASE_URL`, `SESSION_SECRET` ou segredos.
   - Usuários são exportados com `passwordHash` bcrypt.
   - Não exporta senha em texto.

2. Backup por módulo
   - Usuários e cargos.
   - Estoque e movimentações.
   - Catálogo de materiais/produtos.
   - Catálogo de serviços.
   - Clientes.
   - Leads.
   - Orçamentos.
   - Ordens de serviço.
   - Registros de obra.
   - Controle de materiais.
   - Financeiro.
   - Vendas de materiais.
   - Garantias e pós-venda.
   - Configurações, formas e condições de pagamento.

## Restauração

- A restauração completa valida o manifesto e o checksum.
- A restauração completa permite selecionar módulos.
- Em modo merge, os dados são mesclados.
- Em modo replace, somente os módulos selecionados são substituídos.
- Usuários restaurados continuam usando hash bcrypt.
- Usuários legados sem hash válido recebem senha aleatória com hash, exigindo redefinição.
- A restauração operacional de usuários aceita JSON com `senhaInicial` e reconstrói `birthDate` automaticamente.

## Importação Operacional

Tela: Gestão de Usuários > Importação e relatórios.

Fluxo recomendado:

1. Colar lista de funcionários no formato `Nome Completo; DD/MM/AAAA; Cargo opcional`.
2. Gerar preview.
3. Conferir login, senha inicial, cargo, perfil e status.
4. Confirmar importação.
5. Exportar relatório operacional PDF/JSON se necessário.

Observação: `senhaInicial` é operacional e não faz parte do backup técnico completo.

## Usuários

- Admin inicial é criado apenas quando não existe usuário admin.
- Funcionários importados recebem senha inicial derivada da data de nascimento.
- Após o primeiro login, o usuário deve trocar a senha.
- A senha inicial deixa de autenticar após a troca.
- Backup técnico exporta somente hash bcrypt.

## Reset Operacional

O reset operacional remove dados de operação, preservando:

- usuários
- cargos
- permissões
- configurações
- templates
- sistema de backup

O reset remove:

- catálogo de serviços
- catálogo de materiais/produtos
- estoque
- movimentações
- clientes
- leads
- orçamentos
- ordens de serviço
- registros de obra
- financeiro
- vendas de materiais
- controle de materiais
- garantias/pós-venda operacional

Para executar:

1. Gerar backup completo técnico.
2. Guardar o arquivo baixado.
3. Usar o token gerado na sessão.
4. Digitar exatamente `LIMPAR DADOS OPERACIONAIS`.
5. Confirmar a limpeza.

## Como Atualizar o Replit

1. Abrir o projeto no Replit.
2. Garantir que a branch esteja em `main`.
3. Executar pull do GitHub.
4. Rodar instalação se necessário:
   - `npm install`
5. Aplicar schema no banco, se necessário:
   - `npm run db:push`
6. Rodar o projeto.
7. Entrar como Admin.
8. Testar dashboard, usuários, backups e restauração.

## Como Restaurar Backups

1. Entrar como Admin.
2. Abrir Central de Backups.
3. Escolher restauração completa ou por módulo.
4. Enviar o arquivo técnico de backup.
5. Conferir manifesto, módulo, quantidade e checksum.
6. Usar merge por padrão.
7. Usar replace somente em banco limpo ou quando houver certeza.
8. Validar usuários, estoque, financeiro, obras e vendas após restaurar.

## Próximos Testes Manuais

- Login Admin no Replit.
- Login de funcionário importado.
- Troca obrigatória de senha.
- Importação definitiva de funcionários.
- Conferir cargos e permissões.
- Restaurar backup técnico completo real.
- Restaurar usuários/cargos.
- Restaurar estoque e movimentações.
- Restaurar catálogo de materiais/produtos.
- Restaurar catálogo de serviços.
- Restaurar clientes, leads, orçamentos e OS.
- Validar fotos, anexos e assinaturas em backups completos.
- Testar venda de materiais com produto vindo do estoque.
- Aprovar venda e conferir baixa automática no estoque.
- Rodar reset operacional somente após backup completo salvo.

## Observações

- Este checkpoint não contém dados reais da IMPPEL.
- Não versionar `.env`, backups reais, PDFs reais ou JSONs reais.
- A próxima sprint deve receber a lista definitiva de funcionários, datas de nascimento, cargos e permissões.
