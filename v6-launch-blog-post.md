# Introducing Azure DevOps Extension Tasks v6: A Complete Rebuild for Speed, Stability, and Security

_By Jesse Houwing | Azure DevOps Extension Tasks Core Maintainer_

---

## A Journey Through Ten Years

The Azure DevOps Extension Tasks have an interesting heritage. What started as a [private project written in PowerShell](https://github.com/jessehouwing/vsts-extension-tasks) evolved into a critical piece of infrastructure for delivering extensions to the Azure DevOps and Visual Studio Code marketplaces. Over time, it was merged with the ALM Rangers project, adopted by Microsoft DevLabs, and gradually became the **de facto standard** for organizations wanting to automate extension publishing through CI/CD pipelines.

For the past decade, I've had the privilege of maintaining this project, watching it grow from a simple set of PowerShell scripts into a complex, multi-platform suite of tools. During that time, thousands of extensions have been published using these tasks, touching millions of developers worldwide. The [v5 version](https://github.com/microsoft/azure-devops-extension-tasks) served the community well for years, but it was time for a fresh start.

But like many long-running projects, it was time for a reckoning.

---

## The Problem: Growth Without Foundation

When we trace the footprint of the extension tasks, the numbers tell the story of accumulated technical debt:

**The Original PowerShell Implementation**: ~700 KB

- Simple, lean, purpose-built

**After Migration to TypeScript**: ~30 MB

- Better tooling support, stronger typing, but significantly larger

**After Adding AzureRM Support & Visual Studio Extension Publisher**: ~300 MB

- Feature-complete, but bloated and complex

The real breaking point came with **the introduction of signed pipeline requirements for SBOM (Software Bill of Materials) and security compliance**. These mandates forced us into increasingly fragile workarounds:

- Complex hacks to manipulate manifests and VSIX files
- Brittle dependencies on tool versions and undocumented APIs
- Fragile post-processing steps that broke with every update
- An ever-growing backlog of technical debt making each change riskier

Meanwhile, the project had accumulated a critical weakness: **inadequate test coverage**. With such a complex system and so few tests, every change was a potential breaking change. Teams were hesitant to refactor, upgrade dependencies, or try new approaches.

---

## The Decision: Time to Rebuild

After a decade of maintenance and learning what works and what doesn't, I made a decision in late 2024: rather than continue patching a brittle system, I would rebuild the entire project from first principles.

Over those ten years, I frequently wished to refactor the older codebase and managed to chip away at improvements here and there. But without comprehensive test coverage, each refactoring risked breaking something critical in production, used by thousands of organizations. The technical debt accumulated faster than it could be repaid.

The real game-changer came with **GitHub Copilot's Coding Agent**. Rather than me manually rewriting the logic, the agent could:

1. **Extract an extensive test suite** from the existing v5 tasks, understanding the original behavior deeply
2. **Build a new, architecturally superior implementation** that passed all those tests, ensuring functionality remained intact
3. **Consolidate and simplify** the codebase by identifying redundancies and streamlining design patterns
4. **Serve as a rubber ducky** — challenging solution directions, suggesting alternatives, and forcing me to articulate requirements more clearly

This symbiotic relationship between human guidance and AI capability made the rebuild feasible. I could focus on architecture and design while the agent handled the bulk of implementation, constantly validating that nothing broke in the process.

The goal was ambitious:

1. **Clean architecture** - separate concerns, testable code
2. **Comprehensive test coverage** - confidence in every change
3. **Reduced file size** - back to a reasonable deployment footprint
4. **Modern dependencies** - latest TypeScript, security patches, best practices
5. **Cross-platform support** - work identically on Azure Pipelines AND GitHub Actions
6. **Enhanced security** - eliminate reliance on Personal Access Tokens
7. **Long-standing bugs fixed** - address a decade of user requests

The result? **95%+ of the v6 codebase was written by AI agents**, with humans guiding architecture, validating outputs, and managing quality.

The numbers speak for themselves:

- **432 commits** to get from v5 to v6
- **120 pull requests** reviewed and merged
- **500+ tests** covering core logic, integration paths, and end-to-end flows
- **20 MB bundle size** (down from 300 MB)
- **Coverage across Windows, macOS, and Linux** in CI

---

## What's New in v6

### Security First: Workload Identity Federation and OIDC

The most significant security improvement is the elimination of Personal Access Tokens (PATs). While v5 already introduced **AzureRM Workload Identity Federation** for Azure Pipelines, v6 takes this further:

1. **AzureRM Workload Identity Federation (Entra ID)** — _Now works on both platforms_
   - v5: Azure Pipelines only
   - v6: Extended to GitHub Actions as well
   - Use Azure Managed Identity or service principal
   - [Configure AzureRM with Azure App Registration »](https://github.com/jessehouwing/azdo-marketplace#azure-pipelines-azurerm)

2. **Azure DevOps Workload Identity Federation (OIDC)** — _New in v6_
   - Exclusively for GitHub Actions
   - Exchange a GitHub OIDC token for Azure DevOps access
   - Superior to AzureRM for GitHub-native workflows
   - [Configure GitHub-to-Azure DevOps OIDC »](https://github.com/jessehouwing/azdo-marketplace#github-actions-oidc)

3. **Legacy Support**
   - PAT and Basic Auth remain available for backward compatibility

With these methods, your CI/CD pipelines no longer store secrets in service connections or GitHub secrets. Instead, they use short-lived, federated tokens issued by your identity provider. This dramatically improves supply chain security.

Read more about securing your publishing workflows:

- [Say Goodbye to Personal Access Tokens (PATs) - Jesse Houwing »](https://jessehouwing.net/azure-devops-say-goodbye-to-personal-access-tokens-pats/)
- [Publish Azure DevOps Extensions Using Workload Identity (OIDC) - Jesse Houwing »](https://jessehouwing.net/publish-azure-devops-extensions-using-workload-identity-oidc/)

### Unified Platform Support

V6 can be used on **both Azure Pipelines and GitHub Actions**, with identical behavior:

```yaml
# Azure Pipelines
- task: azdo-marketplace@6
  inputs:
    operation: publish
    publisherId: mycompany
    extensionId: my-extension
```

```yaml
# GitHub Actions
- uses: jessehouwing/azdo-marketplace@v6
  with:
    operation: publish
    publisher-id: mycompany
    extension-id: my-extension
```

This unified core means **extension developers can now migrate effortlessly between platforms**, or even use both simultaneously for redundancy.

### New Features

Beyond the rebuild, v6 introduces features requested over the years:

- **Wait for Installation** - add a gate in your pipeline that waits for the extension to install on target organizations
- **Unshare Extension** - remove an extension from shared organizations
- **Unpublish Extension** - remove an extension from the public marketplace completely
- **Read VSIX Metadata** - extract metadata directly from a VSIX file without unpacking it
- **Aligned Inputs** - consistent input names and behavior across all tasks
- **Unified Task Design** - all 10 operations (`package`, `publish`, `install`, `share`, `unshare`, `unpublish`, `show`, `query-version`, `wait-for-installation`, `wait-for-validation`) are one task with an `operation` input

### Comprehensive Testing and CI

The new project features an extensive CI/CD workflow that:

- ✅ Runs **500+ unit and integration tests**
- ✅ Tests on **Windows, macOS, and Linux** runners
- ✅ Validates **every authentication method**
- ✅ Exercises **all CLI code paths**
- ✅ Auto-publishes the task to the marketplace for validation
- ✅ Tests both Azure Pipelines and GitHub Actions adapters

This comprehensive validation means breaking changes are caught before they reach users.

---

## Getting Started

### New to Extension Publishing?

If you're just starting out, here's a minimal CI/CD setup using v6:

1. **Create service connection in Azure DevOps**:
   - Use `AzureRM` (recommended with OIDC WIF)
   - Or `Personal Access Token` for quick start

2. **Set up your Azure Pipelines YAML**:

   ```yaml
   trigger:
     - main

   stages:
     - stage: Package
       jobs:
         - job: Build
           steps:
             - task: azdo-marketplace@6
               inputs:
                 operation: package
                 manifestFile: vss-extension.json
                 outputPath: $(Build.ArtifactStagingDirectory)

     - stage: Publish
       dependsOn: Package
       jobs:
         - job: Publish
           steps:
             - task: azdo-marketplace@6
               inputs:
                 operation: publish
                 vsixFile: $(Pipeline.Workspace)/drop/extension.vsix
                 connectionType: azureRm
                 connectionNameAzureRm: $(serviceConnection)
   ```

3. **For GitHub Actions**, the structure is similar but uses the action syntax.

📖 [Full CI/CD Examples »](https://github.com/jessehouwing/azdo-marketplace/tree/main/docs/examples)

### Migrating from v5?

v5 focused on a task-per-operation model. v6 unifies everything into one operation-routed task. The migration is straightforward:

**v5**:

```yaml
- task: PackageExtension@5
  inputs:
    manifestFile: vss-extension.json
```

**v6**:

```yaml
- task: azdo-marketplace@6
  inputs:
    operation: package
    manifestFile: vss-extension.json
```

Key changes:

- Replace individual tasks with `azdo-marketplace@6`
- Use the `operation` input to select the command
- Adjust input names to match v6 schema
- Update authentication to use `connectionType` and service connections

📖 [Full v5 to v6 Migration Guide »](https://github.com/jessehouwing/azdo-marketplace/blob/main/docs/migrate-azure-pipelines-v5-to-v6.md)

### Migrating to GitHub Actions?

Moving from Azure Pipelines to GitHub Actions? v6 makes this transition smooth:

1. **Switch to GitHub Actions syntax** (same operations available)
2. **Configure OIDC federation** for auth (GitHub Enterprises can use token exchange)
3. **Adjust input names** (kebab-case instead of camelCase)
4. **Update trigger conditions** (GitHub Actions workflow triggers differ from Azure Pipelines)

The business logic remains identical across platforms, so your testing, validation, and publishing flows work exactly the same.

📖 [Full Azure Pipelines to GitHub Actions Migration Guide »](https://github.com/jessehouwing/azdo-marketplace/blob/main/docs/migrate-azure-pipelines-v6-to-github-actions.md)

---

## Supply Chain Security: The Full Picture

V6 strengthens the security model introduced in v5 by expanding federated identity options across platforms and reducing reliance on long-lived credentials.

### Why Workload Identity Matters

**PATs are problematic because**:

- They're typically long-lived tokens stored in CI/CD systems
- If exposed, they grant broad permissions to your entire Azure DevOps organization
- They're difficult to rotate and audit
- They provide no time-based or scope-based granularity

**Workload Identity Federation solves this**:

- Issues **short-lived tokens** (valid for 1 hour)
- Uses **cryptographic proof of identity** rather than shared secrets
- Enables **role-based access control** (who, what, where)
- Provides **full audit trail** through your identity provider
- Supports **automatic token rotation**

### Deploying v6 Safely

How to set up federated identity for maximum security:

**For GitHub Actions → Azure DevOps**:

- Create an Azure App Registration representing your GitHub Actions workflow
- Configure OIDC federation to accept tokens from your GitHub org/repo
- Grant the minimal necessary permissions to that app
- GitHub Actions runner exchanges its OIDC token for Azure DevOps access

**For Azure Pipelines → Azure DevOps (same org)**:

- Use Azure Managed Identity or service principal created by your IT team
- Pipelines uses `DefaultAzureCredential` to obtain tokens automatically
- No secrets in the pipeline configuration

Both approaches eliminate the need for any stored secrets.

---

## Community-Driven Development

This v6 rebuild wouldn't have been possible without **AI-assisted development**. But AI is a tool; the project's direction comes from the community:

- **Thousands of organizations** depend on these tasks monthly
- **Years of user feedback** shaped which bugs to prioritize
- **Community issues** highlighted areas needing improvement

V6 is also built with **the maintainability of contributions in mind**:

- Clean, testable architecture makes adding features straightforward
- Extensive test coverage prevents regressions
- Platform abstraction means changes help users on both Azure Pipelines AND GitHub Actions
- Comprehensive documentation eases onboarding for new contributors

### How You Can Help

I'm committed to making v6 the best version yet. Here's how you can contribute:

1. **Test on your own extensions**: Deploy v6 to your publishing pipelines and share feedback
2. **Report issues**: Use our [GitHub issues tracker](https://github.com/jessehouwing/azdo-marketplace) for bugs or feature requests
3. **Share successes**: Let us know your deployment stories and use cases
4. **Contribute improvements**: Check out our [Contributing Guide](https://github.com/jessehouwing/azdo-marketplace/blob/main/docs/contributing.md)

**Support the Project**: While GitHub Copilot did write 95% of the code, this rebuild still required significant time to guide the agent, shape architectural decisions, review implementations, and refine the final solution. If you find v6 valuable, consider supporting the maintenance and future development through [GitHub Sponsors](https://github.com/sponsors/jessehouwing/). Every contribution—whether financial or through testing and feedback—helps ensure v6 and the broader ecosystem of tools continue to improve.

### Ecosystem Projects

V6 is part of a larger ecosystem of tools for extension developers:

- **[github-actions-dependency-submissions](https://github.com/jessehouwing/github-actions-dependency-submissions)** - automatically report dependencies to GitHub's dependency graph for supply chain visibility
- **[github-actions-semver-checker](https://github.com/jessehouwing/github-actions-semver-checker)** - verify that versioning follows semantic versioning rules and marketplace publishing steps are correct
- **[github-actions-example-checker](https://github.com/jessehouwing/github-actions-example-checker)** - ensure all examples and documentation use correct input names and data types

These projects, combined with v6, create a complete, modern publishing toolkit.

## Path Forward

This release is not the end of the journey; it is the blueprint for what comes next.

Jesse maintains several Azure DevOps extensions, and their CI/CD pipelines will now gradually migrate to GitHub Actions. Wherever it makes sense, those projects will adopt the same rigorous testing approach proven in this v6 rebuild, including broader automation coverage and stronger validation gates.

You can find all of Jesse's Azure DevOps projects here: [Azure DevOps Marketplace - Jesse Houwing](https://marketplace.visualstudio.com/search?term=jessehouwing&target=AzureDevOps&category=All%20categories&sortBy=Relevance).

You can also find Jesse's GitHub Marketplace projects here: [GitHub Marketplace - Jesse Houwing](https://github.com/marketplace?query=jessehouwing).

While most of Jesse's current investment is in GitHub, these other projects will not be abandoned. They will continue to be maintained and improved. The strategic focus, however, is clear: help make the GitHub Actions platform an even better place to build, test, secure, and ship software.

---

## Thank You

This project represents thousands of hours of collective work over 10 years. It's been maintained not out of obligation, but because it genuinely helps the community of extension developers publish safely and reliably.

V6 is both a culmination of lessons learned and a fresh start. It's built for the next chapter of Azure DevOps extension development.

**Ready to get started?**

👉 [Install v6 from the Azure DevOps Marketplace](https://marketplace.visualstudio.com/items?itemName=jessehouwing.azdo-marketplace)

👉 [View the Full Documentation](https://github.com/jessehouwing/azdo-marketplace)

👉 [Report Issues or Request Features](https://github.com/jessehouwing/azdo-marketplace/issues)

---

## Connect With Jesse

You can find Jesse on multiple channels:

**Professional Networks:**

- [GitHub](https://github.com/jessehouwing/) – Code and projects
- [LinkedIn](https://www.linkedin.com/in/jessehouwing/) – Professional updates
- [Microsoft MVP Profile](https://mvp.microsoft.com/en-us/PublicProfile/5001511)
- [Stack Overflow](https://stackoverflow.com/users/736079/jessehouwing) – Q&A

**Social Media:**

- [Twitter/X](https://x.com/jessehouwing)
- [Bluesky](https://bsky.app/profile/jessehouwing.net)
- [Mastodon](https://hachyderm.io/@jessehouwing)
- [Threads](https://www.threads.net/@jesse.houwing)
- [Facebook](https://www.facebook.com/jessehouwing)
- [Instagram](https://www.instagram.com/jesse.houwing/)

**Content & Support:**

- [Blog: jessehouwing.net](https://jessehouwing.net/) – Technical articles and insights
- [GitHub Sponsors](https://github.com/sponsors/jessehouwing/) – Support the work
- [RSS Feed](https://feedly.com/i/subscription/feed/https://jessehouwing.net/rss/) – Subscribe to updates
- [Phone](tel:+31641813338) – Direct contact

---

_Questions? Feedback? I'd love to hear from you. Open an issue, start a discussion, or reach out on any of the channels above._
