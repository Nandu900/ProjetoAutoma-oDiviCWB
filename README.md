# ProjetoAutoma-oDiviCWB
repositorio

## Persistência com Supabase

1. Crie um projeto em https://supabase.com.
2. No Supabase, abra **SQL Editor** e execute todo o arquivo `supabase-schema.sql`.
3. Em **Project Settings > API**, copie a **Project URL** e a chave `anon public`.
4. No arquivo `cadeira-cheia-painel-do-salao.html`, substitua:

```js
const SUPABASE_URL = "COLE_AQUI_A_URL_DO_SEU_PROJETO";
const SUPABASE_ANON_KEY = "COLE_AQUI_A_CHAVE_ANON_PUBLICA";
```

5. Recarregue a página. O app carregará clientes e agendamentos diretamente do banco; ele não insere dados de demonstração automaticamente.

Depois disso, novos clientes, novos horários e alterações de status serão gravados no Supabase e continuarão disponíveis após atualizar a página. A tabela `Serviços` será usada para preencher os serviços e valores do formulário de agendamento; se estiver vazia, o app usa temporariamente os serviços padrão do protótipo.

Use somente a chave `anon public` no HTML. Nunca coloque a chave `service_role` no navegador.

As políticas do arquivo SQL são abertas para facilitar o protótipo. Antes de publicar para uso real, configure autenticação e restrinja as políticas por usuário ou salão.
