# Contributing to openclaw-webui

Thanks for your interest in contributing! Here's how to get started.

## Getting Started

1. Fork the repo and clone your fork:

   ```bash
   git clone https://github.com/<your-username>/openclaw-webui.git
   cd openclaw-webui
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env.local` file (see [README](README.md#setup) for required variables).

4. Start the dev server:

   ```bash
   npm run dev
   ```

## Making Changes

1. Create a branch from `main`:

   ```bash
   git checkout -b my-feature
   ```

2. Make your changes and ensure linting passes:

   ```bash
   npm run lint
   ```

3. Commit with a clear, concise message describing the change.

4. Push your branch and open a pull request against `main`.

## Guidelines

- Keep pull requests focused on a single change.
- Follow the existing code style and project structure.
- Run `npm run lint` before submitting.
- Add or update tests if applicable.
- Be respectful and constructive in discussions.

## Reporting Issues

Use [GitHub Issues](https://github.com/artash0001/openclaw-webui/issues) to report bugs or request features. Include steps to reproduce, expected behavior, and any relevant logs or screenshots.
