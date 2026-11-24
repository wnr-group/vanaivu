import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Verified Unsplash photo ids (see README "Imagery").
const IMG: Record<number, string> = {
  0: "1515886657613-9f3515b0c78f", 1: "1483985988355-763728e1935b", 2: "1490481651871-ab68de25d43d",
  3: "1496747611176-843222e1e57c", 4: "1539109136881-3be0616acf4b", 5: "1509631179647-0177331693ae",
  6: "1529139574466-a303027c1d8b", 7: "1485968579580-b6d095142e6e", 8: "1434389677669-e08b4cac3105",
  10: "1495385794356-15371f348c31", 11: "1469334031218-e382a71b716b", 13: "1503342217505-b0a15ec3261c",
  15: "1551803091-e20673f15770", 16: "1566174053879-31528523f8ae", 17: "1595777457583-95e059d581b8",
  18: "1572804013309-59a88b7e92f1", 19: "1585487000160-6ebcfceb0d03", 20: "1612336307429-8a898d10e223",
  21: "1594633312681-425c7b97ccd1", 22: "1581044777550-4cfa60707c03", 23: "1564257631407-4deb1f99d992",
  26: "1576566588028-4147f3842f27", 27: "1541099649105-f69ad21f3246", 28: "1594633313593-bab3825d0caf",
  29: "1583496661160-fb5886a0aaaa", 30: "1591369822096-ffd140ec948f", 31: "1539533018447-63fcce2678e3",
  32: "1548624313-0396c75e4b1a", 34: "1610030469983-98e550d6193c", 35: "1583391733956-3750e0ff4e8b",
  36: "1617627143750-d86bc21e42bb", 37: "1609357605129-26f69add5d6e", 38: "1518310383802-640c2de311b2",
  39: "1506629082955-511b1aa562c8", 40: "1584370848010-d7fe6bc767ec", 41: "1590874103328-eac38a683ce7",
  42: "1611591437281-460bfbe1220a", 43: "1617038220319-276d3cfab638", 44: "1558171813-4c088753af8f",
  45: "1467043237213-65f2da53396f", 46: "1492707892479-7bc8d5a4ee93", 47: "1524504388940-b1c1722653e1",
  48: "1534528741775-53994a69daeb", 49: "1488426862026-3ee34a7d66df", 51: "1554412933-514a83d2f3c8",
  52: "1581338834647-b0fb40704e21", 53: "1560243563-062bfc001d68", 54: "1562157873-818bc0726f68",
  55: "1503185912284-5271ff81b9a8", 57: "1485462537746-965f33f7f6a7", 58: "1502716119720-b23a93e5fe1b",
  59: "1479064555552-3ef4979f8908", 60: "1544022613-e87ca75a784a", 61: "1550614000-4895a10e1bfd",
  62: "1578632767115-351597cf2477", 63: "1596783074918-c84cb06531ca", 64: "1618244972963-dbee1a7edc95",
  66: "1603252109303-2751441dd157", 67: "1598554747436-c9293d6a588f", 68: "1624378439575-d8705ad7ae80",
  69: "1617922001439-4a2e6562f328", 71: "1601762603339-fd61e28b698a", 72: "1632149877166-f75d49000351",
  73: "1515372039744-b8f02a3ae446", 74: "1568252542512-9fe8fe9c87bb", 75: "1571513722275-4b41940f54b8",
  77: "1591047139829-d91aecb6caea", 79: "1550639525-c97d455acf70", 83: "1611312449408-fcece27cdbb7",
  84: "1618932260643-eee4a2f652a6", 85: "1608748010899-18f300247112", 86: "1520006403909-838d6b92c22e",
  87: "1558769132-cb1aea458c5e", 88: "1445205170230-053b83016050", 89: "1441984904996-e0b6ba687e04",
  92: "1581101767113-1677fc2beaa8", 93: "1614251055880-ee96e4803393", 94: "1605518216938-7c31b7b14ad0",
  96: "1583744946564-b52ac1c389c8", 97: "1612722432474-b971cdcea546", 98: "1624206112918-f140f087f9b5",
  99: "1619086303291-0ef7699e4b31", 100: "1564584217132-2271feaeb3c5", 102: "1562572159-4efc207f5aff",
  103: "1475178626620-a4d074967452", 104: "1539008835657-9e8e9680c956", 105: "1576188973526-0e5d7047b0cf",
  106: "1617019114583-affb34d1b3cd", 107: "1616847220575-31b062a4cd05", 108: "1525450824786-227cbef70703",
  109: "1499939667766-4afceb292d05", 111: "1550928431-ee0ec6db30d3", 112: "1511556532299-8f662fc26c06",
  113: "1554568218-0f1715e72254", 114: "1518622358385-8ea7d0794bf6", 116: "1621184455862-c163dfb30e0f",
  117: "1583846717393-dc2412c95ed7",
};
export const img = (n: number) => `https://images.unsplash.com/photo-${IMG[n]}`;

// deterministic pseudo random
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];

const CATEGORIES = [
  { slug: "dresses", name: "Dresses", image: 17, description: "Gowns, midis and minis for every hour of the day." },
  { slug: "tops", name: "Tops & Shirts", image: 22, description: "Blouses, shirts, knits and the perfect tee." },
  { slug: "jeans-trousers", name: "Jeans & Trousers", image: 103, description: "Wide-leg denim, tailored trousers and easy joggers." },
  { slug: "skirts", name: "Skirts", image: 29, description: "Pleats, minis and fluid midis." },
  { slug: "co-ords", name: "Co-ord Sets", image: 61, description: "Matched sets and jumpsuits that do the styling for you." },
  { slug: "outerwear", name: "Outerwear", image: 31, description: "Trenches, coats and jackets to finish the look." },
  { slug: "ethnic-fusion", name: "Ethnic & Fusion", image: 34, description: "Sarees, anarkalis and modern Indian silhouettes." },
  { slug: "activewear", name: "Activewear", image: 38, description: "Movement-ready sets in performance fabrics." },
  { slug: "accessories", name: "Accessories", image: 41, description: "Bags, jewellery and shoes to complete the edit." },
];

type Colour = { name: string; hex: string; images: number[] };
type P = {
  name: string; cat: string; type: string; price: number; compare?: number;
  colours: Colour[]; extra?: number[];
  material: string; occasion: string; style: string; fit: string; sleeve: string; neckline: string; pattern: string;
  slot: string; silhouette: string; length: number; fabric: string;
  brand?: string; isNew?: boolean; trending?: boolean; sizes?: string[]; ai?: boolean; desc: string;
};

const APPAREL = ["XS", "S", "M", "L", "XL", "XXL"];
const C = (name: string, hex: string, ...images: number[]): Colour => ({ name, hex, images });

const PRODUCTS: P[] = [
  // ── Dresses
  { name: "Aurelia Off-Shoulder Gown", cat: "dresses", type: "DRESS", price: 8990, compare: 11490, colours: [C("Plum", "#5B2A5E", 16), C("Scarlet", "#B3202A", 17)], material: "Satin", occasion: "Evening", style: "Romantic", fit: "Slim", sleeve: "Sleeveless", neckline: "Off-shoulder", pattern: "Solid", slot: "FULL", silhouette: "gown", length: 1, fabric: "satin", isNew: true, trending: true, ai: true, desc: "A sweeping off-shoulder gown cut from fluid satin, with a fitted bodice that softens into a floor-grazing skirt." },
  { name: "Celine Cut-Out Maxi", cat: "dresses", type: "DRESS", price: 6490, compare: 7990, colours: [C("Violet", "#5A3D8A", 15)], material: "Jersey", occasion: "Evening", style: "Contemporary", fit: "Slim", sleeve: "Sleeveless", neckline: "Halter", pattern: "Solid", slot: "FULL", silhouette: "bodycon", length: 0.95, fabric: "jersey", isNew: true, ai: true, desc: "Sculpted stretch-jersey maxi with architectural waist cut-outs and a halter neckline." },
  { name: "Rosa Polka Midi", cat: "dresses", type: "DRESS", price: 3290, colours: [C("Cherry", "#B5212E", 18, 58)], material: "Viscose", occasion: "Vacation", style: "Romantic", fit: "Regular", sleeve: "Short", neckline: "Square", pattern: "Polka", slot: "FULL", silhouette: "a-line", length: 0.65, fabric: "viscose", trending: true, ai: true, desc: "Breezy viscose midi with a square neckline, puffed short sleeves and a swishy tiered hem." },
  { name: "Marlowe Shirt Dress", cat: "dresses", type: "DRESS", price: 3490, colours: [C("Burgundy", "#6B1F2E", 19), C("Chambray", "#7C9CC4", 30)], material: "Cotton", occasion: "Work", style: "Classic", fit: "Regular", sleeve: "Short", neckline: "Collared", pattern: "Solid", slot: "FULL", silhouette: "shirt-dress", length: 0.7, fabric: "cotton", ai: true, desc: "A considered shirt dress in crisp cotton with a self-tie waist and concealed button placket." },
  { name: "Scarlet Slit Column Gown", cat: "dresses", type: "DRESS", price: 9490, colours: [C("Scarlet", "#A3141F", 20)], material: "Crepe", occasion: "Evening", style: "Contemporary", fit: "Slim", sleeve: "Long", neckline: "V-neck", pattern: "Solid", slot: "FULL", silhouette: "column", length: 1, fabric: "crepe", isNew: true, ai: true, desc: "Long-sleeve crepe column gown with a plunging V and a thigh-high side slit." },
  { name: "Bloom Floral Wrap Dress", cat: "dresses", type: "DRESS", price: 3990, compare: 4990, colours: [C("Ivory Floral", "#EFE6DA", 3), C("Blush", "#E7B9B5", 109)], material: "Georgette", occasion: "Vacation", style: "Boho", fit: "Relaxed", sleeve: "Short", neckline: "V-neck", pattern: "Floral", slot: "FULL", silhouette: "a-line", length: 0.75, fabric: "georgette", trending: true, ai: true, desc: "Floaty georgette wrap dress printed with painterly blooms, finished with fluttering sleeves." },
  { name: "Solene Linen Sundress", cat: "dresses", type: "DRESS", price: 2790, colours: [C("Chalk", "#EDEBE4", 69)], material: "Linen", occasion: "Vacation", style: "Minimal", fit: "Relaxed", sleeve: "Sleeveless", neckline: "Square", pattern: "Solid", slot: "FULL", silhouette: "a-line", length: 0.8, fabric: "linen", isNew: true, ai: true, desc: "Pure linen sundress with a square neck and a relaxed column shape that moves in the heat." },
  { name: "Odette Off-Shoulder Mini", cat: "dresses", type: "DRESS", price: 2990, colours: [C("White", "#F4F2EE", 73)], material: "Cotton", occasion: "Party", style: "Romantic", fit: "Regular", sleeve: "Short", neckline: "Off-shoulder", pattern: "Solid", slot: "FULL", silhouette: "a-line", length: 0.45, fabric: "cotton", ai: true, desc: "A ruffled off-shoulder mini in airy cotton, made for golden-hour plans." },
  { name: "Seraphine Embroidered Gown", cat: "dresses", type: "DRESS", price: 14990, compare: 18990, colours: [C("Wine", "#7A1F3D", 74)], material: "Tulle", occasion: "Festive", style: "Romantic", fit: "Regular", sleeve: "Sleeveless", neckline: "V-neck", pattern: "Embroidered", slot: "FULL", silhouette: "ball-gown", length: 1, fabric: "tulle", trending: true, desc: "Layered tulle ball gown hand-finished with tonal floral embroidery." },
  { name: "Coral Tiered Maxi", cat: "dresses", type: "DRESS", price: 4290, colours: [C("Coral", "#E5937A", 63)], material: "Cotton", occasion: "Vacation", style: "Boho", fit: "Relaxed", sleeve: "Sleeveless", neckline: "V-neck", pattern: "Solid", slot: "FULL", silhouette: "a-line", length: 0.95, fabric: "cotton", ai: true, desc: "Tiered cotton maxi with a gathered waist and adjustable straps." },
  { name: "Riviera Slip Maxi", cat: "dresses", type: "DRESS", price: 3790, colours: [C("Sky", "#A9C2D9", 104)], material: "Satin", occasion: "Vacation", style: "Minimal", fit: "Regular", sleeve: "Sleeveless", neckline: "V-neck", pattern: "Solid", slot: "FULL", silhouette: "slip", length: 0.95, fabric: "satin", isNew: true, ai: true, desc: "Bias-cut slip maxi in liquid satin with a high leg split." },
  { name: "Ruby Ruffle Dress", cat: "dresses", type: "DRESS", price: 4590, colours: [C("Ruby", "#9E1B32", 111)], material: "Organza", occasion: "Party", style: "Romantic", fit: "Regular", sleeve: "Short", neckline: "Off-shoulder", pattern: "Solid", slot: "FULL", silhouette: "a-line", length: 0.6, fabric: "organza", desc: "Statement organza dress with cascading ruffles." },
  { name: "Noir Column Midi", cat: "dresses", type: "DRESS", price: 4990, colours: [C("Black", "#141212", 79)], material: "Crepe", occasion: "Work", style: "Minimal", fit: "Regular", sleeve: "Long", neckline: "Crew", pattern: "Solid", slot: "FULL", silhouette: "column", length: 0.85, fabric: "crepe", trending: true, ai: true, desc: "The everything dress: long-sleeve crepe midi with a softly belted waist." },

  // ── Tops
  { name: "Essential Crew Tee", cat: "tops", type: "TOP", price: 990, colours: [C("Black", "#161616", 96), C("Heather Grey", "#A6A6A8", 100), C("White", "#F5F5F2", 113)], material: "Cotton", occasion: "Casual", style: "Minimal", fit: "Regular", sleeve: "Short", neckline: "Crew", pattern: "Solid", slot: "TOP", silhouette: "tee", length: 0.32, fabric: "cotton", trending: true, ai: true, desc: "Heavyweight organic-cotton tee with a clean crew neck and a gently boxy body." },
  { name: "Odessa Puff-Sleeve Blouse", cat: "tops", type: "TOP", price: 2490, colours: [C("Ivory", "#F1ECE4", 22)], material: "Cotton", occasion: "Work", style: "Romantic", fit: "Relaxed", sleeve: "Long", neckline: "Square", pattern: "Solid", slot: "TOP", silhouette: "blouse", length: 0.33, fabric: "cotton", isNew: true, ai: true, desc: "Cotton-poplin blouse with voluminous puff sleeves and smocked cuffs." },
  { name: "Atelier Poplin Shirt", cat: "tops", type: "SHIRT", price: 2290, colours: [C("White", "#F7F7F5", 66, 23, 52)], material: "Cotton", occasion: "Work", style: "Classic", fit: "Regular", sleeve: "Long", neckline: "Collared", pattern: "Solid", slot: "TOP", silhouette: "shirt", length: 0.4, fabric: "cotton", trending: true, ai: true, desc: "The crisp white shirt, perfected: compact poplin, a sharp point collar and a curved hem to tuck or wear loose." },
  { name: "Breton Stripe Shirt", cat: "tops", type: "SHIRT", price: 1990, colours: [C("Navy Stripe", "#3B4660", 29)], material: "Cotton", occasion: "Casual", style: "Classic", fit: "Regular", sleeve: "Long", neckline: "Collared", pattern: "Striped", slot: "TOP", silhouette: "shirt", length: 0.36, fabric: "cotton", ai: true, desc: "Fine-striped cotton shirt with a relaxed shoulder." },
  { name: "Isla Ribbed Tank", cat: "tops", type: "TOP", price: 1290, colours: [C("White", "#F4F3EF", 67)], material: "Cotton", occasion: "Casual", style: "Minimal", fit: "Slim", sleeve: "Sleeveless", neckline: "Crew", pattern: "Solid", slot: "TOP", silhouette: "tank", length: 0.3, fabric: "rib", ai: true, desc: "Second-skin rib tank with a high neckline. Layer it or wear it solo." },
  { name: "Wren Wrap Top", cat: "tops", type: "TOP", price: 1890, colours: [C("Black", "#161414", 102)], material: "Viscose", occasion: "Party", style: "Contemporary", fit: "Slim", sleeve: "Long", neckline: "V-neck", pattern: "Solid", slot: "TOP", silhouette: "wrap", length: 0.3, fabric: "jersey", isNew: true, ai: true, desc: "A fluid wrap top with a deep V and a tie at the side waist." },
  { name: "Soft Sculpt Knit", cat: "tops", type: "TOP", price: 2990, compare: 3790, colours: [C("Charcoal", "#5A5A5E", 71, 54)], material: "Wool Blend", occasion: "Casual", style: "Minimal", fit: "Oversized", sleeve: "Long", neckline: "Crew", pattern: "Solid", slot: "TOP", silhouette: "sweater", length: 0.38, fabric: "knit", ai: true, desc: "Oversized merino-blend sweater with dropped shoulders and a cosy rolled hem." },
  { name: "Mira Poncho Knit", cat: "tops", type: "TOP", price: 2690, colours: [C("Cream", "#EFE6D6", 8)], material: "Cotton", occasion: "Vacation", style: "Boho", fit: "Relaxed", sleeve: "Three-quarter", neckline: "V-neck", pattern: "Solid", slot: "TOP", silhouette: "poncho", length: 0.4, fabric: "knit", desc: "Open-knit poncho with a fringed hem." },
  { name: "Sienna Satin Cami", cat: "tops", type: "TOP", price: 1790, colours: [C("Saffron", "#D9A441", 97)], material: "Satin", occasion: "Party", style: "Contemporary", fit: "Regular", sleeve: "Sleeveless", neckline: "V-neck", pattern: "Solid", slot: "TOP", silhouette: "cami", length: 0.3, fabric: "satin", isNew: true, ai: true, desc: "Bias-cut satin cami with fine adjustable straps." },
  { name: "Linear Graphic Tee", cat: "tops", type: "TOP", price: 1290, colours: [C("Washed Black", "#232323", 13, 26)], material: "Cotton", occasion: "Casual", style: "Street", fit: "Relaxed", sleeve: "Short", neckline: "Crew", pattern: "Printed", slot: "TOP", silhouette: "tee", length: 0.33, fabric: "cotton", ai: true, desc: "Garment-washed graphic tee with a soft, lived-in hand." },
  { name: "Ivy Sleeveless Shell", cat: "tops", type: "TOP", price: 1590, colours: [C("White", "#F3F1EC", 98)], material: "Crepe", occasion: "Work", style: "Minimal", fit: "Regular", sleeve: "Sleeveless", neckline: "Crew", pattern: "Solid", slot: "TOP", silhouette: "shell", length: 0.32, fabric: "crepe", ai: true, desc: "Clean-lined crepe shell top for desk-to-dinner dressing." },
  { name: "Marin Sailor Blouse", cat: "tops", type: "SHIRT", price: 2390, colours: [C("White", "#F5F4F0", 117)], material: "Cotton", occasion: "Work", style: "Classic", fit: "Regular", sleeve: "Long", neckline: "Collared", pattern: "Solid", slot: "TOP", silhouette: "shirt", length: 0.33, fabric: "cotton", desc: "Tailored blouse with a pointed collar and slim cuffs." },

  // ── Jeans & trousers
  { name: "Tokyo Wide-Leg Jean", cat: "jeans-trousers", type: "JEANS", price: 2990, colours: [C("Indigo", "#2F4468", 68, 103)], material: "Denim", occasion: "Casual", style: "Contemporary", fit: "Relaxed", sleeve: "NA", neckline: "NA", pattern: "Solid", slot: "BOTTOM", silhouette: "wide-leg", length: 1, fabric: "denim", trending: true, ai: true, desc: "High-rise wide-leg jean in rigid Japanese denim that softens with every wear." },
  { name: "Lou Straight Jean", cat: "jeans-trousers", type: "JEANS", price: 2690, colours: [C("Light Wash", "#9DB5CF", 40, 39, 53)], material: "Denim", occasion: "Casual", style: "Classic", fit: "Regular", sleeve: "NA", neckline: "NA", pattern: "Solid", slot: "BOTTOM", silhouette: "straight", length: 1, fabric: "denim", isNew: true, ai: true, desc: "Mid-rise straight jean in a light vintage wash." },
  { name: "Distressed Boyfriend Jean", cat: "jeans-trousers", type: "JEANS", price: 2490, compare: 2990, colours: [C("Mid Wash", "#58739A", 27, 94)], material: "Denim", occasion: "Casual", style: "Street", fit: "Relaxed", sleeve: "NA", neckline: "NA", pattern: "Solid", slot: "BOTTOM", silhouette: "straight", length: 0.95, fabric: "denim", ai: true, desc: "Slouchy boyfriend jean with hand-finished abrasions." },
  { name: "Palermo Pleated Trouser", cat: "jeans-trousers", type: "TROUSERS", price: 2790, colours: [C("Sand", "#D7C3A6", 93)], material: "Linen", occasion: "Work", style: "Classic", fit: "Relaxed", sleeve: "NA", neckline: "NA", pattern: "Solid", slot: "BOTTOM", silhouette: "wide-leg", length: 1, fabric: "linen", isNew: true, ai: true, desc: "Front-pleated wide-leg trouser in a linen blend." },
  { name: "Cloud Jogger", cat: "jeans-trousers", type: "TROUSERS", price: 1990, colours: [C("Blush", "#E6B7B0", 21)], material: "Cotton", occasion: "Lounge", style: "Street", fit: "Relaxed", sleeve: "NA", neckline: "NA", pattern: "Solid", slot: "BOTTOM", silhouette: "jogger", length: 0.95, fabric: "fleece", ai: true, desc: "Brushed-back fleece jogger with a tapered cuff." },

  // ── Skirts
  { name: "Gigi Skater Skirt", cat: "skirts", type: "SKIRT", price: 1790, colours: [C("Black", "#161515", 29)], material: "Crepe", occasion: "Work", style: "Classic", fit: "Regular", sleeve: "NA", neckline: "NA", pattern: "Solid", slot: "BOTTOM", silhouette: "skater", length: 0.45, fabric: "crepe", ai: true, desc: "High-waisted skater skirt with a full circle hem." },
  { name: "Rouge Lace Skirt", cat: "skirts", type: "SKIRT", price: 2290, colours: [C("Rouge", "#A11F2B", 61)], material: "Lace", occasion: "Party", style: "Romantic", fit: "Slim", sleeve: "NA", neckline: "NA", pattern: "Embroidered", slot: "BOTTOM", silhouette: "pencil", length: 0.4, fabric: "lace", desc: "Corded-lace mini skirt, lined in satin. Pairs with the Rouge Lace Top." },
  { name: "Plissé Midi Skirt", cat: "skirts", type: "SKIRT", price: 2590, colours: [C("Stone", "#CBBFAE", 87)], material: "Polyester", occasion: "Work", style: "Minimal", fit: "Regular", sleeve: "NA", neckline: "NA", pattern: "Solid", slot: "BOTTOM", silhouette: "pleated", length: 0.75, fabric: "satin", isNew: true, ai: true, desc: "Sunray-pleated midi skirt with an elasticated waist." },

  // ── Co-ords
  { name: "Rouge Lace Two-Piece", cat: "co-ords", type: "COORD", price: 4490, colours: [C("Rouge", "#A11F2B", 61)], material: "Lace", occasion: "Party", style: "Romantic", fit: "Slim", sleeve: "Short", neckline: "Off-shoulder", pattern: "Embroidered", slot: "FULL", silhouette: "two-piece", length: 0.4, fabric: "lace", trending: true, ai: true, desc: "Off-shoulder lace crop top and matching mini skirt." },
  { name: "Lagoon Halter Jumpsuit", cat: "co-ords", type: "COORD", price: 3990, colours: [C("Teal", "#1F7A80", 10)], material: "Crepe", occasion: "Evening", style: "Contemporary", fit: "Regular", sleeve: "Sleeveless", neckline: "Halter", pattern: "Solid", slot: "FULL", silhouette: "jumpsuit", length: 1, fabric: "crepe", isNew: true, ai: true, desc: "Halter-neck crepe jumpsuit with a wide palazzo leg." },
  { name: "Verdant Flare Set", cat: "co-ords", type: "COORD", price: 4290, colours: [C("Emerald", "#1D6B54", 5)], material: "Satin", occasion: "Party", style: "Contemporary", fit: "Slim", sleeve: "Long", neckline: "V-neck", pattern: "Solid", slot: "FULL", silhouette: "jumpsuit", length: 1, fabric: "satin", ai: true, desc: "Satin shirt and flared trouser set in a jewel-toned emerald." },
  { name: "Olive Utility Romper", cat: "co-ords", type: "COORD", price: 2490, colours: [C("Olive", "#4E553B", 84)], material: "Cotton", occasion: "Casual", style: "Street", fit: "Relaxed", sleeve: "Sleeveless", neckline: "V-neck", pattern: "Solid", slot: "FULL", silhouette: "romper", length: 0.4, fabric: "cotton", ai: true, desc: "Utility romper with patch pockets and a drawstring waist." },
  { name: "Ivory Tailored Suit", cat: "co-ords", type: "COORD", price: 7990, compare: 9490, colours: [C("Ivory", "#EEE9DF", 75, 72)], material: "Wool Blend", occasion: "Work", style: "Classic", fit: "Regular", sleeve: "Long", neckline: "V-neck", pattern: "Solid", slot: "FULL", silhouette: "suit", length: 1, fabric: "wool", trending: true, ai: true, desc: "Single-breasted blazer and straight trouser in an ivory wool blend." },

  // ── Outerwear
  { name: "Classic Trench", cat: "outerwear", type: "JACKET", price: 6990, compare: 8490, colours: [C("Camel", "#B08C62", 31), C("Stone", "#D9D2C5", 106)], material: "Cotton Gabardine", occasion: "Work", style: "Classic", fit: "Regular", sleeve: "Long", neckline: "Collared", pattern: "Solid", slot: "OUTER", silhouette: "trench", length: 0.8, fabric: "gabardine", trending: true, desc: "Double-breasted trench in water-resistant cotton gabardine." },
  { name: "Halo Puffer", cat: "outerwear", type: "JACKET", price: 5490, colours: [C("Sunflower", "#E3B21F", 32)], material: "Nylon", occasion: "Casual", style: "Street", fit: "Oversized", sleeve: "Long", neckline: "Collared", pattern: "Solid", slot: "OUTER", silhouette: "puffer", length: 0.4, fabric: "nylon", isNew: true, desc: "Cropped, high-shine puffer with recycled insulation." },
  { name: "Field Utility Jacket", cat: "outerwear", type: "JACKET", price: 4790, colours: [C("Olive", "#5B5E3E", 60)], material: "Cotton", occasion: "Casual", style: "Street", fit: "Relaxed", sleeve: "Long", neckline: "Collared", pattern: "Solid", slot: "OUTER", silhouette: "jacket", length: 0.4, fabric: "cotton", desc: "Four-pocket utility jacket with a faux-shearling collar." },
  { name: "Rust Bomber", cat: "outerwear", type: "JACKET", price: 3990, colours: [C("Rust", "#A45337", 77)], material: "Suede-feel", occasion: "Casual", style: "Contemporary", fit: "Relaxed", sleeve: "Long", neckline: "Crew", pattern: "Solid", slot: "OUTER", silhouette: "bomber", length: 0.36, fabric: "suede", trending: true, desc: "Soft-touch bomber in a terracotta hue with ribbed trims." },
  { name: "Sherpa Denim Jacket", cat: "outerwear", type: "JACKET", price: 3490, colours: [C("Indigo", "#2E4366", 83, 49)], material: "Denim", occasion: "Casual", style: "Classic", fit: "Regular", sleeve: "Long", neckline: "Collared", pattern: "Solid", slot: "OUTER", silhouette: "jacket", length: 0.36, fabric: "denim", desc: "Classic trucker jacket lined in cosy sherpa." },
  { name: "Noir Longline Coat", cat: "outerwear", type: "JACKET", price: 8490, colours: [C("Black", "#151313", 51)], material: "Wool", occasion: "Evening", style: "Classic", fit: "Slim", sleeve: "Long", neckline: "Collared", pattern: "Solid", slot: "OUTER", silhouette: "coat", length: 0.9, fabric: "wool", desc: "Floor-sweeping wool coat with a military-inspired button front." },
  { name: "Houndstooth Overcoat", cat: "outerwear", type: "JACKET", price: 7490, colours: [C("Monochrome", "#7A7A7A", 108)], material: "Wool Blend", occasion: "Work", style: "Classic", fit: "Oversized", sleeve: "Long", neckline: "Collared", pattern: "Check", slot: "OUTER", silhouette: "coat", length: 0.7, fabric: "wool", isNew: true, desc: "Oversized houndstooth overcoat with dropped shoulders." },
  { name: "Boyfriend Blazer", cat: "outerwear", type: "JACKET", price: 5290, colours: [C("Charcoal", "#3D3B3C", 107)], material: "Wool Blend", occasion: "Work", style: "Contemporary", fit: "Oversized", sleeve: "Long", neckline: "V-neck", pattern: "Solid", slot: "OUTER", silhouette: "blazer", length: 0.45, fabric: "wool", trending: true, desc: "Relaxed single-breasted blazer with padded shoulders." },
  { name: "Bordeaux Wool Coat", cat: "outerwear", type: "JACKET", price: 7990, colours: [C("Bordeaux", "#5E1E2A", 1)], material: "Wool", occasion: "Work", style: "Classic", fit: "Regular", sleeve: "Long", neckline: "Collared", pattern: "Solid", slot: "OUTER", silhouette: "coat", length: 0.7, fabric: "wool", desc: "Double-faced wool coat in a deep bordeaux." },
  { name: "Denim Trench", cat: "outerwear", type: "JACKET", price: 5990, colours: [C("Light Indigo", "#7E9CC1", 4)], material: "Denim", occasion: "Casual", style: "Contemporary", fit: "Relaxed", sleeve: "Long", neckline: "Collared", pattern: "Solid", slot: "OUTER", silhouette: "trench", length: 0.85, fabric: "denim", isNew: true, desc: "Belted denim trench with storm flaps." },
  { name: "Ecru Wrap Coat", cat: "outerwear", type: "JACKET", price: 6790, colours: [C("Ecru", "#D6C7AE", 85)], material: "Wool Blend", occasion: "Casual", style: "Minimal", fit: "Relaxed", sleeve: "Long", neckline: "Collared", pattern: "Solid", slot: "OUTER", silhouette: "coat", length: 0.75, fabric: "wool", desc: "Belted wrap coat in a brushed ecru wool." },

  // ── Ethnic & fusion
  { name: "Banarasi Silk Saree", cat: "ethnic-fusion", type: "ETHNIC", price: 12990, compare: 15990, colours: [C("Magenta Gold", "#8C1E5A", 34)], material: "Silk", occasion: "Festive", style: "Traditional", fit: "Regular", sleeve: "Short", neckline: "Boat", pattern: "Embroidered", slot: "FULL", silhouette: "saree", length: 1, fabric: "silk", trending: true, sizes: ["ONE"], desc: "Handwoven Banarasi silk saree with zari borders and an unstitched blouse piece." },
  { name: "Temple Border Silk Saree", cat: "ethnic-fusion", type: "ETHNIC", price: 10990, colours: [C("Crimson", "#A81D24", 36)], material: "Silk", occasion: "Festive", style: "Traditional", fit: "Regular", sleeve: "Short", neckline: "Boat", pattern: "Embroidered", slot: "FULL", silhouette: "saree", length: 1, fabric: "silk", isNew: true, sizes: ["ONE"], desc: "Rich silk saree with a contrast temple border, inspired by South Indian weaving traditions." },
  { name: "Chikankari Anarkali", cat: "ethnic-fusion", type: "ETHNIC", price: 6490, colours: [C("Ivory", "#EFEBE3", 35)], material: "Georgette", occasion: "Festive", style: "Traditional", fit: "Regular", sleeve: "Long", neckline: "V-neck", pattern: "Embroidered", slot: "FULL", silhouette: "anarkali", length: 1, fabric: "georgette", ai: true, desc: "Floor-length georgette anarkali with hand chikankari embroidery and a matching dupatta." },
  { name: "Teal Flow Anarkali", cat: "ethnic-fusion", type: "ETHNIC", price: 5490, colours: [C("Teal", "#2D7F7B", 37)], material: "Chanderi", occasion: "Festive", style: "Traditional", fit: "Relaxed", sleeve: "Three-quarter", neckline: "Round", pattern: "Solid", slot: "FULL", silhouette: "anarkali", length: 1, fabric: "silk", ai: true, desc: "Chanderi anarkali with a gently flared, flowing hem." },

  // ── Activewear
  { name: "Sunbeam Track Set", cat: "activewear", type: "ACTIVE", price: 3290, colours: [C("Sunflower", "#E7B526", 0)], material: "Nylon", occasion: "Sport", style: "Street", fit: "Relaxed", sleeve: "Long", neckline: "Collared", pattern: "Solid", slot: "FULL", silhouette: "tracksuit", length: 1, fabric: "nylon", isNew: true, ai: true, desc: "Retro track jacket and jogger set in a crinkle nylon." },
  { name: "Studio Sculpt Set", cat: "activewear", type: "ACTIVE", price: 2990, colours: [C("Rose", "#C98C93", 38, 114)], material: "Recycled Nylon", occasion: "Sport", style: "Contemporary", fit: "Slim", sleeve: "Sleeveless", neckline: "Crew", pattern: "Solid", slot: "FULL", silhouette: "active-set", length: 0.95, fabric: "jersey", trending: true, ai: true, desc: "Sculpting sports bra and high-rise legging with four-way stretch." },
  { name: "Pace Runner Sneaker", cat: "activewear", type: "ACCESSORY", price: 4290, colours: [C("Pink Volt", "#E8A0B8", 112)], material: "Mesh", occasion: "Sport", style: "Street", fit: "Regular", sleeve: "NA", neckline: "NA", pattern: "Solid", slot: "ACCESSORY", silhouette: "sneaker", length: 0, fabric: "mesh", sizes: ["36", "37", "38", "39", "40"], desc: "Cushioned everyday runner with a breathable mesh upper." },

  // ── Accessories
  { name: "Siena Leather Satchel", cat: "accessories", type: "ACCESSORY", price: 5990, colours: [C("Tangerine", "#D46A2E", 41)], material: "Leather", occasion: "Work", style: "Classic", fit: "Regular", sleeve: "NA", neckline: "NA", pattern: "Solid", slot: "ACCESSORY", silhouette: "bag", length: 0, fabric: "leather", trending: true, sizes: ["ONE"], desc: "Structured top-handle satchel in smooth vegetable-tanned leather." },
  { name: "Cognac Crossbody", cat: "accessories", type: "ACCESSORY", price: 3990, colours: [C("Cognac", "#8A4B2A", 28)], material: "Leather", occasion: "Casual", style: "Minimal", fit: "Regular", sleeve: "NA", neckline: "NA", pattern: "Solid", slot: "ACCESSORY", silhouette: "bag", length: 0, fabric: "leather", sizes: ["ONE"], desc: "Compact crossbody with an adjustable strap and brass hardware." },
  { name: "Pavé Chain Bracelet", cat: "accessories", type: "ACCESSORY", price: 2490, colours: [C("Rose Gold", "#D8A89A", 42)], material: "Brass", occasion: "Evening", style: "Romantic", fit: "Regular", sleeve: "NA", neckline: "NA", pattern: "Solid", slot: "ACCESSORY", silhouette: "jewellery", length: 0, fabric: "metal", isNew: true, sizes: ["ONE"], desc: "Delicate pavé link bracelet, 18k rose-gold plated." },
  { name: "Sculpted Ring Duo", cat: "accessories", type: "ACCESSORY", price: 1890, colours: [C("Gold", "#C9A25A", 43)], material: "Brass", occasion: "Casual", style: "Contemporary", fit: "Regular", sleeve: "NA", neckline: "NA", pattern: "Solid", slot: "ACCESSORY", silhouette: "jewellery", length: 0, fabric: "metal", sizes: ["ONE"], desc: "Two stackable sculpted rings in 18k gold plate." },
  { name: "Glass Stiletto Pump", cat: "accessories", type: "ACCESSORY", price: 4490, colours: [C("Crystal", "#E5E1E6", 92)], material: "PVC", occasion: "Evening", style: "Romantic", fit: "Regular", sleeve: "NA", neckline: "NA", pattern: "Solid", slot: "ACCESSORY", silhouette: "heels", length: 0, fabric: "pvc", sizes: ["36", "37", "38", "39", "40"], desc: "Embellished pointed pump on a slender stiletto." },
  { name: "Weekend Canvas Sneaker", cat: "accessories", type: "ACCESSORY", price: 2990, colours: [C("Coral", "#E0745D", 105)], material: "Canvas", occasion: "Casual", style: "Street", fit: "Regular", sleeve: "NA", neckline: "NA", pattern: "Solid", slot: "ACCESSORY", silhouette: "sneaker", length: 0, fabric: "canvas", sizes: ["36", "37", "38", "39", "40"], desc: "Low-top canvas sneaker with a vulcanised sole." },
];

const SIZE_CHART: Record<string, { bust: number; waist: number; hip: number }> = {
  XS: { bust: 80, waist: 62, hip: 86 }, S: { bust: 85, waist: 67, hip: 91 }, M: { bust: 90, waist: 72, hip: 96 },
  L: { bust: 96, waist: 78, hip: 102 }, XL: { bust: 102, waist: 84, hip: 108 }, XXL: { bust: 110, waist: 92, hip: 116 },
};

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const REVIEWERS = ["Ananya R.", "Priya S.", "Meera K.", "Ishita P.", "Kavya N.", "Riya M.", "Aditi V.", "Sneha G.", "Tara D.", "Nisha J."];
const REVIEW_LINES: [string, string][] = [
  ["Beautifully made", "The fabric feels far more expensive than the price. Fits exactly as the size guide says."],
  ["My new favourite", "I have worn it three times in a week. Comfortable and flattering."],
  ["Great fit", "Tried it in the Virtual Studio first and the size suggestion was right."],
  ["Lovely, runs slightly small", "Gorgeous colour. I'd size up if you are between sizes."],
  ["Elegant and versatile", "Dressed it up for dinner and down for brunch. Worth it."],
  ["Good quality", "Stitching and finish are excellent. Delivery was quick too."],
];

async function main() {
  console.log("Clearing…");
  // order matters for FKs
  for (const m of [
    "aIStylistMessage", "aIStylistConversation", "tryOnResult", "tryOnSession", "refund", "returnRequest", "shipment", "payment",
    "orderItem", "order", "cartItem", "cart", "savedOutfitItem", "savedOutfit", "wardrobe", "wishlistItem", "wishlist",
    "review", "collectionProduct", "collection", "garmentConfiguration", "product3DAsset", "productInventory", "productVariant",
    "productImage", "product", "productCategory", "brand", "avatarConfiguration", "avatar", "customerMeasurement", "address",
    "userProfile", "user", "coupon", "campaign", "editorialStory",
  ] as const) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any)[m].deleteMany();
  }

  const brands = await Promise.all(
    ["VESTRA", "VESTRA Atelier", "VESTRA Studio", "VESTRA Heritage"].map((name) =>
      prisma.brand.create({ data: { name, slug: slugify(name) } })
    )
  );
  const brandFor = (p: P) =>
    p.cat === "ethnic-fusion" ? brands[3] : p.cat === "activewear" ? brands[2] : p.price > 6000 ? brands[1] : brands[0];

  const cats: Record<string, string> = {};
  for (const [i, c] of CATEGORIES.entries()) {
    const row = await prisma.productCategory.create({
      data: { slug: c.slug, name: c.name, description: c.description, image: img(c.image), sortOrder: i },
    });
    cats[c.slug] = row.id;
  }

  const productIds: Record<string, string> = {};
  for (const [pi, p] of PRODUCTS.entries()) {
    const slug = slugify(p.name);
    const sizes = p.sizes ?? APPAREL;
    const measurements = Object.fromEntries(
      sizes.filter((s) => SIZE_CHART[s]).map((s) => {
        const b = SIZE_CHART[s];
        const ease = p.fit === "Slim" ? 2 : p.fit === "Regular" ? 6 : p.fit === "Relaxed" ? 10 : 16;
        return [s, { bust: b.bust + ease, waist: b.waist + ease, hip: b.hip + ease, length: Math.round(40 + p.length * 100) }];
      })
    );
    const product = await prisma.product.create({
      data: {
        slug, name: p.name, description: p.desc, brandId: brandFor(p).id, categoryId: cats[p.cat], garmentType: p.type,
        price: p.price, compareAtPrice: p.compare ?? null, material: p.material,
        composition: compositionFor(p.material), care: careFor(p.material),
        occasion: p.occasion, style: p.style, fit: p.fit, sleeve: p.sleeve, neckline: p.neckline, pattern: p.pattern,
        modelInfo: p.slot === "ACCESSORY" ? null : `Model is 175 cm and wears size ${p.sizes ? p.sizes[0] : "S"}.`,
        measurements: JSON.stringify(measurements),
        popularity: Math.floor(rand() * 1000), isNew: !!p.isNew, isTrending: !!p.trending,
        tryOnEnabled: p.slot !== "ACCESSORY" || ["bag", "jewellery"].includes(p.silhouette),
        aiTryOnEnabled: !!p.ai,
        createdAt: new Date(Date.now() - (p.isNew ? rand() * 10 : 15 + rand() * 120) * 86400000),
        images: {
          create: p.colours.flatMap((c) =>
            c.images.map((n, k) => ({
              url: img(n), alt: `${p.name} in ${c.name}${k ? ` – view ${k + 1}` : ""}`,
              color: p.colours.length > 1 ? c.name : null, kind: k === 0 ? "FRONT" : k === 1 ? "LIFESTYLE" : "DETAIL", sortOrder: k,
            }))
          ),
        },
        garment: {
          create: {
            slot: p.slot, silhouette: p.silhouette, lengthRatio: p.length, fabric: p.fabric,
            ease: p.fit === "Slim" ? 1.02 : p.fit === "Regular" ? 1.05 : p.fit === "Relaxed" ? 1.09 : 1.15,
          },
        },
        assets: { create: p.colours.map((c) => ({ color: c.name, kind: "GARMENT", format: "procedural" })) },
      },
    });
    productIds[slug] = product.id;

    for (const c of p.colours) {
      for (const s of sizes) {
        const r = rand();
        const qty = r < 0.1 ? 0 : r < 0.22 ? 2 : Math.floor(5 + rand() * 30);
        await prisma.productVariant.create({
          data: {
            productId: product.id, sku: `VS-${String(pi + 1).padStart(3, "0")}-${slugify(c.name).slice(0, 4).toUpperCase()}-${s}`,
            color: c.name, colorHex: c.hex, size: s, priceDelta: s === "XXL" ? 200 : 0,
            inventory: { create: { quantity: qty } },
          },
        });
      }
    }

    const nReviews = 2 + Math.floor(rand() * 4);
    let sum = 0;
    for (let k = 0; k < nReviews; k++) {
      const rating = rand() < 0.75 ? 5 : 4;
      sum += rating;
      const [title, body] = pick(REVIEW_LINES);
      await prisma.review.create({
        data: {
          productId: product.id, author: pick(REVIEWERS), rating, title, body,
          sizeBought: sizes[Math.min(sizes.length - 1, 1 + Math.floor(rand() * 3))],
          fitFeedback: pick(["True to size", "True to size", "Runs small", "Runs large"]),
          createdAt: new Date(Date.now() - rand() * 90 * 86400000),
        },
      });
    }
    await prisma.product.update({ where: { id: product.id }, data: { rating: +(sum / nReviews).toFixed(1), ratingCount: nReviews } });
  }

  const COLLECTIONS: { name: string; tagline: string; image: number; featured?: boolean; products: string[] }[] = [
    { name: "The Everyday Edit", tagline: "Pieces you will reach for every morning.", image: 2, featured: true, products: ["essential-crew-tee", "lou-straight-jean", "atelier-poplin-shirt", "soft-sculpt-knit", "cognac-crossbody", "sherpa-denim-jacket"] },
    { name: "Modern Minimalist", tagline: "Clean lines, quiet confidence.", image: 47, featured: true, products: ["noir-column-midi", "ivy-sleeveless-shell", "palermo-pleated-trouser", "boyfriend-blazer", "solene-linen-sundress", "ecru-wrap-coat"] },
    { name: "Weekend Wardrobe", tagline: "Slow mornings and long lunches.", image: 55, products: ["linear-graphic-tee", "tokyo-wide-leg-jean", "cloud-jogger", "olive-utility-romper", "weekend-canvas-sneaker", "mira-poncho-knit"] },
    { name: "Date Night", tagline: "Turn the lights down low.", image: 62, featured: true, products: ["wren-wrap-top", "rouge-lace-two-piece", "sienna-satin-cami", "ruby-ruffle-dress", "glass-stiletto-pump", "pave-chain-bracelet"] },
    { name: "Office Essentials", tagline: "Tailoring that works as hard as you.", image: 72, products: ["ivory-tailored-suit", "atelier-poplin-shirt", "palermo-pleated-trouser", "marlowe-shirt-dress", "siena-leather-satchel", "classic-trench"] },
    { name: "Summer Stories", tagline: "Linen, light and long days.", image: 104, featured: true, products: ["riviera-slip-maxi", "solene-linen-sundress", "bloom-floral-wrap-dress", "coral-tiered-maxi", "rosa-polka-midi", "isla-ribbed-tank"] },
    { name: "Effortless Elegance", tagline: "Polish without the effort.", image: 64, products: ["noir-longline-coat", "celine-cut-out-maxi", "houndstooth-overcoat", "bordeaux-wool-coat", "sculpted-ring-duo"] },
    { name: "Occasion Wear", tagline: "For the moments that matter.", image: 74, products: ["seraphine-embroidered-gown", "aurelia-off-shoulder-gown", "scarlet-slit-column-gown", "banarasi-silk-saree", "chikankari-anarkali", "temple-border-silk-saree"] },
  ];
  for (const [i, c] of COLLECTIONS.entries()) {
    await prisma.collection.create({
      data: {
        slug: slugify(c.name), name: c.name, tagline: c.tagline, image: img(c.image), featured: !!c.featured, sortOrder: i,
        description: `${c.tagline} A considered edit from the VESTRA studio.`,
        products: { create: c.products.filter((s) => productIds[s]).map((s, k) => ({ productId: productIds[s], sortOrder: k })) },
      },
    });
  }

  await prisma.campaign.createMany({
    data: [
      { placement: "ANNOUNCEMENT", title: "The Autumn/Winter '26 collection is here", sortOrder: 0 },
      { placement: "ANNOUNCEMENT", title: "Complimentary shipping on orders above ₹2,499", sortOrder: 1 },
      { placement: "ANNOUNCEMENT", title: "Try it on before you buy. Meet your virtual fitting room.", ctaHref: "/studio", sortOrder: 2 },
      { placement: "HERO", title: "Style is personal.", subtitle: "Autumn / Winter 2026", body: "Discover pieces that reflect you. Explore our latest collection and experience a new way to shop.", image: img(57), ctaLabel: "Shop the collection", ctaHref: "/shop/new-in" },
    ],
  });

  await prisma.editorialStory.createMany({
    data: [
      { slug: "how-to-style-oversized-shirts", title: "How to style oversized shirts", excerpt: "Tucked, knotted, belted or worn as a jacket: four ways with one shirt.", image: img(52), author: "The VESTRA Studio", readMins: 4, body: "The oversized shirt is the most hardworking piece in a modern wardrobe.\n\nHalf-tuck it into wide-leg denim for an easy weekend proportion. Belt it over a slip dress to define the waist. Knot it at the hip above a pleated midi. Or wear it open over a rib tank as the lightest of jackets.\n\nThe rule: let one element be relaxed and keep the other one considered." },
      { slug: "the-art-of-minimal-dressing", title: "The art of minimal dressing", excerpt: "Fewer pieces, better choices, and why restraint reads as confidence.", image: img(47), author: "Isha Menon", readMins: 6, body: "Minimal dressing is not about owning less for its own sake. It is about knowing what works.\n\nStart with a tight palette: black, ivory, stone and one accent. Choose fabrics that hold their shape, such as crepe, wool and heavy cotton. Prioritise fit over trend: a tailor can turn good into exceptional.\n\nThen repeat. A uniform is not boring when every piece is chosen." },
      { slug: "building-a-versatile-wardrobe", title: "Building a versatile wardrobe", excerpt: "The twelve pieces that create more than fifty outfits.", image: img(87), author: "The VESTRA Studio", readMins: 7, body: "A versatile wardrobe is built on pieces that speak to each other.\n\nThe foundation: a white shirt, a crew tee, straight jeans, a tailored trouser, a column midi, a trench, a knit, a blazer, a slip skirt, a crossbody, a clean sneaker and a pump.\n\nUse the VESTRA Virtual Studio to mix them on your avatar and see how far twelve pieces can go." },
      { slug: "five-ways-to-style-one-dress", title: "Five ways to style one dress", excerpt: "From boardroom to brunch with the Noir Column Midi.", image: img(79), author: "Aarohi Shah", readMins: 5, body: "One black midi, five moods.\n\n1. With a boyfriend blazer and loafers for the office.\n2. With a denim jacket and sneakers for the weekend.\n3. With statement earrings and a pump for dinner.\n4. Layered over a poplin shirt for a modern twist.\n5. With a longline coat for winter evenings." },
    ],
  });

  await prisma.coupon.createMany({
    data: [
      { code: "WELCOME10", description: "10% off your first order (up to ₹750)", kind: "PERCENT", value: 10, maxDiscount: 750 },
      { code: "VESTRA500", description: "₹500 off orders above ₹4,999", kind: "FLAT", value: 500, minSubtotal: 4999 },
      { code: "STUDIO15", description: "15% off outfits styled in the Virtual Studio, orders above ₹6,000", kind: "PERCENT", value: 15, minSubtotal: 6000, maxDiscount: 1500 },
    ],
  });

  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? "vestra-admin-2026";
  const demoPass = process.env.SEED_DEMO_PASSWORD ?? "vestra-demo-2026";
  await prisma.user.create({
    data: { email: "admin@vestra.test", name: "VESTRA Admin", role: "ADMIN", passwordHash: await bcrypt.hash(adminPass, 10), profile: { create: {} } },
  });
  await prisma.user.create({
    data: {
      email: "demo@vestra.test", name: "Aanya Kapoor", passwordHash: await bcrypt.hash(demoPass, 10),
      profile: { create: { preferredTopSize: "S", preferredBottomSize: "M", preferredDressSize: "S", fitPreference: "REGULAR", favouriteCategories: JSON.stringify(["dresses", "outerwear"]), stylePreferences: JSON.stringify(["Minimal", "Classic"]) } },
      measurements: { create: { heightCm: 165, bustCm: 86, waistCm: 69, hipCm: 94, shoulderCm: 38 } },
      addresses: { create: { fullName: "Aanya Kapoor", phone: "9800000000", line1: "12 Palm Grove Road", city: "Bengaluru", state: "Karnataka", pincode: "560001", isDefault: true } },
      wishlist: { create: {} }, wardrobe: { create: {} },
    },
  });

  console.log(`Seeded ${PRODUCTS.length} products, ${COLLECTIONS.length} collections.`);
}

function compositionFor(m: string) {
  const map: Record<string, string> = {
    Cotton: "100% organic cotton", Linen: "100% European linen", Denim: "98% cotton, 2% elastane", Satin: "100% polyester satin",
    Crepe: "95% polyester, 5% elastane", Jersey: "92% viscose, 8% elastane", Viscose: "100% LENZING™ ECOVERO™ viscose",
    Georgette: "100% polyester georgette", Silk: "100% mulberry silk", Wool: "80% wool, 20% polyamide", "Wool Blend": "60% wool, 35% polyester, 5% other fibres",
    Leather: "100% bovine leather", Tulle: "100% polyamide, lined in polyester", Lace: "85% nylon, 15% elastane", Organza: "100% polyester organza",
  };
  return map[m] ?? `100% ${m.toLowerCase()}`;
}
function careFor(m: string) {
  if (["Silk", "Wool", "Wool Blend", "Tulle", "Leather", "Organza"].includes(m)) return "Dry clean only. Store on a padded hanger away from direct sunlight.";
  if (["Satin", "Georgette", "Lace", "Viscose", "Chanderi"].includes(m)) return "Hand wash cold, inside out. Do not tumble dry. Cool iron on reverse.";
  return "Machine wash cold with similar colours. Line dry. Warm iron if needed.";
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
