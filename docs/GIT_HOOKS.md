# Git Hooks Setup

This project uses git hooks to enforce code quality standards before pushes to the main branch.

## What it does

- **Pre-push hook**: Runs `bun lint` and `bun typecheck` before allowing pushes to `main`
- **Quality control**: Ensures no linting errors or type errors reach the main branch
- **Branch-specific**: Only runs on pushes to `main` branch (feature branches are not affected)

## Prerequisites

- **Node.js**: Version 18+ is required (the project uses modern JavaScript features)
- **Bun**: Must be installed and available in PATH

## Setup

### For new team members

1. Clone the repository
2. Ensure you have Node.js 18+ installed
3. Run the setup script:
   ```bash
   ./setup-hooks.sh
   ```

That's it! The hooks will be automatically configured.

### Manual setup (if needed)

If the setup script doesn't work for some reason:

1. Configure git to use custom hooks directory:
   ```bash
   git config core.hooksPath .githooks
   ```

2. Make the pre-push hook executable:
   ```bash
   chmod +x .githooks/pre-push
   ```

## How it works

When you push to `main`, the hook will:

1. Check if you're pushing to the `main` branch
2. If yes, run `bun lint` - must pass with 0 errors/warnings
3. If linting passes, run `bun typecheck` - must pass with 0 errors
4. If both pass, allow the push
5. If either fails, abort the push with an error message

## Bypassing the hook

In emergency situations, you can bypass the hook:

```bash
git push --no-verify
```

**⚠️ Use this sparingly** - it defeats the purpose of quality control.

## Troubleshooting

### Node.js version issues
- **Error**: `SyntaxError: Unexpected token ?`
- **Solution**: Update Node.js to version 18 or higher
- **Check version**: `node --version`
- **Temporary workaround**: Use `git push --no-verify` (not recommended)

### Hook not running
- Check if hooks are configured: `git config core.hooksPath`
- Should return `.githooks`
- If not, run `./setup-hooks.sh` again

### Permission denied
- Make sure the hook is executable: `chmod +x .githooks/pre-push`

### Bun not found
- Install bun: https://bun.sh/docs/installation
- Make sure it's in your PATH

## For maintainers

### Adding new hooks

1. Create the hook file in `.githooks/` directory
2. Make it executable: `chmod +x .githooks/hook-name`
3. Update the setup script if needed
4. Document the new hook in this file

### Modifying existing hooks

1. Edit the hook file in `.githooks/`
2. Test thoroughly on a feature branch
3. Update documentation if the behavior changes

## Files involved

- `.githooks/pre-push` - The actual pre-push hook script
- `setup-hooks.sh` - Setup script for configuring hooks
- `docs/GIT_HOOKS.md` - This documentation file
