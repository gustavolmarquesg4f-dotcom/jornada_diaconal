# Jornada Diaconal — Preparação do Neon PostgreSQL 18

## Referências verificadas (19/10/2026)
- Neon: projeto `Jornada Diacona` (ID `tiny-haze-88647400`).
- Branch padrão da conta: `production` (ID `br-cold-field-b8pd1pmk`).
- Banco: `neondb`.
- Última consulta bem-sucedida mostrou **nenhuma tabela de aplicação**.
- **Acesso ao Neon pelo conector ChatGPT expirou durante a etapa de migração**. Não supor que a migração foi concluída sem nova inspeção.
- Interface do repositório principal atualmente aponta para a API **Supabase** em `frontend/public/config.js`. Não trocar esse endereço até haver uma API Neon operante, testes de login e revisão do responsável.

## Preparação reproduzível
1. Testar os scripts `api/sql/001_init.sql` e `api/sql/002_discipleship.sql` em banco isolado PG18: `.github/workflows/check-neon-schema.yml`.
2. Antes de qualquer migração real, confirmar o banco `neondb`, branch padrão, conexão e estado das tabelas.
3. Preparar migração via conector Neon em **branch temporária**; verificar dez tabelas e integridade de chaves.
4. Aplicar à branch `production` **somente depois de aprovação humana expressa da migração específica**, verificando se não houve divergência de esquema; preferir o fluxo do conector Neon `prepare_database_migration` e `complete_database_migration`.
5. Recontar tabelas e confirmar que a migração não inseriu nenhuma pessoa real.
6. Hospedar a API PHP em servidor com suporte a PostgreSQL (o GitHub Pages serve apenas HTML/JS). Configurar `DATABASE_URL` como **segredo exclusivo do backend**, SSL/TLS obrigatório, `ALLOWED_ORIGINS` restrito ao domínio real.
7. Criar o administrador por ferramenta segura de backend, nunca colocando senha, hash exportado ou `DATABASE_URL` no GitHub.
8. Testar login, cadastro, grupos, acompanhamentos, controle de escopo de usuários, discipulados, backups, responsividade e proteção de dados antes de substituir `frontend/public/config.js`.

## Limites e privacidade
- As **70 respostas anônimas** da pesquisa permanecem no Supabase em tabelas separadas e NÃO são migradas para nomes de diáconos.
- `deacons` e `followups` carregam dados pessoais: jamais armazenar esses registros em repositório, frontend estático ou screenshots públicas.
- O conjunto `test_schema.sql` utiliza somente dados fictícios em uma transação revertida com `ROLLBACK`.
- A branch `feature/neon-schema-ready` é apenas preparação técnica. Seu merge não configura automaticamente o Neon, nem torna a aplicação real acessível.

## Diagnóstico do bloqueio encontrado
O aplicativo Neon aparece instalado, mas suas ações retornaram `link_id must identify an eligible linked account`. Isso é bloqueio de autorização da integração e não falha SQL. Reautorize a conta Neon nas configurações de Plugins/Apps e retorne para fazer a migração com acesso legítimo.
