# shotstat

A command-line tool that scans a directory of images, extracts EXIF metadata, and generates a habit report — helping you understand your shooting patterns at a glance.

## Features

- Recursive directory scanning
- Supports JPEG, PNG, HEIC/HEIF, and RAW formats (DNG, CR2, NEF, ARW)
- Per-image extraction of camera name, resolution, exposure value, focal length, shutter speed, aperture, and ISO
- Aggregate statistics per metric: min, max, average, p90, p95, p99 (missing values excluded; sample count shown per metric)
- Image type distribution and top camera models by image count
- Resolution summary
- Live processing status with percentage and processed image count
- Human-readable table output (default) or JSON output for scripting

## Requirements

- Node.js v18 or later
- npm

## Installation

```bash
git clone https://github.com/hung-doan/shotstat.git
cd shotstat
npm install
npm run build
```

## Usage

Run the CLI:

```bash
node dist/index.js
```

Or, if installed globally via `npm link` or `npm install -g`:

```bash
shotstat
```

The tool launches an **interactive prompt** with four questions:

```
? Image directory to scan:   <path to your photos folder>
? Scan subdirectories recursively?  (Y/n)
? Output format:  (Use arrow keys)
  ❯ Human-readable table
    JSON
? Group statistics by:  (Use arrow keys)
  ❯ No grouping
    Camera name
```

| Prompt | Description | Default |
|---|---|---|
| Image directory | Path to scan for images (validated before proceeding) | current working directory |
| Recursive scan | Whether to include all subdirectories | yes |
| Output format | Terminal table or JSON | Human-readable table |
| Group statistics by | Aggregate globally or per camera name | No grouping |

During EXIF extraction, the CLI shows a live status line in the terminal:

```
Processing: 42% (210/500)
```

In JSON mode, progress is written to stderr so stdout remains valid JSON for scripting.

## Sample Output

### Human-readable table

```
Image Habit Report
=================
Directory: /Users/you/Photos/2025
Recursive: true
Number of images: 342
Processed: 339
Errors: 3

Image types:
  jpeg: 310
  dng: 29
  png: 3

Top camera names:
  Sony ILCE-7M4: 298
  Apple iPhone 15 Pro: 44

Top resolutions:
  7008x4672: 298
  4032x3024: 41
  1920x1080: 3

Statistics:
Exposure (EV) (samples: 310)
  min: -2.00
  max: 3.00
  avg: 0.12
  p90: 1.00
  p95: 1.67
  p99: 2.33
Focal Length (samples: 327)
  min: 16.00mm
  max: 200.00mm
  avg: 52.40mm
  p90: 105.00mm
  p95: 135.00mm
  p99: 180.00mm
Shutter Speed (samples: 327)
  min: 1/4000s
  max: 1/4s
  avg: 1/320s
  p90: 1/60s
  p95: 1/30s
  p99: 1/15s
Aperture (samples: 327)
  min: 1.80
  max: 22.00
  avg: 4.20
  p90: 8.00
  p95: 11.00
  p99: 16.00
ISO (samples: 327)
  min: 50
  max: 51200
  avg: 1240.00
  p90: 3200.00
  p95: 6400.00
  p99: 25600.00
```

### JSON output

```json
{
  "numberOfImages": 342,
  "scannedDirectory": "/Users/you/Photos/2025",
  "recursive": true,
  "processedCount": 339,
  "skippedCount": 0,
  "errorCount": 3,
  "imageTypes": { "jpeg": 310, "dng": 29, "png": 3 },
  "topCameraNames": [
    { "name": "Sony ILCE-7M4", "count": 298 },
    { "name": "Apple iPhone 15 Pro", "count": 44 }
  ],
  "resolutions": [
    { "resolution": "7008x4672", "count": 298 }
  ],
  "stats": {
    "iso": {
      "sampleCount": 327,
      "min": 50,
      "max": 51200,
      "average": 1240,
      "p90": 3200,
      "p95": 6400,
      "p99": 25600
    }
  },
  "errors": []
}
```

## Supported Image Formats

| Extension | Format |
|---|---|
| `.jpg` / `.jpeg` | JPEG |
| `.png` | PNG |
| `.heic` / `.heif` | HEIC/HEIF (Apple) |
| `.dng` | Adobe DNG RAW |
| `.cr2` | Canon RAW |
| `.nef` | Nikon RAW |
| `.arw` | Sony RAW |

Files with unsupported extensions are silently skipped. Files that fail EXIF parsing are counted under **Errors** and listed at the bottom of the report.

## Development

```bash
# Watch mode (recompiles on save)
npm run dev

# Manual build
npm run build

# Run directly
npm start
```

## License

ISC
