# Anchorage repair plugin for poi

[![npm package][npm-badge]][npm]

[简体中文说明](README-CN.MD)

## Description
A plugin to help with Akashi's HP repair and Nosaki's morale boost, featuring similar timer mechanics for both:

- [x] estimate anchorage repair time (Akashi)
- [x] estimate morale boost timing (Nosaki)
- [x] notify upon ship repair completes
- [x] support combined operations (Akashi + Nosaki)

## Limitations
- When you change the fleet composition, Kancolle API will not renew ships' HP, which may lead to inaccurate repair time estimation. You have to return to HQ screen to refresh ship data.

## Basic mechanism

### Akashi's anchorage repair (HP Recovery)
**Requirements:**
- Akashi (or Kai) must be fleet **flagship** (position 1), with minor damage or less, and is not in docking.
- Akashi can repair herself and ship in 2nd slot, and plus one ship slot per Ship Repair Facility.
- Ships get repaired at minor damage (HP > 50% max HP) or less.
- Ship is not in docking.

**Timer:** 20 minutes minimum for HP repair

### Nosaki's morale boost (Cond Recovery)
**Requirements:**
- Nosaki (or Kai) must be in **position 1 or 2**, fully supplied, with minor damage or less (HP > 50% max HP), cond ≥ 30, not in expedition or docking.
- Boosts morale (cond value) for all fleet members except Nosaki herself.
- Nosaki: +2 cond per application, Nosaki Kai: +3 cond per application
- Maximum cond: 54
- Target ships: not in docking (damage state doesn't matter)
- Consumes 1 fuel per ship boosted

**Timer:** 15 minutes minimum for morale boost

### Combined Operation
- Both systems can work simultaneously in the same fleet
- Example: Akashi as flagship (repairs HP, 20min timer) + Nosaki in 2nd position (boosts morale, 15min timer)
- Each system has its own independent timer
### Docking repair time
The formula base on HP loss, level and ship type is already proved, while this value is also given in API's *api_ndock_time*.

### Repair time (Akashi)
- it takes at least 20 minutes to repair ships by at least 1 HP
- Above 20 minutes, the the amount will be the same as ships in docking, rounded down.
- In the docking time formula, a 30-second bias is always added; the docking is actually finished, however, 1 minute earlier. And anchorage repair time will be **rounded up** to next minute.
### Timer reset rules (Both Akashi and Nosaki)
- The repair timer and morale boost timer share similar reset behavior:
  - returning to the HQ screen after the minimum time (20min for Akashi, 15min for Nosaki) from the time the composition changed,
  - changing fleet composition while dragging a ship out of fleet or disbanding the whole fleet won't,
  - docking fleet member with Bucket, normal docking won't reset,
  - sending the fleet to expedition.

### Nosaki-specific Timer Behavior (Important!)
- **Global timer**: Nosaki timer is shared across ALL fleets, not per-fleet
- **After 15 minutes activation**: Composition changes no longer reset the timer
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
