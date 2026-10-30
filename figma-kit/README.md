# SmartHome Premium — Figma-ready UI kit

This folder contains vector SVG mockups based on the supplied visual references. The SVGs can be imported into Figma and edited as vector layers (some SVGs may import as grouped objects; ungroup after import as needed).

## Screens included
- `mobile/01-welcome.svg` — onboarding / welcome
- `mobile/02-home.svg` — home dashboard, scenes, favorite devices, quick actions
- `mobile/03-bedroom-controls.svg` — room detail, lighting, devices, temperature and fan control
- `mobile/04-energy.svg` — energy usage, weekly chart and top consumers
- `web/05-desktop-dashboard.svg` — responsive web dashboard concept
- `assets/reference.png` — user-provided reference image
- `design-tokens.json` — colors, typography, radius and spacing tokens

## Import into Figma
1. Open Figma and create a Design file.
2. Drag an SVG from this folder onto the canvas, or use **File → Place image** and select the SVG.
3. To edit individual elements, right-click the imported SVG and choose **Ungroup** if available. For easier editing, use the SVG as a reference and rebuild repeated elements as Figma components.
4. Create color styles from `design-tokens.json` and apply them to the design system.

## Important
This is a Figma-importable design kit, not a native `.fig` file and not a file published directly into your Figma account. The SVG screens are visual mockups; the app code and actual device integration remain in the project folders. UI controls in the mockups are not interactive prototypes by themselves.
