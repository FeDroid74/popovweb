# PopovWeb: pricing, personal stack, interactive globe

Implemented for local review, 30 September 2026.

## Structure

1. Restored floating pill header and the original graphite hero, expanded to fill the remaining first viewport. Retained the compact pill theme switch from the portrait version and, following the user's correction, the underlined “Смотреть работы” link.
2. Four website formats and starting prices.
3. Selected work.
4. Process.
5. About Fedor and three interactive tool orbits.
6. FAQ and contact.

The separate services section was removed because the pricing section now explains the service formats. Portfolio concepts and VELORA retain their original status.

## Proposed service pricing

| Format | Russian locale | English locale | Starting scope |
| --- | --- | --- | --- |
| Landing page | from 65,000 RUB | from 650 EUR | One page, up to 8 sections |
| Company website | from 140,000 RUB | from 1,400 EUR | Up to 5 unique pages, CMS for projects/news |
| Catalog | from 190,000 RUB | from 1,900 EUR | Categories, filters, item template, up to 20 initial items; no checkout |
| Online store | from 260,000 RUB | from 2,600 EUR | Catalog, cart, checkout, one payment provider, up to 20 initial products |

These are proposed commercial prices for this local draft, not researched market averages or live currency conversions. The user requested RUB in Russian and EUR in English. The final scope, timeline, and price are agreed before starting. The UI states that domain, hosting, platform subscriptions, paid services, and larger content imports are separate.

Choosing a format shows it in the contact section and populates a mailto draft in the current language. No messages are sent automatically.

## Orbit grouping

- Inner: Figma, Photoshop, Illustrator — visual design.
- Middle: Framer, Tilda, WordPress — site platforms and content management.
- Outer: HTML, CSS, JavaScript, TypeScript, React, Next.js, Tailwind CSS — development.

Hover/focus pauses motion; selection displays a localized description and the selected name in the center. Horizontal dragging rotates the orbits; vertical touch scrolling remains available. There is a separate persistent pause/resume button. Automatic motion and inertia respect reduced-motion settings. Animation loops stop when the scene is paused, outside the viewport, or the document is hidden.

## Logo behavior

“Popov” plus a canvas wireframe globe replaces “Web”. Home navigation is a separate link so dragging never follows a URL. Hover stops automatic rotation; drag/flick applies time-based momentum. After damping and a short idle period, normal rotation resumes, including when the pointer remains still above the globe. Keyboard arrows position it manually; Space/Enter pause or resume. Pointer cancellation releases drag state.

## Assets

Stack icons are stored locally in `assets/stack`:

- Devicon v2.16.0: HTML5, CSS3, JavaScript, TypeScript, React, Next.js, Tailwind CSS, WordPress, Figma, Photoshop, Illustrator. Source: https://github.com/devicons/devicon/tree/v2.16.0/icons. License saved as `assets/stack/DEVICON-LICENSE.txt`.
- Simple Icons: Framer and Tilda Publishing. Source: https://github.com/simple-icons/simple-icons/tree/develop/icons. Distributed under CC0; brand trademarks remain with their owners.

No runtime CDN dependency. Previous portrait assets and concept demos remain available but are not used by the current hero.
