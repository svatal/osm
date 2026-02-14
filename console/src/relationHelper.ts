import type { OSMRelation, OSMWay } from "./osmTypes.js";

export function getRelationWays(
  relation: OSMRelation,
  relations: Map<number, OSMRelation>,
  ways: Map<number, OSMWay>,
  visitedRelations: number[] = []
) {
  const relationWays: OSMWay[] = [];
  if (!relation.members) {
    console.log("relation with no members:", relation);
    return [];
  }
  if (visitedRelations.includes(relation.id)) {
    console.log("circular relation:", visitedRelations, relation);
    return [];
  }
  visitedRelations = [...visitedRelations, relation.id];
  relation.members.forEach((member) => {
    switch (member.type) {
      case "node":
        return;
      case "way": {
        const way = ways.get(member.ref);
        if (!way) return;

        relationWays.push(way);
        break;
      }
      case "relation": {
        const childRelation = relations.get(member.ref);
        if (!childRelation) return;

        // console.log(
        //   "relation with relation member:",
        //   relation.id,
        //   "->",
        //   member.ref
        // );
        relationWays.push(
          ...getRelationWays(childRelation, relations, ways, visitedRelations)
        );
        return;
      }
      default:
        console.log("relation with unknown member type:", member, relation);
        return;
    }
  });
  return relationWays;
}

export function mergeWays(ways: OSMWay[]) {
  if (ways.length === 0) {
    return [];
  }
  ways = [...ways];
  const merged = [{ refs: [...ways.shift()!.refs] }];
  while (ways.length > 1) {
    const lastWay = merged[merged.length - 1]!;
    const firstNode = lastWay.refs[0];
    const lastNode = lastWay.refs[lastWay.refs.length - 1];
    const nextIdx = ways.findIndex(
      (way) =>
        way.refs[0] === lastNode ||
        way.refs[way.refs.length - 1] === lastNode ||
        way.refs[0] === firstNode ||
        way.refs[way.refs.length - 1] === firstNode
    );
    if (nextIdx === -1) {
      merged.push({ refs: [...ways.shift()!.refs] });
      continue;
    }
    const nextWay = ways.splice(nextIdx, 1)[0]!;
    if (nextWay.refs[0] === lastNode) {
      lastWay.refs.push(...nextWay.refs);
    } else if (nextWay.refs[nextWay.refs.length - 1] === lastNode) {
      lastWay.refs.push(...[...nextWay.refs].reverse());
    } else if (nextWay.refs[0] === firstNode) {
      lastWay.refs.unshift(...[...nextWay.refs].reverse());
    } else if (nextWay.refs[nextWay.refs.length - 1] === firstNode) {
      lastWay.refs.unshift(...nextWay.refs);
    }
  }
  return merged;
}
