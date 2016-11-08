# Anchorage repair plugin for poi

## Description
A plugin to help in Akashi's anchorage repair arrangement, features:

-[] estimate anchorage repair time
-[] estimate better refresh time
-[] notify upon ship repair completes

## Basic mechanism
### Docking repair time
The formula base on HP loss, level and ship type is already proved, while This value is also given in API's *api_ndock_time*.

## Akashi's anchorage repair requirement
- Akashi (or Kai) must be fleet flagship, with minor damage or less, and is not docking.
- Akashi can repair herslf and ship in 2nd lot, and plus one ship slot per Ship Repair Facility.
- Ships get repaired at minor damage (HP > 50% max HP) os less.
- ship is not in docking.

## Repair time
- it takes at least 20 minutes to repair ships by at least 1 HP
- Above 20 minutes, the the amount will be the same as ships in docking, rounded down.
- The repair timer will reset by:
  - returning to the HQ screen,
  - changing fleet composition,
  - docking fleet member with Bucket, normal docking won't reset (currently not covered in the plugin),
  - sending the fleet to expedition

## Corner cases
Following corner cases are not taken into consideration, thus the result may not behave as it could be.
- changing Akashi's slot itmes, more precisely, changing the numbers of Ship Repair Facilities,
- sending fleet to sortie.

# Changelog
## v0.1
Inital version

# Refernces
- <http://kancolle.wikia.com/wiki/Akashi#Anchorage_Repair>
- <http://kancolle.wikia.com/wiki/Docking#Repair_time>
- <http://wikiwiki.jp/kancolle/?%CC%C0%C0%D0#h2_content_1_1>

# License
MIT