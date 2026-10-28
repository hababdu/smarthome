# SmartHome Premium Dark / Light Design Update

## What changed
- Added a premium dark palette based on charcoal surfaces with violet/blue accents.
- Added a persistent dark/light switch to the React header (`localStorage: smarthome-theme`).
- Added responsive wide-screen content sizing while preserving the existing screens and controls.
- Refined shared surfaces, borders, focus rings, scrollbars, and reduced-motion behavior.
- Added a persisted dark/light theme switch to Flutter (`shared_preferences: smarthome-light-theme`).
- Standardized Flutter theme colors, cards, app bars, navigation bar, inputs, and voice action button.

## Verify locally

Web:
```bash
npm install
npm run build
npm test
```

Flutter (from `mobile/`):
```bash
flutter pub get
flutter analyze
flutter test
```

The current environment did not have the npm dependencies or Flutter SDK installed. An npm install attempt timed out, so a production web build and Flutter analyzer/build could not be verified here. Backend unit tests were run successfully (13/13).

## Important
The light theme is a shared styling pass over existing screen components. Review all modal and device states on desktop/mobile before production release; this is a UI update, not a hardware safety certification.
