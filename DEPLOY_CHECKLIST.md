# Checklist de Implantacao - ERP IMPPEL 1.0

Use este documento para subir o ERP no Replit oficial da empresa.

## 1. Preparar codigo

1. Abrir o Replit oficial da empresa.
2. Conectar ao GitHub.
3. Importar `AndreySystems-coder/ERP-IMPPEL-main`.
4. Confirmar branch `main`.
5. Confirmar ultimo commit publicado.

## 2. Configurar banco e secrets

1. Criar/conectar PostgreSQL persistente.
2. Confirmar `DATABASE_URL`.
3. Configurar Secrets:
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `DEFAULT_ADMIN_USERNAME=Admin`
   - `DEFAULT_ADMIN_PASSWORD`
   - `PORT=5000`, se necessario
4. Nao usar banco local ou temporario para producao.
5. Nao colocar secrets em arquivos commitados.

## 3. Instalar e aplicar schema

1. Rodar `npm install`.
2. Conferir se o banco e o banco correto.
3. Rodar `npm run db:push`.
4. Iniciar o ERP.
5. Confirmar que o Admin foi criado automaticamente.
6. Fazer login como Admin.

## 4. Importar dados oficiais

Importar sempre pela interface oficial em Backups > Restauracao > Importar.

1. Importar Cargos/Usuarios.
2. Confirmar usuarios, cargos e permissoes.
3. Definir ou revisar senhas iniciais.
4. Importar Catalogo de Produtos.
5. Importar Catalogo de Servicos.
6. Importar Estoque.
7. Importar Controle de Materiais.
8. Resolver pendencias de responsavel/material no preview.
9. Confirmar importacao em merge.
10. Executar segunda importacao dos mesmos PDFs.
11. Confirmar que a segunda importacao nao cria duplicidade.

## 5. Validar modulos

1. Login e logout.
2. Dashboard.
3. Usuarios e cargos.
4. Produtos.
5. Servicos.
6. Estoque Atual.
7. Ferramentas e Equipamentos.
8. Movimentacoes.
9. Controle de Materiais.
10. Registro Rapido.
11. Orcamentos e OS.
12. Backup completo.

## 6. Backup inicial

1. Gerar Exportacao Completa.
2. Guardar ZIP inicial fora do GitHub.
3. Conferir manifest/checksum.
4. Confirmar que PDFs, JSONs, backups e anexos reais nao foram adicionados ao Git.

## 7. Liberar usuarios

1. Criar ou revisar acessos dos funcionarios.
2. Testar usuario Aplicador.
3. Confirmar menus permitidos.
4. Confirmar bloqueios de areas restritas.
5. Comunicar que PDFs sao fonte operacional para restore apenas quando gerados pelo ERP.

## Criterio de aceite

- ERP inicia sem erro.
- Admin entra.
- Banco persiste dados apos reinicio.
- PDFs importam com preview.
- Pendencias ficam claras.
- Segunda importacao nao duplica.
- Backup completo e gerado e guardado.
