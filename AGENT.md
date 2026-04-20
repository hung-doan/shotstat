# shotstat

## Project Overview

`shotstat` is a command-line EXIF analysis tool for inspecting image shooting parameters. It reads metadata embedded in image files and surfaces key photographic settings in a readable format.

## Business Purpose

Photographers and developers often need to quickly audit shooting parameters across a set of images — without opening each file in an editor. `shotstat` solves this by providing a fast, scriptable CLI that extracts and displays:

- **Exposure** (EV / exposure value)
- **Focal length**
- **Shutter speed**
- **Aperture** (f-stop)
- **ISO** sensitivity

Use cases include reviewing session consistency, debugging exposure issues, batch auditing camera settings, and integrating into photo processing pipelines.

## Technical Stack

| Concern        | Choice                          |
|----------------|---------------------------------|
| Language       | TypeScript                      |
| Runtime        | Node.js                         |
| EXIF parsing   | EXIF library (reads image metadata) |
| Interface      | Command-line (CLI)              |

## Project Structure

```
shotstat/
├── src/           # TypeScript source files
├── dist/          # Compiled JavaScript output
├── package.json
├── tsconfig.json
└── AGENT.md
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run (interactive prompts will ask for directory, recursion, and output format)
node dist/index.js
```

## Agent Guidelines

- All source code lives under `src/` and is written in TypeScript.
- EXIF extraction is performed using a dedicated EXIF-reading library; do not use `child_process` to call external binaries for this purpose.
- CLI argument parsing should remain lightweight — avoid heavy frameworks unless the command surface grows significantly.
- Output should be human-readable by default; structured output (e.g., JSON) may be added as an opt-in flag.
- Do not store or transmit image data; this tool operates entirely locally.
