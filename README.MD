# Anchorage repair plugin for poi

[![npm package][npm-badge]][npm]

[简体中文说明](README-CN.MD)

## Description
A plugin to help in Akashi's anchorage repair arrangement, features:

- [x] estimate anchorage repair time
- [x] notify upon ship repair completes

## Limitations
- When you change the fleet composition, Kancolle API will not renew ships' HP, which may lead to inaccurate repair time estimation. You have to return to HQ screen to refresh ship data.

## Basic mechanism
### Docking repair time
The formula base on HP loss, level and ship type is already proved, while this value is also given in API's *api_ndock_time*.

### Akashi's anchorage repair requirement
- Akashi (or Kai) must be fleet flagship, with minor damage or less, and is not in docking.
- Akashi can repair herslf and ship in 2nd lot, and plus one ship slot per Ship Repair Facility.
- Ships get repaired at minor damage (HP > 50% max HP) or less.
- ship is not in docking.

### Repair time
- it takes at least 20 minutes to repair ships by at least 1 HP
- Above 20 minutes, the the amount will be the same as ships in docking, rounded down.
- In the docking time formula, a 30-second bias is always added; the docking is actually finished, however, 1 minute earlier. And anchorage repair time will be **rounded up** to next minute.
- The repair timer will reset by:
  - returning to the HQ screen after 20 minutes from the time the composition changed, that is, ships' hp changed,
  - changing fleet composition,
  - docking fleet member with Bucket, normal docking won't reset,
  - sending the fleet to expedition.

### Corner cases
Following corner cases are not taken into consideration, thus the result may not behave as it could be.
- changing Akashi's slot itmes, more precisely, changing the numbers of Ship Repair Facilities,
- sending fleet to sortie.

### Experimental
Loading composition presets won't reset the timer, which is sometimes regarded as a bug.

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