# Studio update verification

- Live browser: desktop graphite hero and centered header, four pricing cards, about/stack.
- Mobile 390 × 844: light hero, navigation, pricing, orbits, selected React description and center label.
- 320 × 740: no document horizontal overflow; navigation and orbit fit.
- No missing icon images. Orbit groups contain 3 design, 3 platform, and 7 development tools.
- Selected landing-page offer is preserved and translated when switching RU → EN: 65,000 RUB → 650 EUR, including the contact label and mailto draft. The email link was inspected, not sent.
- Pause/resume and tool selection exercised in the browser. Logo drag produced `coasting` state.
- `qa/rotor.test.mjs`: verifies normal rotation, hover stop, drag input, inertia, idle return while hovered, reduced motion, and independence from refresh rate.
- Browser console had no application errors during the checked flows.
- Viewport override reset after checking. Physical touchscreen and OS mail client were not tested.
