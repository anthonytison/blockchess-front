![Alt text](../app/public/brand.png "a title")

# Easter Eggs

BlockChess includes several hidden features and easter eggs for players to discover. This document reveals them all!

## Pixel Mode (Konami Code)

### How to Activate

Enter the **Konami Code** sequence on your keyboard:

```
↑ ↑ ↓ ↓ ← → ← → B A
```

Or in keyboard terms:
- **Up Arrow** (twice)
- **Down Arrow** (twice)
- **Left Arrow**
- **Right Arrow**
- **Left Arrow**
- **Right Arrow**
- **B**
- **A**

### What It Does

Activating the Konami Code toggles **Pixel Mode**, which changes the entire application to use a retro pixel font!

**Features**:
- All text switches to pixel font
- Retro gaming aesthetic
- Toggle on/off by entering code again
- Persists across page reloads (saved in localStorage)


### Keyboard Layout Support

The code works with any keyboard layout (QWERTY, AZERTY, etc.) because:
- Arrow keys use physical position (same on all layouts)
- Letter keys use logical characters (works with any layout)

## HAL - The Computer Opponent

### The Reference

The computer opponent is named **HAL**, a reference to **HAL 9000** from Arthur C. Clarke's "2001: A Space Odyssey" and Stanley Kubrick's film adaptation.

### Why HAL?

- **Iconic AI**: HAL is one of the most famous AI characters in science fiction
- **Chess Connection**: HAL was known for playing chess (though not always fairly)
- **Nostalgia**: A nod to classic science fiction
- **Personality**: Gives the computer opponent character and personality

### HAL in BlockChess

- **Name Display**: Appears as "HAL" in game UI
- **Difficulty Levels**: Easy, Intermediate, Hard (HAL's skill levels)
- **Game Messages**: References to HAL in game status messages
- **Database ID**: Stored as `NEXT_PUBLIC_HAL_ID` environment variable

### HAL Quotes (Future Feature)

Potential future additions:
- HAL's famous line: "I'm sorry, Dave. I'm afraid I can't do that."
- Contextual messages based on game state
- Personality-based move commentary

## ☠️ Goonies ☠️

### The Movie

**The Goonies** (1985), directed by Richard Donner and produced by Steven Spielberg, tells the story of a group of misfit kids from the "Goon Docks" neighborhood of Astoria, Oregon. Facing the foreclosure of their homes, they embark on a treasure hunt following an old pirate map, leading them through underground tunnels, booby traps, and encounters with a family of criminals. The film captures the essence of childhood adventure, friendship, and the belief that "Goonies never say die!"

### A Generation's Reference

For a generation of nerds and geeks who grew up in the 80s, **The Goonies** became more than just a movie—it became a cultural touchstone. It spoke to the underdogs, the kids who felt different, the ones who found solace in adventure stories and treasure maps. The film's celebration of intelligence, creativity, and loyalty resonated deeply with those who would later become the tech-savvy, problem-solving generation that built the internet age. The catchphrase "Goonies never say die!" became a rallying cry for perseverance, embodying the spirit of never giving up in the face of impossible odds.

### A Personal Favorite

This movie holds a special place in my heart. It's not just nostalgia—it's a reminder of the power of friendship, adventure, and believing in the impossible. The Goonies represents everything I love about storytelling: ordinary kids doing extraordinary things, using their wits and teamwork to overcome challenges. It's a film I return to again and again, and it's an honor to pay tribute to it in BlockChess.

## Technical Implementation

### Konami Code Detection

```typescript
// front/app/src/hooks/use-konami-code.ts
export function useKonamiCode(onSuccess: () => void) {
  // Tracks key sequence
  // Matches against Konami code
  // Calls callback on match
}
```

### Pixel Font Toggle

```typescript
// front/app/src/app/context/font-provider.tsx
const handleKonamiCode = () => {
  setIsPixelFont(prev => !prev);
};
```

## Fun Facts

1. **Konami Code Origin**: Created for Konami games in the 1980s
2. **HAL 9000**: First appeared in "2001: A Space Odyssey" (1968)
3. **The Goonies**: Released in 1985, directed by Richard Donner, produced by Steven Spielberg
4. **Pixel Fonts**: Popular in retro gaming aesthetics
5. **Easter Eggs**: Common in software development culture


## Credits

- **Konami Code**: Konami Corporation
- **HAL 9000**: Arthur C. Clarke / Stanley Kubrick
- **The Goonies**: Richard Donner / Steven Spielberg / Chris Columbus
- **Pixel Fonts**: Retro gaming community
- **Easter Egg Culture**: Software development community

---

*Keep exploring! There might be more secrets waiting to be discovered...*

