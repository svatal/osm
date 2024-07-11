# OSM

Code for manipulating/interpreting the Open Street Map data to understand it better.

## Usage

- download \*.osm.pbf file of your favorite region from http://download.openstreetmap.fr/extracts/
- put it into input forder
- adjust control properties in src/index.ts
- explore!

## What it can do

- dump data into human-readable format
- collect property names/values
- create the svg with all the lines (region with 4800 km^2 -> 180MB svg)
