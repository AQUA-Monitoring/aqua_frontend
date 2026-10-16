# Login e cadastro com Google

As duas telas usam `GoogleAuthButton.vue`, com o botão oficial do Google.
A configuração vem de `GET /api/auth/google/config/`: não configure client secret
nem copie o ID do Google para variáveis Vite. O backend precisa da configuração
`GOOGLE_OAUTH_CLIENT_ID` e das origens JavaScript autorizadas no Google Cloud.

O componente envia `{credential, challenge}` para `POST /api/auth/google/` e
persiste `{user, tokens}` no store de autenticação existente. Erros do endpoint
Google não disparam renovação de sessão nem exibem mensagens de senha incorreta.
A cada repetição é obtido um nonce novo. Se a API informar `enabled: false`, a
opção Google fica oculta; email e senha continuam disponíveis.

O módulo carrega o SDK apenas nessas telas. A configuração deve permitir
`https://accounts.google.com/gsi/client` e os recursos de iframe do Google se uma
política CSP for adicionada no servidor.

Validação real: autorize as origens `https://5000.michalski.app` e
`https://aqua.michalski.app`, configure o ID público no backend e confira uma conta
nova e uma conta já vinculada, incluindo `/users/me/` e renovação dos tokens.

Contrato e política de vínculo estão em `aqua_backend/docs/google-login.md`.
