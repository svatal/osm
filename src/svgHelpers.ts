import type { Ranges } from "./mapHelpers.js";

export function openMap({ lat, lon }: Ranges) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${lon.min} ${
    lat.min
  } ${lon.max - lon.min} ${lat.max - lat.min}">`;
}

export function closeMap() {
  return "</svg>";
}

export function transformMapCoordinates({ lat }: Ranges) {
  return `transform="translate(0, ${lat.min + lat.max}) scale(1 -1)"`;
}
