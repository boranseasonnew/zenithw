# Git commit authorship

- Keep Boran as the primary author of commits: `boranseason <214559288+boranseasonnew@users.noreply.github.com>`.
- Every Git commit to which Codex contributes must end with the following trailer, separated from the commit body by a blank line:

  `Co-authored-by: Codex <codex@openai.com>`

- Do not replace the primary author with Codex or rewrite old commits to add this trailer.

## Website dependency locks

- Cloudflare Pages installs with pnpm. When changing root dependencies, update both `package-lock.json` and `pnpm-lock.yaml`.
- Verify `pnpm install --frozen-lockfile` and the complete website production build in an isolated checkout before pushing dependency changes.
