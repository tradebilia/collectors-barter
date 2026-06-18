# Collectibles Trading Platform - Field Specifications (Fixed)

Collectibles Trading Platform - Complete Category, Item Type, and Field Specification

> \\\*\\\*Purpose:\\\*\\\* This is the no-placeholder implementation list for the Add Item flow. Category is the first dropdown. Item Type is the second dropdown. The selected Item Type determines the fields shown. Dropdown Fields lists exact dropdown options. If Supports Other = Yes, show the corresponding Other Field Name when the user selects Other.

#### Category and Second Dropdown Summary

**Category (First Dropdown) | Item Types (Second Dropdown)**
Sports Cards | Single Card, Unopened Product, Set, Collection/Lot
Comics | Single Comic, Original Art, Collection/Lot
Video Games | Game, Console, Accessory, Collection/Lot
Vintage Toys | Action Figure / Doll, Vehicle, Playset, Board Game / Puzzle, Plush / Stuffed Toy, Electronic Toy, Model / Kit, Die-Cast Car, Collection/Lot
Stamps | Single Stamp, Stamp Set / Sheet, Collection/Lot
Coins | Single Coin, Coin Set, Paper Money / Banknotes, Collection/Lot
Movies | Individual Movie, Box Set, Collection/Lot
Autographs | Signed Item, Collection/Lot
Disney Pins | Individual Pin, Pin Set, Collection/Lot
Pokemon | Single Card, Unopened Product, Set, Collection/Lot



## Sports Cards

**SECOND DROPDOWN OPTIONS: Single Card, Unopened Product, Set, Collection/Lot**



### Single Card

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Conditional|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Is Graded = No||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Sport|Dropdown|Required|Baseball, Basketball, Football, Hockey, Soccer, Racing, Wrestling, Golf, MMA, Tennis, Multi-Sport, Other|Yes|Custom Sport|Always||
|Player|Text Input|Required||No||Always||
|Year|Number Input|Required||No||Always||
|Manufacturer|Dropdown|Required|Topps, Bowman, Panini, Upper Deck, Fleer, Donruss, Score, Leaf, Other|Yes|Custom Manufacturer|Always||
|Set Name|Text Input|Recommended||No||Always||
|Card Number|Text Input|Recommended||No||Always||
|Parallel / Variation|Text Input|Optional||No||Always||
|Rookie Card|Dropdown|Recommended|Yes, No|No||Always||
|Autograph|Dropdown|Recommended|Yes, No|No||Always||
|Relic / Memorabilia|Dropdown|Recommended|Yes, No|No||Always||
|Serial Numbered|Dropdown|Recommended|Yes, No|No||Always||
|Serial Number|Text Input|Conditional||No||Serial Numbered = Yes||
|Is Graded|Dropdown|Required|Yes, No|No||Always|If Yes, reveal grading fields, and remove condition dropdown is not active (cant input). If No, user needs to select from Condition dropdown box|
|Grading Company|Dropdown|Conditional|PSA, BGS, SGC, CGC Cards, TAG Grading, HGA, Arena Club, Degree, ACE, ISA, GMA, Rare Edition, FCG, MNT, KSA, PGA, RCG, OnlyGraded, Diamond, CGA, TRCG, Pokegrade, Tree Frog, AP, PRO, GEM, GAI, PCI, WCG|No||Is Graded = Yes||
|Grade|Text Input|Conditional||No||Is Graded = Yes||
|Certification Number|Text Input|Conditional||No||Is Graded = Yes||



### Unopened Product

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Sport|Dropdown|Required|Baseball, Basketball, Football, Hockey, Soccer, Racing, Wrestling, Golf, MMA, Tennis, Multi-Sport, Other|Yes|Custom Sport|Always||
|Year|Number Input|Required||No||Always||
|Manufacturer|Dropdown|Required|Topps, Bowman, Panini, Upper Deck, Fleer, Donruss, Score, Leaf, Other|Yes|Custom Manufacturer|Always||
|Product Name|Text Input|Required||No||Always||
|Product Format|Dropdown|Required|Pack, Rack Pack, Box, Case|No||Always||
|Product Type|Dropdown|Recommended|Hobby, Jumbo, Retail, Blaster, Mega, Hanger, Cello, Rack, Other|Yes|Custom Product Type|Always||
|Factory Sealed|Dropdown|Required|Yes, No|No||Always||
|Authenticated|Dropdown|Required|Yes, No|No||Always||
|Authentication Company|Dropdown|Conditional|BBCE, PSA, iCert, RVP, Other|Yes|Custom Authentication Company|Is Authenticated = Yes||
|From A Sealed Case|Dropdown|Conditional|Yes, No|No||Is Authenticated = Yes||



### Set

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Sport|Dropdown|Required|Baseball, Basketball, Football, Hockey, Soccer, Racing, Wrestling, Golf, MMA, Tennis, Multi-Sport, Other|Yes|Custom Sport|Always||
|Year|Number Input|Required||No||Always||
|Manufacturer|Dropdown|Required|Topps, Bowman, Panini, Upper Deck, Fleer, Donruss, Score, Leaf, Other|Yes|Custom Manufacturer|Always||
|Set Name|Text Input|Required||No||Always||
|Set Type|Dropdown|Required|Factory Set, Complete Hand-Collated Set, Partial Set|No||Always||
|Missing Cards|Dropdown|Conditional|Yes, No|No||Set Type = Partial Set||
|Missing Card Details|Text Area|Conditional||No||Missing Cards = Yes||



### Collection/Lot

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|||||||||
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Sport|Dropdown|Recommended|Baseball, Basketball, Football, Hockey, Soccer, Racing, Wrestling, Golf, MMA, Tennis, Multi-Sport, Mixed, Other|Yes|Custom Sport|Always||
|Approximate Card Count|Number Input|Required||No||Always||
|Years Included|Text Input|Recommended||No||Always||
|Manufacturers Included|Text Area|Recommended||No||Always||
|Notable Players|Text Area|Recommended||No||Always||
|Notable Cards|Text Area|Recommended||No||Always||
|Includes Graded Cards|Dropdown|Optional|Yes, No|No||Always||



## Comics

**SECOND DROPDOWN OPTIONS: Single Comic, Original Art, Collection/Lot**



### Single Comic

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Conditional|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Is Graded = No||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Comic Title|Text Input|Required||No||Always||
|Issue Number|Text Input|Required||No||Always||
|Publisher|Dropdown|Required|Marvel, DC, Image, Dark Horse, IDW, Boom, Archie, Other|Yes|Custom Publisher|Always||
|Volume|Text Input|Optional||No||Always||
|Publication Year|Number Input|Recommended||No||Always||
|Variant Cover|Dropdown|Recommended|Yes, No, Not Sure|No||Always||
|Variant Description|Text Input|Conditional||No||Variant Cover = Yes||
|Key Issue|Dropdown|Optional|Yes, No, Unknown|No||Always||
|First Appearance|Dropdown|Optional|Yes, No, Unknown|No||Always||
|Signed|Dropdown|Recommended|Yes, No, Unknown|No||Always||
|Is Graded|Dropdown|Required|Yes, No|No||Always|If Yes, reveal grading fields, and remove condition dropdown is not active (cant input). If No, user needs to select from Condition dropdown box|
|Grading Company|Dropdown|Conditional|CGC Comics, CBCS, PGX Comics|No||Is Graded = Yes|<br />|
|Grade|Text Input|Conditional||No||Is Graded = Yes||
|Certification Number|Text Input|Conditional||No||Is Graded = Yes||



### Original Art

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Artist Name|Text Input|Required||No||Always||
|Artwork Title|Text Input|Recommended||No||Always||
|Publisher|Dropdown|Recommended|Marvel, DC, Image, Dark Horse, IDW, Boom, Archie, Other|Yes|Custom Publisher|Always||
|Comic Series|Text Input|Recommended||No||Always||
|Issue Number|Text Input|Recommended||No||Always||
|Page Number|Text Input|Recommended||No||Always||
|Art Type|Dropdown|Required|Cover Art, Splash Page, Interior Page, Published Commission, Unpublished Commission, Sketch, Sketch Card, Comic Strip, Other|Yes|Custom Art Type|Always||
|Medium|Dropdown|Recommended|Pencil, Ink, Watercolor, Acrylic, Mixed Media, Digital Print, Other|Yes|Custom Medium|Always||
|Year Created|Number Input|Recommended||No||Always||
|Signed By Artist|Dropdown|Recommended|Yes, No|No||Always||
|COA Included|Dropdown|Recommended|Yes, No|No||Always||
|Dimensions|Text Input|Recommended||No||Always||
|Framed|Dropdown|Optional|Yes, No|No||Always||
|Original Published Page|Dropdown|Recommended|Yes, No|No||Always||



### Collection/Lot

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Number of Comics|Number Input|Required||No||Always||
|Publishers Included|Text Area|Recommended||No||Always||
|Major Titles Included|Text Area|Recommended||No||Always||
|Years Included|Text Input|Recommended||No||Always||
|Includes Graded Comics|Dropdown|Optional|Yes, No|No||Always||



## Video Games

**SECOND DROPDOWN OPTIONS: Game, Console, Accessory, Collection/Lot**



### Game

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Conditional|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Is Graded = No||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Game Title|Text Input|Required||No||Always||
|Platform|Dropdown|Required|NES, SNES, N64, GameCube, Wii, Wii U, Switch, Switch 2, Sega Master System, Genesis, Saturn, Dreamcast, PS1, PS2, PS3, PS4, PS5, Xbox, Xbox 360, Xbox One, Xbox Series X/S, PC, Other|Yes|Platform Name|Always||
|Release Year|Number Input|Recommended||No||Always||
|Region|Dropdown|Recommended|NTSC-U, NTSC-J, PAL, Region Free, Unknown, Other|Yes|Custom Region|Always||
|Complete In Box|Dropdown|Recommended|Yes, No, Unknown|No||Always||
|Manual Included|Dropdown|Conditional|Yes, No, Unknown|No||Complete In Box = No||
|Original Case Included|Dropdown|Conditional|Yes, No, Unknown|No||Complete In Box = No||
|Sealed|Dropdown|Recommended|Yes, No|No||Always||
|Is Graded|Dropdown|Required|Yes, No|No||Always|If Yes, reveal grading fields, and remove condition dropdown is not active (cant input). If No, user needs to select from Condition dropdown box|
|Grading Company|Dropdown|Conditional|WATA, CGC N Video Games, VGA, CGC Home Video, IGS|No||Is Graded = Yes||
|Grade|Text Input|Conditional||No||Is Graded = Yes||
|Certification Number|Text Input|Conditional||No||Is Graded = Yes||



### Console

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Console Name|Dropdown|Required|NES, SNES, N64, GameCube, Wii, Wii U, Switch, Switch 2, Sega Genesis, Sega Saturn, Dreamcast, PS1, PS2, PS3, PS4, PS5, Xbox, Xbox 360, Xbox One, Xbox Series X/S, Other|Yes|Custom Console Name|Always||
|Model Number|Text Input|Recommended||No||Always||
|Region|Dropdown|Recommended|NTSC-U, NTSC-J, PAL, Region Free, Unknown, Other|Yes|Custom Region|Always||
|Working Condition|Dropdown|Required|Working, Not Working, Untested|No||Always||
|Original Box Included|Dropdown|Recommended|Yes, No|No||Always||
|Cables Included|Dropdown|Recommended|Yes, No|No||Always||
|Controllers Included|Number Input|Recommended||No||Always||
|Region|Dropdown|Recommended|NTSC-U, NTSC-J, PAL, Region Free, Unknown, Other|Yes|Custom Region|Always||
|Is Graded|Dropdown|Required|Yes, No|No||Always|If Yes, reveal grading fields, and remove condition dropdown is not active (cant input). If No, user needs to select from Condition dropdown box|
|Grading Company|Dropdown|Conditional|WATA, CGC N Video Games, VGA, CGC Home Video, IGS|No||Is Graded =|Yes|
|Grade|Text Input|Conditional||No||Is Graded = Yes||
|Certification Number|Text Input|Conditional||No||Is Graded = Yes||



### Accessory

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Accessory Type|Text Input|Required||No||Always||
|Platform|Dropdown|Required|NES, SNES, N64, GameCube, Wii, Wii U, Switch, PlayStation, Xbox, Sega, PC, Other|Yes|Custom Platform|Always||
|Manufacturer|Dropdown|Recommended|Nintendo, Sony, Microsoft, Sega, Logitech, Mad Catz, Other|Yes|Custom Manufacturer|Always||
|Working Condition|Dropdown|Required|Working, Not Working, Untested|No||Always||
|Region|Dropdown|Recommended|NTSC-U, NTSC-J, PAL, Region Free, Unknown, Other|Yes|Custom Region|Always||
|Is Graded|Dropdown|Required|Yes, No|No||Always|If Yes, reveal grading fields, and remove condition dropdown is not active (cant input). If No, user needs to select from Condition dropdown box|
|Grading Company|Dropdown|Conditional|WATA, CGC Video Games, VGA, CGC Home Video, IGS|No||Is Graded = Yes||
|Grade|Text Input|Conditional||No||Is Graded = Yes||
|Certification Number|Text Input|Conditional||No||Is Graded = Yes||



### Collection/Lot

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Platforms Included|Text Area|Recommended||No||Always||
|Approximate Item Count|Number Input|Required||No||Always||
|Notable Games / Consoles|Text Area|Recommended||No||Always||
|Includes Graded Games|Dropdown|Optional|Yes, No|No||Always||



## Vintage Toys

**SECOND DROPDOWN OPTIONS: Action Figure / Doll, Vehicle, Playset, Board Game / Puzzle, Plush / Stuffed Toy, Electronic Toy, Model / Kit, Collection/Lot**



### Action Figure / Doll

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Conditional|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Is Graded = No||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Toy Name|Text Input|Required||No||Always||
|Brand|Dropdown|Recommended|Hasbro, Mattel, Kenner, Playmates, Bandai, LEGO, Milton Bradley, Parker Brothers, Fisher-Price, Ty, Other|Yes|Custom Brand|Always||
|Franchise|Text Input|Recommended||No||Always||
|Character|Text Input|Recommended||No||Always||
|Year|Number Input|Recommended||No||Always||
|Packaging Type|Dropdown|Required|Loose, Carded, Boxed, Sealed, Other|Yes|Custom Packaging Type|Always||
|Complete|Dropdown|Recommended|Yes, No, Unknown|No||Always||
|Accessories Included|Dropdown|Recommended|Yes, No, Unknown|No||Always||
|Is Graded|Dropdown|Required|Yes, No|No||Always|If Yes, reveal grading fields, and remove condition dropdown is not active (cant input). If No, user needs to select from Condition dropdown box|
|Grading Company|Dropdown|Conditional|AFA, CAS, UKG, Other|Yes|Custom Grading Company|Is Graded = Yes||
|Grade|Text Input|Conditional||No||Is Graded = Yes||
|Certification Number|Text Input|Conditional||No||Is Graded = Yes||



### Vehicle

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Vehicle Name|Text Input|Required||No||Always||
|Brand|Dropdown|Recommended|Hot Wheels, Matchbox, Kenner, Hasbro, Mattel, Tonka, Bandai, Other|Yes|Custom Brand|Always||
|Franchise|Text Input|Recommended||No||Always||
|Year|Number Input|Recommended||No||Always||
|Packaging Type|Dropdown|Required|Loose, Carded, Boxed, Sealed, Other|Yes|Custom Packaging Type|Always||
|Vehicle Type|Dropdown|Recommended|Car, Truck, Aircraft, Spaceship, Boat, Motorcycle, Train, Other|Yes|Custom Vehicle Type|Always||
|Working Features|Dropdown|Recommended|Yes, No, Unknown|No||Always||



### Playset

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Playset Name|Text Input|Required||No||Always||
|Brand|Dropdown|Recommended|Hasbro, Mattel, Kenner, Playmates, LEGO, Fisher-Price, Other|Yes|Custom Brand|Always||
|Franchise|Text Input|Recommended||No||Always||
|Year|Number Input|Recommended||No||Always||
|Complete|Dropdown|Required|Yes, No, Unknown|No||Always||
|Missing Pieces|Text Area|Conditional||No||Complete = No||
|Instructions Included|Dropdown|Recommended|Yes, No, Unknown|No||Always||
|Original Box Included|Dropdown|Recommended|Yes, No, Unknown|No||Always||



### Board Game / Puzzle

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Game / Puzzle Name|Text Input|Required||No||Always||
|Publisher / Brand|Dropdown|Required|Milton Bradley, Parker Brothers, Hasbro, Mattel, Ideal, Avalon Hill, TSR, Games Workshop, Other|Yes|Custom Publisher / Brand|Always||
|Year|Number Input|Recommended||No||Always||
|Number of Pieces|Number Input|Recommended||No||Always||
|Complete|Dropdown|Required|Yes, No, Unknown|No||Always||
|Missing Pieces|Text Area|Conditional||No||Complete = No||
|Instructions Included|Dropdown|Recommended|Yes, No|No||Always||
|Box Included|Dropdown|Recommended|Yes, No|No||Always||



### Plush / Stuffed Toy

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Toy Name / Character|Text Input|Required||No||Always||
|Brand|Dropdown|Recommended|Ty, Disney, Gund, Applause, Fisher-Price, Mattel, Other|Yes|Custom Brand|Always||
|Year|Number Input|Recommended||No||Always||
|Tags Attached|Dropdown|Recommended|Yes, No, Unknown|No||Always||
|Cleanliness / Odor Notes|Text Area|Optional||No||Always||



### Electronic Toy

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Toy Name|Text Input|Required||No||Always||
|Brand|Dropdown|Recommended|Hasbro, Mattel, Milton Bradley, Tiger Electronics, Coleco, Radio Shack, Other|Yes|Custom Brand|Always||
|Year|Number Input|Recommended||No||Always||
|Tested|Dropdown|Required|Yes, No|No||Always||
|Working Condition|Dropdown|Required|Working, Partially Working, Not Working, Untested|No||Always||
|Battery Compartment Condition|Dropdown|Recommended|Clean, Light Corrosion, Heavy Corrosion, Missing Cover, Unknown|No||Always||
|Sound Works|Dropdown|Optional|Yes, No, Unknown|No||Always||
|Lights Work|Dropdown|Optional|Yes, No, Unknown|No||Always||



### Model / Kit

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Model / Kit Name|Text Input|Required||No||Always||
|Brand|Dropdown|Recommended|Revell, Monogram, AMT, Tamiya, LEGO, MPC, Other|Yes|Custom Brand|Always||
|Scale|Text Input|Recommended||No||Always||
|Built or Unbuilt|Dropdown|Required|Built, Unbuilt, Partially Built, Unknown|No||Always||
|Complete|Dropdown|Recommended|Yes, No, Unknown|No||Always||
|Instructions Included|Dropdown|Recommended|Yes, No|No||Always||



### Collection/Lot

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Approximate Item Count|Number Input|Required||No||Always||
|Brands Included|Text Area|Recommended||No||Always||
|Franchises Included|Text Area|Recommended||No||Always||
|Notable Items|Text Area|Recommended||No||Always||



## Stamps

**SECOND DROPDOWN OPTIONS: Single Stamp, Stamp Set / Sheet, Collection/Lot**



### Single Stamp

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Conditional|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Is Graded = No||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Country|Text Input|Required||No||Always||
|Scott Number or Description|Text Input|Required||No||Always||
|Year|Number Input|Recommended||No||Always||
|Denomination|Text Input|Recommended||No||Always||
|Mint or Used|Dropdown|Required|Mint, Used, Unused, CTO, Unknown|No||Always||
|Hinged|Dropdown|Optional|Never Hinged, Hinged, Hinge Remnant, Unknown|No||Always||
|Is Graded|Dropdown|Required|Yes, No|No||Always|If Yes, reveal grading fields, and remove condition dropdown is not active (cant input). If No, user needs to select from Condition dropdown box|
|Grading Company|Dropdown|Conditional|PSE, ASG, PSAG|No||Is Graded = yes||
|Grade|Text Input|Conditional||No||Is Graded = Yes||
|Certification Number|Text Input|Conditional||No||Is Graded = Yes||



### Stamp Set / Sheet

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Conditional|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Is Graded = No||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Country|Text Input|Required||No||Always||
|Year|Number Input|Recommended||No||Always||
|Set Name / Description|Text Input|Required||No||Always||
|Sheet Type|Dropdown|Required|Set, Sheet, Souvenir Sheet, Block, First Day Cover, Other|Yes|Custom Sheet Type|Always||
|Number of Stamps|Number Input|Recommended||No||Always||
|Mint or Used|Dropdown|Recommended|Mint, Used, Mixed, Unknown|No||Always||



### Collection/Lot

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Countries Included|Text Area|Recommended||No||Always||
|Approximate Quantity|Number Input|Required||No||Always||
|Years Included|Text Input|Recommended||No||Always||
|Album Included|Dropdown|Optional|Yes, No|No||Always||
|Notable Stamps|Text Area|Recommended||No||Always||



## Coins

**SECOND DROPDOWN OPTIONS:** **Single Coin, Coin Set, Collection/Lot**



### Single Coin

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Conditional|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Is Graded = No||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Country|Text Input|Required||No||Always||
|Denomination|Text Input|Required||No||Always||
|Year|Number Input|Required||No||Always||
|Mint Mark|Text Input|Recommended||No||Always||
|Variety|Text Input|Recommended||No||Always||
|Composition|Text Input|Recommended||No||Always||
|Weight|Text Input|Recommended||No||Always||
|Diameter|Text Input|Recommended||No||Always||
|Is Graded|Dropdown|Required|Yes, No|No||Always|If Yes, reveal grading fields, and remove condition dropdown is not active (cant input). If No, user needs to select from Condition dropdown box|
|Grading Company|Dropdown|Conditional|PCGS, NGC, ANACS, ICG, SEGS, SGS|No||Is Graded = Yes||
|Grade|Text Input|Conditional||No||Is Graded = Yes||
|Certification Number|Text Input|Conditional||No||Is Graded = Yes||



### Coin Set

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Set Name|Text Input|Required||No||Always||
|Country|Text Input|Required||No||Always||
|Year|Number Input|Required||No||Always||
|Set Type|Dropdown|Required|Proof Set, Mint Set, Commemorative Set, Type Set, Other|Yes|Custom Set Type|Always||
|Original Packaging Included|Dropdown|Recommended|Yes, No, Unknown|No||Always||
|Number of Coins|Number Input|Recommended||No||Always||



### Collection/Lot

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Countries Included|Text Area|Recommended||No||Always||
|Approximate Coin Count|Number Input|Required||No||Always||
|Years Included|Text Input|Recommended||No||Always||
|Notable Coins|Text Area|Recommended||No||Always||
|Includes Graded Coins|Dropdown|Optional|Yes, No|No||Always||



## Movies

**SECOND DROPDOWN OPTIONS: Individual Movie, Box Set, Collection/Lot**



### Individual Movie

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Conditional|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Is Graded = No||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Title|Text Input|Required||No||Always||
|Format|Dropdown|Required|DVD, Blu-ray, 4K UHD, VHS, LaserDisc, Other|Yes|Custom Format|Always||
|Release Year|Number Input|Recommended||No||Always||
|Edition|Text Input|Optional||No||Always||
|Sealed|Dropdown|Recommended|Yes, No|No||Always||
|Region|Text Input|Optional||No||Always||
|Is Graded|Dropdown|Required|Yes, No|No||Always|If Yes, reveal grading fields, and remove condition dropdown box is not active (cant input). If No, user needs to select from Condition dropdown box|
|Grading Company|Dropdown|Conditional|VGA, IGS, VHSDNA, CGC, Rewind, Other|Yes|Custom Grading Company|Is Graded = Yes||
|Grade|Text Input|Conditional||No||Is Graded = Yes||
|Certification Number|Text Input|Conditional||No||Is Graded = Yes||



### Box Set

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Box Set Name|Text Input|Required||No||Always||
|Format|Dropdown|Required|DVD, Blu-ray, 4K UHD, VHS, LaserDisc, Mixed, Other|Yes|Custom Format|Always||
|Number of Movies|Number Input|Required||No||Always||
|Edition|Text Input|Optional||No||Always||
|Sealed|Dropdown|Recommended|Yes, No|No||Always||



### Collection/Lot

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Formats Included|Text Area|Recommended||No||Always||
|Approximate Quantity|Number Input|Required||No||Always||
|Notable Titles|Text Area|Recommended||No||Always||
|Sealed Items Included|Dropdown|Optional|Yes, No|No||Always||



## Autographs

**SECOND DROPDOWN OPTIONS: Signed Item, Collection/Lot**



### Signed Item

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Signer|Text Input|Required||No||Always||
|Signed Item Type|Dropdown|Required|Photo, Card, Baseball, Football, Basketball, Hockey Puck, Jersey, Helmet, Bat, Glove, Book, Poster, Program, Ticket, Document, Other|Yes|Custom Signed Item Type|Always||
|Autograph Category|Dropdown|Recommended|Sports, Entertainment, Historical, Music, Other|Yes|Custom Autograph Category|Always||
|Authentication Included|Dropdown|Recommended|Yes, No|No||Always||
|Authentication Company|Dropdown|Conditional|PSA/DNA, JSA, Beckett Authentication Services|No||Authentication Included = Yes||
|Authentication Type|Dropdown|Conditional|COA (Card), LOA (Letter), Encapsulated (Slab), Other|Yes|Custom Authentication Type|Authentication Included = Yes||
|Certificate Number|Text Input|Conditional||No||Authentication Included = Yes||
|Inscription Present|Dropdown|Optional|Yes, No|No||Always||
|Inscription Text|Text Input|Conditional||No||Inscription Present = Yes||



### Collection/Lot

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Number of Signed Items|Number Input|Required||No||Always||
|Signers Included|Text Area|Recommended||No||Always||
|Authentication Included|Dropdown|Recommended|Yes, No, Mixed|No||Always||
|Notable Items|Text Area|Recommended||No||Always||
|Item Types Included|Text Area|Recommended||No||Always||



## Disney Pins

**SECOND DROPDOWN OPTIONS: Individual Pin, Pin Set, Collection/Lot**



### Individual Pin

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Pin Name|Text Input|Required||No||Always||
|Character|Text Input|Recommended||No||Always||
|Series|Text Input|Recommended||No||Always||
|Year|Number Input|Recommended||No||Always||
|Pin Trading Event|Text Input|Recommended||No||Always||
|Limited Edition|Dropdown|Recommended|Yes, No|No||Always||
|Open Edition|Dropdown|Recommended|Yes, No|No||Always||
|Artist Proof (AP)|Dropdown|Recommended|Yes, No|No||Always||
|Pre-Production (PP)|Dropdown|Recommended|Yes, No|No||Always||
|Backstamp Information|Text Area|Recommended||No||Always||
|Backer Card Included|Dropdown|Optional|Yes, No|No||Always||



### Pin Set

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Set Name|Text Input|Required||No||Always||
|Number of Pins|Number Input|Required||No||Always||
|Complete Set|Dropdown|Required|Yes, No|No||Always||
|Missing Pins|Text Area|Conditional||No||Complete Set = No||
|Limited Edition|Dropdown|Recommended|Yes, No|No||Always||
|Characters Included|Text Area|Recommended||No||Always||
|Series|Text Input|Recommended||No||Always||



### Collection/Lot

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Approximate Pin Count|Number Input|Required||No||Always||
|Characters Included|Text Area|Recommended||No||Always||
|Series Included|Text Area|Recommended||No||Always||
|Limited Edition Pins Included|Dropdown|Recommended|Yes, No, Unknown|No||Always||
|AP / PP Pins Included|Dropdown|Optional|Yes, No, Unknown|No||Always||
|Backer Cards Included|Dropdown|Optional|Yes, No|No||Always||



## Pokemon

**SECOND DROPDOWN OPTIONS: Single Card, Unopened Product, Set, Collection/Lot**



|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Conditional|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Is Graded = No||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Card Name|Text Input|Required||No||Always||
|Set Name|Text Input|Required||No||Always||
|Card Number|Text Input|Required||No||Always|e.g., 102/102, SWSH001|
|Rarity|Dropdown|Required|Common, Uncommon, Rare, Holo Rare, Ultra Rare, Secret Rare, Illustration Rare, Special Illustration Rare, Hyper Rare (Gold), ACE SPEC, Other|Yes|Custom Rarity|Always|Includes modern tiers like IR/SIR/HR.|
|Edition / Era|Dropdown|Required|1st Edition, Shadowless, Unlimited, Wizards of the Coast, EX Series, Diamond \& Pearl, Platinum, HGSS, Black \& White, XY, Sun \& Moon, Sword \& Shield, Scarlet \& Violet, Other|Yes|Custom Edition/Era|Always||
|Finish / Variant|Dropdown|Required|Normal, Holo, Reverse Holo, Full Art, Rainbow Rare, Gold, V, VMAX, VSTAR, ex, GX, BREAK, Tag Team, Other|Yes|Custom Finish|Always|Includes specific mechanic variants.|
|Special Attributes|Dropdown|Optional|None, Staff Stamp, Prerelease Stamp, Promo, Misprint / Error, Miscut, Corrected Error, Other|Yes|Custom Attribute|Always|For niche collector items.|
|Language|Dropdown|Required|English, Japanese, French, German, Italian, Spanish, Korean, Chinese, Other|Yes|Custom Language|Always||
|Is Graded|Dropdown|Required|Yes, No|No||Always|If Yes, reveal grading fields, and remove condition dropdown is not active (cant input). If No, user needs to select from Condition dropdown box|
|Grading Company|Dropdown|Conditional|PSA, BGS, SGC, CGC Cards, TAG Grading, HGA, Arena Club, Degree, ACE, ISA, GMA, Rare Edition, FCG, MNT, KSA, PGA, RCG, OnlyGraded, Diamond, CGA, TRCG, Pokegrade, Tree Frog, AP, PRO, GEM, GAI, PCI, WCG|No||Is Graded = Yes||
|Grade|Text Input|Conditional||No||Is Graded = Yes||
|Certification Number|Text Input|Conditional||No||Is Graded = Yes||



### Unopened Product

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Product Name|Text Input|Required||No||Always||
|Set Name|Text Input|Required||No||Always||
|Product Type|Dropdown|Required|Booster Box, Elite Trainer Box, Blaster Box, Tin, Collection Box, Booster Pack, Build \& Battle Box, Premium Collection, Other|Yes|Custom Product Type|Always||
|Era|Dropdown|Required|Vintage (WOTC), Mid-Era (EX/DP/BW/XY), Modern (SM/SWSH/SV), Other|Yes|Custom Era|Always||
|Factory Sealed|Dropdown|Required|Yes, No|No||Always||
|Authenticated|Dropdown|Required|Yes, No|No||Always||
|Authentication Company|Dropdown|Conditional|BBCE, PSA, iCert, RVP, Other|Yes|Authentication Company|Is Authenticated = Yes||
|From A Sealed Case|Dropdown|Conditional|Yes, No|No||Is Authenticated = Yes||



### Set

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Set Name|Text Input|Required||No||Always||
|Completion|Dropdown|Required|Master Set, Complete (Base), Near Complete, Incomplete|No||Always|Master Set includes all variants/reverses.|
|Notable Cards|Text Area|Recommended||No||Always||
|Includes Graded Cards|Dropdown|Optional|Yes, No, Unknown|No||Always||



### Collection/Lot

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Photos|Image Upload|Required||No||Always|Require at least 1 photo.|
|Description|Text Area|Required||No||Always|Free-form details, defects, provenance, trade notes. Users may write a lot of stuff.|
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Shipping Available|Dropdown|Recommended|Yes, No, Local Only|No||Always||
|Approximate Card Count|Number Input|Required||No||Always||
|Eras / Series Included|Dropdown|Recommended|Wizards of the Coast, EX, Diamond \& Pearl, Platinum, HeartGold SoulSilver, Black \& White, XY, Sun \& Moon, Sword \& Shield, Scarlet \& Violet, Mixed, Other|Yes|Custom Era|Always||
|Notable Cards|Text Area|Recommended||No||Always||
|Includes Graded Cards|Dropdown|Optional|Yes, No|No||Always||
|Bulk / Rare Ratio|Text Input|Optional||No||Always|e.g., 90% Bulk, 10% Holos|



