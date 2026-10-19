# API — versão 0.1

Base: `http://localhost:8080` em desenvolvimento. Conteúdo JSON UTF-8. Todas as rotas exceto `/health` e `/auth/login` exigem `Authorization: Bearer <token>`.

| Método | Rota | Permissões | Finalidade |
|---|---|---|---|
| GET | `/health` | Público | Healthcheck sem dados |
| POST | `/auth/login` | Público | Login: `email`, `password` |
| GET | `/auth/me` | Logado | Perfil atual |
| POST | `/auth/logout` | Logado | Revogar token |
| GET | `/dashboard` | Logado | Quantidades agregadas conforme permissão |
| GET | `/deacons` | Logado | Cadastro filtrado por permissão |
| POST | `/deacons` | Admin/Coord | Criar diácono |
| PATCH | `/deacons/{id}` | Admin/Coord | Editar dados/situação |
| GET | `/groups` | Logado | Grupos acessíveis |
| POST | `/groups` | Admin/Coord | Criar grupo |
| PATCH | `/groups/{id}` | Admin/Coord | Atualizar nome, limite ou responsável |
| POST | `/groups/{id}/members` | Admin/Coord | Vincular `deacon_id` |
| GET | `/followups?deacon_id=UUID` | Logado | Registros acessíveis |
| POST | `/followups` | Logado | Registrar acompanhamento |
| GET | `/users` | Admin/Coord | Listar usuários |
| POST | `/users` | Admin | Criar usuário |

Exemplo de registro objetivo:

```json
{
  "deacon_id": "<uuid-do-diacono>",
  "method": "mensagem",
  "outcome": "retornar",
  "summary": "Conversamos sobre disponibilidade; combinamos novo contato.",
  "next_contact_on": "2026-11-05",
  "needs_pastoral_attention": false
}
```

Não inclua diagnósticos, situações íntimas ou informações de terceiros em `summary`.
## Discipulados — evolução v0.2 (ramificação em revisão)

**Aplique antes a migração** `api/sql/002_discipleship.sql` no banco do sistema de cuidado (não no banco da pesquisa anônima).

| Método | Rota | Permissões | Finalidade |
|---|---|---|---|
| GET | `/discipleships` | Logado | Listar encontros e totais agregados |
| POST | `/discipleships` | Admin/Coord | Agendar encontro para todo o diaconato |
| GET | `/discipleships/{id}/attendance` | Logado | Listar participantes; responsável vê somente seus grupos |
| POST | `/discipleships/{id}/attendance` | Logado | Registrar presença ou impedimento; responsável registra somente seus grupos |

Exemplo de agendamento em horário **de Brasília**:

```json
{"title":"Chamado e compromisso","scheduled_at":"2026-11-08T17:00","location":"Sala de discipulado"}
```

Exemplo de atualização de participação:

```json
{"deacon_id":"<uuid-do-diacono>","attendance":"present"}
```

`attendance` pode ser `present` (presente), `unable` (impedimento informado) ou `unreported` (limpa o lançamento anterior; não informado).

**Não informado não significa faltoso.** É proibido interpretar falta de registro como falta de compromisso. Os encontros incluem antigos e novos, independentemente de grupo de cuidado ou da participação na pesquisa. Não registrar motivos de saúde ou assuntos íntimos neste módulo.

**Validação necessária antes de publicar:** migrar banco de homologação, testar os quatro endpoints com perfis admin/coord/responsável, verificar fronteiras de acesso entre grupos, testar agendamento em horário de Brasília, revisar usabilidade em celular e confirmar recuperação/backup.
