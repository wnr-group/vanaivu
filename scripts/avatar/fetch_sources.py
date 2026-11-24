"""Downloads the CC0 MakeHuman base mesh, body/face targets, skeleton and eye proxy from GitHub.

Usage: python -I scripts/avatar/fetch_sources.py <download-dir>
Assets are CC0 (MakeHuman bundled assets). See makehuman/data/licenses/makehuman_license.txt.
"""
import os, sys, urllib.request

RAW = "https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/"

def t(*names):
    return ["targets/" + n + ".target" for n in names]

FILES = [
    "3dobjs/base.obj",
    "rigs/default.mhskel", "rigs/default_weights.mhw",
    "eyes/high-poly/high-poly.obj", "eyes/high-poly/high-poly.mhclo", "eyes/materials/brown_eye.png",
    *t("macrodetails/african-female-young", "macrodetails/asian-female-young", "macrodetails/caucasian-female-young"),
    *t(*[f"macrodetails/universal-female-young-{m}muscle-{w}weight" for m in ("min", "average", "max") for w in ("min", "average", "max") if not (m == "average" and w == "average")]),
    *t("macrodetails/height/female-young-averagemuscle-averageweight-maxheight", "macrodetails/height/female-young-averagemuscle-averageweight-minheight"),
    *t("breast/female-young-averagemuscle-averageweight-maxcup-averagefirmness", "breast/female-young-averagemuscle-averageweight-mincup-averagefirmness",
       "breast/female-young-averagemuscle-averageweight-averagecup-maxfirmness", "breast/female-young-averagemuscle-averageweight-averagecup-minfirmness"),
    *t(*[f"measure/measure-{m}-{d}" for m in ("bust-circ", "underbust-circ", "waist-circ", "hips-circ", "shoulder-dist", "upperarm-circ", "thigh-circ", "calf-circ", "neck-circ", "upperleg-height", "lowerleg-height") for d in ("incr", "decr")]),
    *t("stomach/stomach-pregnant-incr", "stomach/stomach-pregnant-decr", "buttocks/buttocks-volume-incr", "buttocks/buttocks-volume-decr",
       "hip/hip-scale-horiz-incr", "hip/hip-scale-horiz-decr"),
    *t("head/head-oval", "head/head-round", "head/head-invertedtriangular", "head/head-square", "head/head-fat-incr", "head/head-fat-decr"),
    *t("nose/nose-scale-horiz-incr", "nose/nose-scale-horiz-decr", "nose/nose-scale-vert-incr", "nose/nose-scale-vert-decr"),
    *t("mouth/mouth-scale-horiz-incr", "mouth/mouth-scale-horiz-decr", "mouth/mouth-scale-vert-incr", "mouth/mouth-scale-vert-decr"),
    *t("eyes/l-eye-scale-incr", "eyes/l-eye-scale-decr", "eyes/r-eye-scale-incr", "eyes/r-eye-scale-decr"),
]

def main(out):
    for rel in FILES:
        dst = os.path.join(out, rel)
        if os.path.exists(dst):
            continue
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with urllib.request.urlopen(RAW + rel, timeout=60) as r:
            open(dst, "wb").write(r.read())
        print("got", rel)

if __name__ == "__main__":
    main(sys.argv[1])
