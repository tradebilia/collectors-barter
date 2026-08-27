# P1 Dependency Upgrade Notes

This record documents the deliberately small production dependency remediation carried out after the P1 audit approval. It is not an automatic `audit fix` result.

| Decision | Evidence | Result |
| --- | --- | --- |
| Update AWS SDK and Axios | The production audit provided direct patched transitive targets under the installed AWS SDK and Axios paths. | Updated both AWS SDK packages to 3.1119.0 and Axios to 1.20.0. |
| Remove Streamdown rather than perform a major upgrade | `AIChatBox` was used only by the unregistered `ComponentShowcase` page. The production application has no route to that page. Streamdown’s own security guidance says renderer configuration must be tightened for untrusted Markdown.[1] | Removed the unreachable development-only page, its sole chat component, and Streamdown’s Mermaid dependency tree. |
| Update tRPC, Drizzle, NanoID, and Recharts | The refreshed audit specified patched release thresholds for tRPC, Drizzle, NanoID, and Recharts’ Lodash tree. | Updated compatible direct releases; moved patch/override settings into supported workspace configuration; upgraded Recharts to v3 and adjusted its local type wrapper. |
| Upgrade Express after source review | The official Express 5 guide identifies wildcard route syntax as a breaking change. The source used wildcards for Vite fallthrough and protected storage.[2] | Updated those routes to the named Express v5 syntax, preserved multi-segment storage keys, upgraded to Express 5.2.1, and passed type, build, health, and route-compatibility validation. |

The package-manager configuration was moved from the ignored legacy `package.json` field to `pnpm-workspace.yaml`. This preserves the existing Wouter patch and the required Tailwind NanoID override on future installs.

## References

[1]: https://streamdown.ai/docs/security "Streamdown Security documentation, consulted August 27, 2026"
[2]: https://expressjs.com/en/guide/migrating-5/ "Express: Upgrade to Express v5, consulted August 27, 2026"
[3]: https://github.com/recharts/recharts/wiki/3.0-migration-guide "Recharts 3.0 migration guide, consulted August 27, 2026"
