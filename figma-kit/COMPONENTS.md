# Component inventory

## Foundations
- Background: `#151719`
- Surface / cards: `#222528`
- Raised surface: `#2B2E31`
- Primary text: `#F7F7F5`
- Secondary text: `#A6AAAE`
- Accent / active controls: `#FF9B45`
- Success: `#8BCB9A`

## Components to create as Figma components
1. Device card — icon, title, room, status, toggle
2. Scene chip — active/inactive variants
3. Bottom navigation — Home, Devices, Scenes, Automation, Profile
4. Metric card — title, value, trend, icon
5. Device brightness slider — active track and thumb
6. Temperature control — decrement, track, increment
7. Energy bar chart — axis labels, bars, day labels
8. Top consumer row — icon, device name, kWh, percentage, progress bar
9. Status badge — online, offline, warning
10. Theme variables — Dark and Light modes

## Interaction prototype suggestions
- Welcome → Home
- Home device card → Room/device detail
- Home Energy metric → Energy Usage
- Scene chip → active state and confirmation
- Bottom navigation → Home / Devices / Scenes / Automation / Profile
- Theme switch → Light/Dark variable mode

## Accessibility
Use at least 14 px body text for primary controls, maintain strong contrast, do not use color alone to communicate device state, and provide visible offline/error states. Validate contrast and touch targets in the implementation.
