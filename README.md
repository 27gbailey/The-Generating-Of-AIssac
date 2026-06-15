# The Generating Of AIssac

A room-based roguelike built on encoded room IDs.

## Room format

Each room is a **13-wide by 7-tall** tile grid. Every tile uses a **2-digit object code**. Four extra digits encode doors on the **north, east, south, and west** walls (`0` = no door, `1` = door).

Total room ID length: `(13 × 7 × 2) + 4 = 186` characters.

### Tile codes

| Code | Object |
|------|--------|
| `00` | Floor |
| `01` | Wall |
| `02` | Rock |

### Door digits

Order: `north`, `east`, `south`, `west`

Example: `0010` = door on the south wall only.

## Run locally

Open `index.html` in a browser.

## Repository

https://github.com/27gbailey/The-Generating-Of-AIssac
