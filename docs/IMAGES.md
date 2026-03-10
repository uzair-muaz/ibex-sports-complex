# IBEX Sports Complex — Image Guide

## Where images live

| Path | Purpose |
|------|--------|
| `public/lifestyle/` | Lifestyle section gallery (horizontal scroll). Use **lifestyle-1.webp** … **lifestyle-12.webp**. |
| `public/images/` | Facilities (court) and Amenities (café, food) images. Add files here and keep names below. |
| `public/logo.png` | Site logo (navbar, footer, favicon). |
| `public/logo.svg` | Favicon/icon variant. |

## Lifestyle section (current)

- **Files:** `public/lifestyle/lifestyle-1.webp` … `lifestyle-12.webp` (and optional video).
- **Wired in:** `types/index.ts` → `GALLERY_IMAGES`; used by `InfiniteGallery` in the Lifestyle block.
- **Format:** WebP preferred; same aspect (e.g. 4:3) keeps the scroll even.

## Facilities & Amenities (to add)

Put these in **public/images/** with these exact names so the app finds them:

| Filename | Used in |
|----------|--------|
| `paddle.jpg` | Facilities — Padel court |
| `cricket.webp` | Facilities — Cricket nets |
| `pickleball.jpg` | Facilities — Pickleball court |
| `futsal.jpg` | Facilities — Futsal court |
| `coffee.jpg` | Amenities — Courtside café |
| `food-truck.jpg` | Amenities — Food / nutrition |

- **Style:** Same look across all (lighting, tone). Premium, clean. Teal/navy accents are optional; avoid clashing greens.
- **Aspect:** e.g. 4:3 or 3:2 for cards; keep one ratio per section.

## Adding or changing gallery images

1. Add or replace WebP (or JPG) in `public/lifestyle/`.
2. Name them `lifestyle-N.webp` (N = 1, 2, …) or update `GALLERY_IMAGES` in `types/index.ts` with the new paths and titles.
