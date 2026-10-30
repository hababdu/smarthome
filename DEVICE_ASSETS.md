# SmartHome product images

Individual transparent PNG device cutouts are in `public/assets/devices/`.

The React web UI now uses these images in:
- Home screen favorite-device cards (`HomeScreen.tsx`)
- Device detail hero (`DeviceDetailScreen.tsx`)

Current device-kind mapping:
- `light` -> adjustable spotlight
- `tv` -> ceiling panel
- `iron`, `coffee` -> smart plug
- `fridge` -> smart thermostat
- other kinds -> touch control panel

Additional catalog assets are available for future device types: pendant bulb, wall sconce, recessed downlight, LED strip, table lamp, floor lamp and motion sensor.

Copying the assets to another deployment: keep the folder at `public/assets/devices/` so the `/assets/devices/...` paths resolve.
