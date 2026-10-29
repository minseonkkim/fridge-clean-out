import * as kit from "./kit.ts";
import type { ArtSpec } from "./specs.ts";

/** 설계도를 2D 일러스트(SVG 문자열)로 그린다 */
export function drawArt(spec: ArtSpec): string {
  switch (spec.part) {
    case "ball":
      return kit.ball(spec);
    case "long":
      return kit.long(spec);
    case "leafHead":
      return kit.leafHead(spec);
    case "bunch":
      return kit.bunch(spec);
    case "stalks":
      return kit.stalks(spec);
    case "mushroom":
      return kit.mushroom(spec);
    case "root":
      return kit.root(spec);
    case "floret":
      return kit.floret(spec);
    case "berries":
      return kit.berries(spec);
    case "wedge":
      return kit.wedge(spec);
    case "banana":
      return kit.banana(spec.color);
    case "lemon":
      return kit.lemon(spec.color);
    case "avocado":
      return kit.avocado();
    case "corn":
      return kit.corn();
    case "pumpkin":
      return kit.pumpkin(spec.color, spec.flesh);
    case "meat":
      return kit.meat(spec);
    case "chicken":
      return kit.chicken(spec);
    case "fish":
      return kit.fish(spec);
    case "fillet":
      return kit.fillet(spec);
    case "shell":
      return kit.shell(spec);
    case "shrimp":
      return kit.shrimp(spec.color);
    case "cephalopod":
      return kit.cephalopod(spec);
    case "crab":
      return kit.crab(spec.color);
    case "smallFry":
      return kit.smallFry(spec);
    case "seaweed":
      return kit.seaweed(spec);
    case "eggs":
      return kit.eggs(spec);
    case "block":
      return kit.block(spec);
    case "bowl":
      return kit.bowl(spec);
    case "noodles":
      return kit.noodles(spec);
    case "bread":
      return kit.bread(spec);
    case "sticks":
      return kit.sticks(spec);
    case "dumpling":
      return kit.dumpling(spec.color);
    case "bottle":
      return kit.bottle(spec);
    case "carton":
      return kit.carton(spec);
    case "tub":
      return kit.tub(spec);
    case "jar":
      return kit.jar(spec);
    case "can":
      return kit.can(spec);
    case "pouch":
      return kit.pouch(spec);
    case "shaker":
      return kit.shaker(spec);
    case "cup":
      return kit.cup(spec);
    case "nuts":
      return kit.nuts(spec);
    case "chocolateBar":
      return kit.chocolateBar();
    case "teardrop":
      return kit.teardrop(spec);
    case "pineapple":
      return kit.pineapple();
    case "sideDish":
      return kit.sideDish(spec);
  }
}
