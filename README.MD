# Anchorage repair plugin for poi

[![npm package][npm-badge]][npm]

[简体中文说明](README-CN.MD)

## Description
A plugin to help with Akashi's HP repair and Nosaki's morale boost, featuring similar timer mechanics for both:

- [x] estimate anchorage repair time (Akashi, Akashi Kai, Asahi Kai)
- [x] support paired repair bonus (Akashi + Asahi Kai at positions 1-2)
- [x] estimate morale boost timing (Nosaki)
- [x] notify upon ship repair completes
- [x] support combined operations (Akashi + Nosaki, or Akashi + Asahi Kai + Nosaki)

## Limitations
- When you change the fleet composition, Kancolle API will not renew ships' HP, which may lead to inaccurate repair time estimation. You have to return to HQ screen to refresh ship data.

## Basic mechanism

### Akashi's anchorage repair (HP Recovery)
**Requirements:**
- Akashi (明石), Akashi Kai (明石改), or Asahi Kai (朝日改) must be fleet **flagship** (position 1), with minor damage or less, and is not in docking.
- Base repair capability:
  - **Akashi/Akashi Kai**: Can repair herself and ship in 2nd slot (base: 2 ships) plus one ship slot per Ship Repair Facility equipped on flagship
  - **Asahi Kai**: Requires at least one Ship Repair Facility to repair even herself (base: 0 ships) plus one ship slot per Ship Repair Facility equipped on flagship
- **Paired Repair Bonus**: When both repair ships (Akashi/Akashi Kai + Asahi Kai, or two of any repair ships) are at positions 1 and 2:
  - SRF on position 2 also counts toward repair range
  - If position 2 has SRF equipped, repair speed increases by ~15% (time reduced to 85%)
  - With maximum 5 total SRF, can repair up to 7 ships in combined fleet operations
- Ships get repaired at minor damage (HP > 50% max HP) or less.
- Ship is not in docking.

**Timer:** 20 minutes minimum for HP repair

### Nosaki's morale boost (Cond Recovery)
**Requirements:**
- Nosaki (or Kai) must be in **position 1 or 2** to start the timer
- At port return after 15 minutes, eligibility is checked:
  - Nosaki must be fully supplied
  - Nosaki must be undamaged to below minor damage (HP > 75% max HP)
  - Nosaki cond ≥ 30
  - Nosaki not in expedition or docking
- If eligible, boosts morale (cond value) for all fleet members except Nosaki herself.
- Nosaki: +2 cond per application, Nosaki Kai: +3 cond per application
- Maximum cond: 54
- Target ships: not in docking (damage state doesn't matter)
- Consumes 1 fuel per ship boosted

**Timer:** 15 minutes minimum for morale boost

### Combined Operation
- Both systems can work simultaneously in the same fleet
- Example configurations:
  - Akashi as flagship (repairs HP, 20min timer) + Nosaki in 2nd position (boosts morale, 15min timer)
  - Akashi/Akashi Kai as flagship + Asahi Kai in 2nd position = paired repair bonus (faster repair speed, extended range)
- Each system has its own independent timer
- **Paired Repair**: When repair ships occupy positions 1-2, combine their Ship Repair Facilities for extended range and faster repairs

### Docking repair time
The formula base on HP loss, level and ship type is already proved, while this value is also given in API's *api_ndock_time*.

### Repair time (Akashi)
- it takes at least 20 minutes to repair ships by at least 1 HP
- Above 20 minutes, the amount will be the same as ships in docking, rounded down.
- In the docking time formula, a 30-second bias is always added; the docking is actually finished, however, 1 minute earlier. And anchorage repair time will be **rounded up** to next minute.

### Timer reset rules
- **Akashi timer (per-fleet)** resets when:
  - Changing fleet composition (except dragging out or disbanding)
  - Docking fleet member with bucket (instant repair)
  - Sending fleet to expedition
  - Returns to normal after minimum 20 minutes at port

- **Nosaki timer (global)** resets when:
  - Placing Nosaki in position 1 or 2 (timer starts immediately)
  - Changing fleet composition while Nosaki in position 1/2 and timer < 15 minutes
  - Removing Nosaki from position 1 or 2 (timer cleared)
  - After 15 minutes: composition changes do NOT reset the timer
  - Note: Expedition does NOT reset Nosaki timer ("not in expedition" is an eligibility check, not a reset trigger)

### Nosaki-specific Timer Behavior (Important!)
- **Global timer**: Nosaki timer is shared across ALL fleets, not per-fleet
- **Akashi timer is per-fleet**: Each fleet tracks its own Akashi repair timer independently
- **After 15 minutes activation**: Composition changes no longer reset the Nosaki timer
- **Fleet presets**: Loading composition presets does NOT reset the timer
- **Ship remodeling**: Upgrading Nosaki to Nosaki Kai does NOT reset the timer
- **Works everywhere**: Nosaki works in all fleets (1-4) and strike force (7 ships)

### Corner cases
Following corner cases are not taken into consideration, thus the result may not behave as it could be.
- changing Akashi's slot items, more precisely, changing the numbers of Ship Repair Facilities (for Akashi),
- sending fleet to sortie.

### Implemented Features
✓ Fleet preset loading doesn't reset timers
✓ Nosaki timer is global across all fleets
✓ After timer activation (15min for Nosaki, 20min for Akashi), composition changes don't reset
✓ Ship remodeling (including Nosaki → Nosaki Kai) doesn't reset timer

# Changelog
## v0.1
Initial version

## v0.2
Now the timer is always displayed for those who want to make use of composition preset bug.

## v0.3
The timer reset rules corrected
+ Returning to HQ within 20 minutes won't reset the timer,
+ Changing fleet composition within 20 minutes will immediately reset the timer. Otherwise a return to HQ is required

# References
- <http://kancolle.wikia.com/wiki/Akashi#Anchorage_Repair>
- <http://kancolle.wikia.com/wiki/Docking#Repair_time>
- <http://wikiwiki.jp/kancolle/?%CC%C0%C0%D0#h2_content_1_1>
- <https://en.kancollewiki.net/wiki/Auxiliary_Ships_Mechanics>

# License
MIT

[npm-badge]: https://img.shields.io/npm/v/poi-plugin-anchorage-repair.svg?style=flat-square
[npm]: https://www.npmjs.org/package/poi-plugin-anchorage-repair
