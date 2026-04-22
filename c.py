#!/usr/bin/env python3
"""
Combine entire codebase into a single combined_output.txt file.
Targets React + Tailwind + Supabase projects on macOS.
Usage: python3 combine_codebase.py [/path/to/project]
"""

import os
import sys
from pathlib import Path

# ── CONFIG ──────────────────────────────────────────────────────────────
INCLUDE_EXTENSIONS = {
    # JS / TS / React
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
    # Styling
    '.css', '.scss', '.sass', '.less', '.postcss',
    # Markup / Templates
    '.html', '.htm', '.vue', '.svelte',
    # Config
    '.json', '.yaml', '.yml', '.toml', '.ini', '.env.example',
    # Supabase / DB
    '.sql', '.prisma',
    # Python (edge functions / scripts)
    '.py',
    # Docs
    '.md', '.mdx', '.txt',
    # Shell
    '.sh', '.bash', '.zsh',
    # Misc
    '.graphql', '.gql',
}

INCLUDE_FILENAMES = {
    'Dockerfile', 'docker-compose.yml', '.gitignore', '.dockerignore',
    '.eslintrc', '.prettierrc', '.babelrc', '.editorconfig',
    'tailwind.config.js', 'tailwind.config.ts',
    'postcss.config.js', 'postcss.config.ts',
    'vite.config.js', 'vite.config.ts',
    'next.config.js', 'next.config.mjs',
    'tsconfig.json', 'jsconfig.json',
    'package.json', 'pnpm-lock.yaml',
    'supabase.config.toml',
    'README', 'LICENSE', 'CHANGELOG',
}

EXCLUDE_DIRS = {
    'node_modules', '.next', '.nuxt', 'dist', 'build', 'out',
    '.git', '.svn', '.hg',
    '.vscode', '.idea', '.DS_Store',
    'coverage', '.nyc_output',
    '__pycache__', '.pytest_cache', '.mypy_cache',
    '.turbo', '.vercel', '.netlify',
    'public/assets', 'storybook-static',
    '.cache', 'tmp', 'temp',
    '.supabase',
}

EXCLUDE_FILES = {
    'package-lock.json', 'yarn.lock',
    '.env', '.env.local', '.env.production', '.env.development',
    'combined_output.txt',
}

MAX_FILE_SIZE_MB = 2  # Skip files larger than this


def should_include(file_path: Path, project_root: Path) -> bool:
    # Exclude by filename
    if file_path.name in EXCLUDE_FILES:
        return False

    # Skip anything inside excluded dirs
    try:
        rel_parts = file_path.relative_to(project_root).parts
    except ValueError:
        return False
    if any(part in EXCLUDE_DIRS for part in rel_parts):
        return False

    # Skip hidden files except known config
    if file_path.name.startswith('.') and file_path.name not in INCLUDE_FILENAMES:
        if file_path.suffix not in INCLUDE_EXTENSIONS:
            return False

    # Include by explicit filename
    if file_path.name in INCLUDE_FILENAMES:
        return True

    # Include by extension
    if file_path.suffix.lower() in INCLUDE_EXTENSIONS:
        return True

    return False


def is_binary(file_path: Path) -> bool:
    try:
        with open(file_path, 'rb') as f:
            chunk = f.read(1024)
            return b'\0' in chunk
    except Exception:
        return True


def combine(project_root: Path, output_file: Path) -> None:
    project_root = project_root.resolve()
    files_included = 0
    files_skipped = 0
    total_bytes = 0

    with open(output_file, 'w', encoding='utf-8') as out:
        out.write(f"PROJECT: {project_root.name}\n")
        out.write(f"ROOT: {project_root}\n")
        out.write("=" * 80 + "\n\n")

        for file_path in sorted(project_root.rglob('*')):
            if not file_path.is_file():
                continue

            if not should_include(file_path, project_root):
                files_skipped += 1
                continue

            try:
                size_mb = file_path.stat().st_size / (1024 * 1024)
                if size_mb > MAX_FILE_SIZE_MB:
                    print(f"SKIP (too large {size_mb:.1f}MB): {file_path.relative_to(project_root)}")
                    files_skipped += 1
                    continue

                if is_binary(file_path):
                    files_skipped += 1
                    continue

                rel_path = file_path.relative_to(project_root)
                content = file_path.read_text(encoding='utf-8', errors='replace')

                out.write(f"\n===== FILE: {rel_path} =====\n\n")
                out.write(content)
                if not content.endswith('\n'):
                    out.write('\n')

                files_included += 1
                total_bytes += len(content)
                print(f"OK: {rel_path}")

            except Exception as e:
                print(f"ERROR reading {file_path}: {e}")
                files_skipped += 1

    print("\n" + "=" * 60)
    print(f"Output:   {output_file}")
    print(f"Included: {files_included} files")
    print(f"Skipped:  {files_skipped} files")
    print(f"Size:     {total_bytes / 1024:.1f} KB")
    print("=" * 60)


if __name__ == '__main__':
    project_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()

    if not project_path.exists():
        print(f"Path does not exist: {project_path}")
        sys.exit(1)

    output = project_path / 'combined_output.txt'
    combine(project_path, output)