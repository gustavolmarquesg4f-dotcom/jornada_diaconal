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