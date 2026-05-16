# SiK Radio Tools

A browser-based configurator for SiK telemetry radios (900 MHz / 433 MHz). Connects over USB via the Web Serial API — no install required.

**Live app:** https://romankalinchuk.github.io/SIK-Radio-Tools/

> Requires Chrome or Edge on desktop over HTTPS (or localhost).

## Features

- **Settings** — load, edit, and save radio parameters; export/import JSON configs
- **Terminal** — AT command console with history
- **Firmware** — flash SiK `.hex` files via the bootloader
- **Profiles** — save and load named configurations
- **Advanced** — direct S-register access for firmware variants not covered by the schema
- **Demo mode** — explore the UI without hardware

## Requirements

- Chrome or Edge on desktop — Web Serial is not available in Firefox or Safari
- HTTPS or `localhost` (required by Web Serial)
- SiK radio connected via USB

## Local development

```bash
cd sik-radio-tools
npm install
npm run build
npx --yes serve .
```

Open the URL shown in Chrome or Edge.

## Deployment

Build output is `index.html` + `dist/`. The included GitHub Actions workflow (`.github/workflows/github-pages.yml`) builds and publishes to GitHub Pages on every push to `main`.

**One-time GitHub Pages setup:**
1. **Settings → Pages → Build and deployment** — set Source to **GitHub Actions**
2. **Settings → Actions → General → Workflow permissions** — set to **Read and write permissions**

## Project layout

```
sik-radio-tools/
├── src/
│   ├── ui/          # Tab components
│   ├── protocol/    # AT command client, bootloader, HEX parser
│   ├── transport/   # Web Serial + mock transport
│   ├── params/      # Parameter schema and mapper
│   └── persistence/ # localStorage settings and profiles
├── tests/
├── samples/         # Example config JSONs
└── dist/            # Build output
```

See [`sik-radio-tools/DOCUMENTATION.md`](sik-radio-tools/DOCUMENTATION.md) for architecture and hardware notes.

## Attribution

Based on [JamesM9/SIK-Radio-Tools](https://github.com/JamesM9/SIK-Radio-Tools).

## License

MIT
