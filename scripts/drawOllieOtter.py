#!/usr/bin/env python3
"""Draw Ollie the Otter's sprite sheet: public/images/characters/people/ollieOtter.png

A tiny, chibi otter - deliberately shorter than the hero (13px tall vs 17px) so he
reads as small and cute next to the human characters.

Output is the engine's standard sheet layout: 128x128 = a 4x4 grid of 32x32 frames.
Rows are down / right / up / left; column 0 is idle and columns 1 and 3 are the
walk frames (see FOUR_FRAME_ANIMATIONS in src/engine/Sprite.js). Column 2 is
unused by the animations but filled with the idle pose anyway.

Run:  python3 scripts/drawOllieOtter.py
"""

from PIL import Image

TILE = 32
BASELINE = 28  # feet sit here, matching billy.png / Dreamwalker.png

PALETTE = {
    ".": None,
    "o": (54, 34, 22, 255),    # outline
    "b": (146, 94, 60, 255),   # body brown
    "l": (176, 122, 82, 255),  # highlight
    "c": (246, 222, 186, 255), # cream belly + muzzle
    "e": (22, 14, 8, 255),     # eye
    "w": (255, 255, 255, 255), # eye shine
    "n": (60, 38, 26, 255),    # nose
    "p": (86, 56, 38, 255),    # paws / feet
}

# ----------------------------------------------------------------- front (down)
# Big round head, little ears on top, oversized eyes - chibi proportions, so he
# reads as cute rather than as a small realistic animal.
DOWN = [
    "..oo......oo..",
    ".obbo....obbo.",
    ".obboooooobbo.",
    "obbbbbbbbbbbbo",
    "obbwwbbbbwwbbo",
    "obbewbbbbewbbo",
    "obbbbcccccbbbo",
    "obbbbcnncbbbbo",
    ".obbbcccccbbo.",
    "..oobbbbbboo..",
    "...obccccbo...",
    "..obbccccbbo..",
    "...obbbbbbo...",
    "...pp....pp...",
]

# ------------------------------------------------------------------ back (up)
# Facing away: no face at all, just the back of the head, ears and a tail.
UP = [
    "..oo......oo..",
    ".obbo....obbo.",
    ".obboooooobbo.",
    "obbbbllllbbbbo",
    "obbbbbbbbbbbbo",
    "obbbbbbbbbbbbo",
    "obbbbbbbbbbbbo",
    "obbbbbbbbbbbbo",
    ".obbbbbbbbbbo.",
    "..oobbbbbboo..",
    "...obbbbbbo...",
    "..obbbbbbbbo..",
    "...obbbbbbo...",
    "...pp.oo.pp...",
]

# ------------------------------------------------------------- profile (right)
# One ear visible, muzzle and nose poke out to the right, tail sweeps behind.
RIGHT = [
    "...oo.........",
    "..obbooooo....",
    "..obbbbbbbo...",
    "..obbllbbbbo..",
    "..obbwwbbbbo..",
    "..obbewbbcno..",
    "...obbbbbcco..",
    "...obbbbbcco..",
    "..ooobbbbbco..",
    ".obbboccccbo..",
    "obbbbbcccbo...",
    ".obbbbcccbo...",
    "...obbbbbbo...",
    "...pp..pp.....",
]


def flip(rows):
    return ["".join(reversed(row)) for row in rows]


LEFT = flip(RIGHT)


def bob(rows, lift, feet):
    """A walk frame: shift the whole body up by `lift` and restyle the feet row."""
    body = rows[:-1]
    out = list(body)
    if lift:
        # drop a blank row in at the top so the body rides one pixel higher
        out = out[1:] + [body[-1]]
    return out + [feet]


def frame_variants(rows):
    """(idle, walkA, idleCopy, walkB) for one direction."""
    width = len(rows[0])
    left_step = "".join("p" if i in (3, 4) else "." for i in range(width))
    right_step = "".join("p" if i in (width - 5, width - 4) else "." for i in range(width))
    return [rows, bob(rows, 1, left_step), rows, bob(rows, 1, right_step)]


def paste(sheet, rows, col, row_index):
    for row in rows:
        assert len(row) == len(rows[0]), f"ragged art: {row!r}"
    height = len(rows)
    width = len(rows[0])
    ox = col * TILE + (TILE - width) // 2
    oy = row_index * TILE + BASELINE - height + 1
    for y, line in enumerate(rows):
        for x, ch in enumerate(line):
            color = PALETTE[ch]
            if color:
                sheet.putpixel((ox + x, oy + y), color)


def main():
    sheet = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    for row_index, art in enumerate([DOWN, RIGHT, UP, LEFT]):
        for col, variant in enumerate(frame_variants(art)):
            paste(sheet, variant, col, row_index)
    out = "public/images/characters/people/ollieOtter.png"
    sheet.save(out)
    print(f"wrote {out} ({sheet.size[0]}x{sheet.size[1]})")


if __name__ == "__main__":
    main()
