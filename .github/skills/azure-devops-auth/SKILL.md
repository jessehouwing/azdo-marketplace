---
name: azure-devops-auth
description: 'Preserve Azure DevOps Services authentication compatibility. USE WHEN: Azure DevOps PAT inputs, Microsoft Entra access tokens, OIDC, workload identity, tfx-cli, Basic or Bearer auth, or Azure DevOps API authentication headers.'
---

# Azure DevOps Services authentication

**A PAT input is not PAT-only.** Any Azure DevOps Services API that accepts a PAT also accepts a valid Microsoft Entra access token for Azure DevOps in the same HTTP Basic password slot. Azure DevOps added this for backward compatibility so existing clients could switch token sources without changing how they send credentials.

- **Existing PAT inputs:** Accept PATs and Entra access tokens. Pass the raw token through as the password; the client builds `Authorization: Basic <base64(username:token)>`. Do not reject an Entra token based on PAT length, format, or the input name.
- **New clients:** Prefer `Authorization: Bearer <access-token>` when the credential is known to be an Entra access token. Keep Basic authentication for PATs.
- **Token requirements:** Use an unexpired access token issued for Azure DevOps, not an ID token, a GitHub token, or an access token for a different audience. Azure DevOps still enforces the identity's permissions. Do not assume the same compatibility for on-premises Azure DevOps Server.

## In this repository

- `AuthCredentials.authType: 'pat'` selects the token path, not the credential's issuer. The OIDC and workload identity providers also return `authType: 'pat'`.
- `tfx-cli` accepts either token through `--auth-type pat --token <token>`; do not prepend `Bearer` or pre-encode the input. The Azure DevOps SDK's PAT handler also sends the token in the Basic password slot.
- `wait-for-installation` sends `X-TFS-FedAuthRedirect: Suppress` to avoid interactive login redirects and `X-VSS-ForceMsaPassThrough: true` for Microsoft account pass-through. These request headers do not replace `Authorization`.
- Mask either token immediately with `platform.setSecret()` and never log the raw token or its encoded Authorization value.

See [Microsoft's Azure DevOps REST authentication examples](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/rest/samples?view=azure-devops) for the preferred Bearer flow.
