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
- Akashi (明石), Akashi Kai (明石改), or Asahi Kai (朝日改) must be fleet **flagship** (position 1)
- **Flagship health**: Must NOT be in moderate damage or worse (HP must be > 50% max HP)
- Flagship must not be in docking
- Base repair capability:
  - **Akashi/Akashi Kai**: Can repair herself and ship in 2nd slot (base: 2 ships) plus one ship slot per Ship Repair Facility equipped on flagship
  - **Asahi Kai**: Requires at least one Ship Repair Facility to repair even herself (base: 0 ships) plus one ship slot per Ship Repair Facility equipped on flagship
- **Paired Repair Bonus**: When Akashi series (Akashi/Akashi Kai) and Asahi Kai are at positions 1 and 2:
  - **Valid pairs**: Akashi + Asahi Kai OR Akashi Kai + Asahi Kai (in either order at positions 1-2)
  - **2nd position health requirement**: Must be below minor damage (HP > 75% max HP) for paired bonus to work
  - SRF on position 2 also counts toward repair range
  - If position 2 has SRF equipped and is healthy, repair speed increases by ~15% (time reduced to 85%)
  - With maximum 5 total SRF, can repair up to 7 ships in combined fleet operations
- **Repair target eligibility**: Ships can be repaired when at minor damage or better (HP > 50% max HP)
- Target ships must not be in docking

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
- **Timer behavior per WIKI**:
  - **Repair timer (HP)**: Shared/global across all fleets ("修理時間のタイマーは共通") - when any fleet has a repair ship flagship, all fleets share the same timer
  - **Morale timer (Nosaki)**: Shared/global across all fleets
- **Paired Repair**: When Akashi series (Akashi/Akashi Kai) and Asahi Kai occupy positions 1 and 2 (as described above), their Ship Repair Facilities are combined for extended range and faster repairs

### Docking repair time
The formula base on HP loss, level and ship type is already proved, while this value is also given in API's *api_ndock_time*.

### Repair time (Akashi)
- it takes at least 20 minutes to repair ships by at least 1 HP
- Above 20 minutes, the amount will be the same as ships in docking, rounded down.
- In the docking time formula, a 30-second bias is always added; the docking is actually finished, however, 1 minute earlier. And anchorage repair time will be **rounded up** to next minute.

### Timer reset rules
- **Repair timer (global/shared)** resets when:
  - Changing fleet composition of a fleet with repair ship flagship (except dragging out or disbanding)
  - Docking fleet member with bucket (instant repair) in a fleet with repair ship flagship
  - Sending fleet with repair ship flagship to expedition
  - Returns to normal after minimum 20 minutes at port
  - **Important**: Per WIKI "修理時間のタイマーは共通", the repair timer is shared across ALL fleets

- **Nosaki timer (global/shared)** resets when:
  - Placing Nosaki in position 1 or 2 (timer starts immediately)
  - Changing fleet composition while Nosaki in position 1/2 and timer < 15 minutes
  - Removing Nosaki from position 1 or 2 (timer cleared)
  - After 15 minutes: composition changes do NOT reset the timer
  - Note: Expedition does NOT reset Nosaki timer ("not in expedition" is an eligibility check, not a reset trigger)

### Timer Behavior (Important!)
- **Both timers are global/shared**: Per WIKI, both repair timer and Nosaki timer are shared across ALL fleets
- **Repair timer**: "修理時間のタイマーは共通" - when any fleet has a repair ship flagship, all fleets share the same timer
- **Nosaki timer**: "複数の艦隊でそれぞれ野埼を運用する場合でもタイマーは共通" - Nosaki timer is shared across all fleets
- **After 15 minutes activation**: Composition changes no longer reset the Nosaki timer
- **Fleet presets**: Loading composition presets does NOT reset timers
- **Ship remodeling**: Upgrading ships does NOT reset timers
- **Works everywhere**: Both systems work in all fleets (1-4) and strike force (7 ships)

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
