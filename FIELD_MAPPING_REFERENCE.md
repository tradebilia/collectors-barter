# Field Mapping Reference - Complete Item Type Guide

## Database vs Form Field Name Mapping

**IMPORTANT:** The form uses `gradingCompany` as the field name, but the database stores it as `certificationCompany`. The ItemDetail page displays it as "Grading Company" (the label).

| Database Column | Form Field Name | Display Label | Data Type |
|---|---|---|---|
| `certificationCompany` | `gradingCompany` | Grading Company | varchar(50) |
| `certificationNumber` | `certificationNumber` | Certification Number | varchar(100) |

---

## Grading Company Options by Item Type

### 1. **COINS** (Single Coin, Coin Set, Paper Money)
**Grading Companies:**
- PCGS
- NGC
- ANACS
- ICG
- SEGS
- SGS
- Other

---

### 2. **COMICS** (Single Comic, Original Art, Collection Lot)
**Grading Companies:**
- CBCS
- **CGC Comics** ← This is the correct code name (not just "CGC")
- PGX Comics
- Other

---

### 3. **SPORTS CARDS** (Single Card, Card Set, Unopened Product, Collection Lot)
**Grading Companies:**
- ACE
- AP
- Arena Club
- BGS
- CGA Card Grading
- **CGC Cards** ← Comics uses "CGC Comics", Sports Cards use "CGC Cards"
- Degree
- Diamond Service Grading
- FCG
- GAI
- GEM
- GMA
- HGA
- ISA
- KSA
- MNT
- OnlyGraded
- PCI
- PGA
- PRO
- PSA
- Pokegrade
- RCG
- Rare Edition
- SGC
- TAG Grading
- TRCG
- Tree Frog
- WCG
- Other

---

### 4. **VIDEO GAMES** (Game, Console, Accessory, Collection Lot)
**Grading Companies:**
- CGC Home Video
- **CGC Video Games** ← Video games use "CGC Video Games"
- IGS
- VGA
- WATA
- WATA Games (PSA Video Games)
- Other

---

### 5. **VINTAGE TOYS** (All subtypes)
**Grading Companies:**
- VGA
- IGS
- VHSDNA
- **CGC** ← Toys use just "CGC" (not "CGC Toys")
- Rewind
- Other

---

### 6. **POKEMON** (Unopened Product, Set, Collection Lot)
**Grading Companies:**
- ACE
- AP
- Arena Club
- BGS
- CGA
- **CGC Cards** ← Same as Sports Cards
- Degree
- Diamond
- FCG
- GAI
- GEM
- GMA
- HGA
- ISA
- KSA
- MNT
- OnlyGraded
- PCI
- PGA
- PRO
- PSA
- Pokegrade
- RCG
- Rare Edition
- SGC
- TAG Grading
- TRCG
- Tree Frog
- WCG
- Other

---

### 7. **STAMPS** (Single Stamp, Stamp Set, Collection Lot)
**Grading Companies:**
- PCGS
- NGC
- ANACS
- ICG
- SEGS
- SGS
- Other

---

### 8. **MOVIES** (Individual Movie, Box Set, Collection Lot)
**Grading Companies:**
- CGC Home Video
- CGC Video Games
- IGS
- VGA
- WATA Games (PSA Video Games)
- Other

---

### 9. **AUTOGRAPHS** (Signed Item, Collection Lot)
**Grading Companies:**
- No grading company field (autographs use different authentication methods)

---

### 10. **DISNEY PINS** (Individual Pin, Pin Set, Collection Lot)
**Grading Companies:**
- No grading company field (Disney Pins use different grading systems)

---

## Key Takeaways

1. **CGC has different codes by category:**
   - Comics: `CGC Comics`
   - Sports Cards: `CGC Cards`
   - Video Games: `CGC Video Games`
   - Toys: `CGC`
   - Movies: `CGC Home Video`

2. **Form Field Name:** Always use `gradingCompany` in the form
3. **Database Column:** Always stored as `certificationCompany`
4. **Display Label:** Always show as "Grading Company" to users

5. **Conditional Logic:** Grading Company field only appears when "Is Graded = Yes"

---

## Fix Required

The ItemDetail page should display the label correctly as "Grading Company" (which it does), but ensure that when saving/loading:
- Form sends: `gradingCompany: "CGC Comics"`
- Database stores: `certificationCompany: "CGC Comics"`
- Display shows: "Grading Company: CGC Comics"
