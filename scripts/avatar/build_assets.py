"""Builds VESTRA's realistic avatar web assets from CC0 MakeHuman sources.

python -I scripts/avatar/build_assets.py <mh_src_dir> <mh_assets_dir> <out_dir>

<mh_src_dir>    output of fetch_sources.py (base mesh, targets, skeleton, eye proxy)
<mh_assets_dir> extracted folders from makehuman_system_assets_cc0.zip (skins, hair, eyebrows, eyelashes, eyes/materials)
<out_dir>       public/avatar

Writes avatar.bin (all binary arrays, little endian) + avatar.json (manifest) + textures.
All lengths converted from MakeHuman decimetres to metres.
"""
import json, os, struct, sys, glob
from collections import defaultdict
from PIL import Image

S = 0.1  # dm -> m
src, assets, out = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(os.path.join(out, "tex"), exist_ok=True)

blob = bytearray()
manifest = {"buffers": {}}

def put(name, fmt, values):
    """Append typed array; fmt in f(float32) I(uint32) H(uint16)."""
    global blob
    while len(blob) % 4:
        blob.append(0)
    off = len(blob)
    blob += struct.pack("<%d%s" % (len(values), fmt), *values)
    manifest["buffers"][name] = {"offset": off, "count": len(values), "type": {"f": "f32", "I": "u32", "H": "u16"}[fmt]}

def read_obj(path):
    v, vt, faces = [], [], []
    group = None
    for line in open(path, encoding="utf-8", errors="ignore"):
        p = line.split()
        if not p:
            continue
        if p[0] == "v":
            v.append(tuple(float(x) for x in p[1:4]))
        elif p[0] == "vt":
            vt.append((float(p[1]), float(p[2])))
        elif p[0] == "g":
            group = p[1] if len(p) > 1 else None
        elif p[0] == "f":
            corners = []
            for c in p[1:]:
                parts = c.split("/")
                corners.append((int(parts[0]) - 1, int(parts[1]) - 1 if len(parts) > 1 and parts[1] else -1))
            faces.append((group, corners))
    return v, vt, faces

def split_mesh(faces, vt, keep=lambda g: True):
    """Unique (v, vt) pairs -> render vertices; triangulate quads."""
    key_to_idx, split_v, uvs, idx = {}, [], [], []
    for g, corners in faces:
        if not keep(g):
            continue
        ids = []
        for vi, ti in corners:
            k = (vi, ti)
            if k not in key_to_idx:
                key_to_idx[k] = len(split_v)
                split_v.append(vi)
                u = vt[ti] if ti >= 0 else (0.0, 0.0)
                uvs += [u[0], u[1]]
            ids.append(key_to_idx[k])
        for i in range(1, len(ids) - 1):
            idx += [ids[0], ids[i], ids[i + 1]]
    return split_v, uvs, idx

# ── base mesh ────────────────────────────────────────────
bv, bvt, bfaces = read_obj(os.path.join(src, "3dobjs/base.obj"))
put("basePos", "f", [c * S for p in bv for c in p])
body_split, body_uv, body_idx = split_mesh(bfaces, bvt, lambda g: g == "body")
put("bodySplit", "I", body_split)
put("bodyUv", "f", body_uv)
put("bodyIndex", "I", body_idx)
manifest["vertexCount"] = len(bv)
# vertices belonging to helper groups (used to place proxies, never rendered)
print("base", len(bv), "body render verts", len(body_split), "tris", len(body_idx) // 3)

# ── targets ────────────────────────────────────────────
manifest["targets"] = {}
for path in sorted(glob.glob(os.path.join(src, "targets", "**", "*.target"), recursive=True)):
    name = os.path.splitext(os.path.relpath(path, os.path.join(src, "targets")))[0].replace("\\", "/")
    idx, d = [], []
    for line in open(path):
        p = line.split()
        if len(p) == 4 and not line.startswith("#"):
            idx.append(int(p[0]))
            d += [float(p[1]) * S, float(p[2]) * S, float(p[3]) * S]
    put("t:" + name + ":i", "I", idx)
    put("t:" + name + ":d", "f", d)
    manifest["targets"][name] = len(idx)
print("targets", len(manifest["targets"]))

# ── skeleton ────────────────────────────────────────────
skel = json.load(open(os.path.join(src, "rigs/default.mhskel")))
weights = json.load(open(os.path.join(src, "rigs/default_weights.mhw")))["weights"]
bone_names = list(skel["bones"].keys())
# topological order (parents first)
ordered, seen = [], set()
def visit(n):
    if n in seen: return
    par = skel["bones"][n]["parent"]
    if par: visit(par)
    seen.add(n); ordered.append(n)
for n in bone_names: visit(n)
manifest["bones"] = [{"name": n, "parent": skel["bones"][n]["parent"], "head": skel["bones"][n]["head"], "tail": skel["bones"][n]["tail"]} for n in ordered]
manifest["joints"] = skel["joints"]
bone_index = {n: i for i, n in enumerate(ordered)}
per_vert = defaultdict(list)
for b, lst in weights.items():
    if b not in bone_index: continue
    for vi, w in lst:
        per_vert[vi].append((w, bone_index[b]))
sk_i, sk_w = [], []
for vi in range(len(bv)):
    top = sorted(per_vert.get(vi, []), reverse=True)[:4]
    tot = sum(w for w, _ in top) or 1
    top += [(0.0, 0)] * (4 - len(top))
    sk_i += [b for _, b in top]
    sk_w += [w / tot for w, _ in top]
put("skinIndex", "H", sk_i)
put("skinWeight", "f", sk_w)

# ── proxies (eyes, brows, lashes, hair) ────────────────────────────────────────────
def build_proxy(key, mhclo_path):
    folder = os.path.dirname(mhclo_path)
    obj_file, refs, scales, material = None, [], {}, None
    in_verts = False
    for line in open(mhclo_path, encoding="utf-8", errors="ignore"):
        p = line.split()
        if not p or p[0].startswith("#"):
            continue
        if in_verts:
            if len(p) in (1, 9) and p[0].lstrip("-").isdigit():
                if len(p) == 1:
                    refs.append(((int(p[0]), int(p[0]), int(p[0])), (1.0, 0.0, 0.0), (0.0, 0.0, 0.0)))
                else:
                    refs.append(((int(p[0]), int(p[1]), int(p[2])), tuple(map(float, p[3:6])), tuple(map(float, p[6:9]))))
                continue
            in_verts = not refs
        if p[0] == "obj_file": obj_file = p[1]
        elif p[0] in ("x_scale", "y_scale", "z_scale"): scales[p[0][0]] = [int(p[1]), int(p[2]), float(p[3]) * S]
        elif p[0] == "verts": in_verts = True
        elif p[0] == "material": material = p[1]
    v, vt, faces = read_obj(os.path.join(folder, obj_file))
    assert len(v) == len(refs), (key, len(v), len(refs))
    split, uv, idx = split_mesh(faces, vt)
    put(f"p:{key}:refs", "I", [r for ref in refs for r in ref[0]])
    put(f"p:{key}:w", "f", [w for ref in refs for w in ref[1]])
    put(f"p:{key}:off", "f", [o * S for ref in refs for o in ref[2]])
    put(f"p:{key}:split", "I", split)
    put(f"p:{key}:uv", "f", uv)
    put(f"p:{key}:index", "I", idx)
    tex = None
    if material and os.path.exists(os.path.join(folder, material)):
        for line in open(os.path.join(folder, material), encoding="utf-8", errors="ignore"):
            if line.startswith("diffuseTexture"):
                tex = os.path.join(folder, line.split(None, 1)[1].strip())
    manifest.setdefault("proxies", {})[key] = {"scales": scales, "verts": len(v)}
    return tex

def save_tex(path, name, size, alpha=False, gray=False):
    im = Image.open(path)
    im = im.convert("RGBA" if alpha else "RGB")
    if gray:
        # neutral, bright luminance so hair can be tinted to any colour in the shader
        r, g, b, a = im.split()
        lum = Image.merge("RGB", (r, g, b)).convert("L")
        lo, hi = lum.getextrema()
        lum = lum.point(lambda x: int(40 + (x - lo) * 215 / max(1, hi - lo)))
        im = Image.merge("RGBA", (lum, lum, lum, a))
    im = im.resize((size, size), Image.LANCZOS)
    dst = os.path.join(out, "tex", name + (".webp" if alpha else ".jpg"))
    if alpha:
        im.save(dst, "WEBP", quality=88)
    else:
        im.save(dst, "JPEG", quality=86, optimize=True)
    return "tex/" + os.path.basename(dst)

manifest["textures"] = {}
build_proxy("eyes", os.path.join(src, "eyes/high-poly/high-poly.mhclo"))
for eye in glob.glob(os.path.join(assets, "eyes/materials/*_eye.png")):
    n = os.path.basename(eye).replace("_eye.png", "")
    manifest["textures"]["eye:" + n] = save_tex(eye, "eye_" + n, 512, alpha=True)  # alpha cuts out the cornea shell
for folder in sorted(glob.glob(os.path.join(assets, "eyebrows/*/"))):
    n = os.path.basename(folder.rstrip("/\\"))
    tex = build_proxy(n, os.path.join(folder, n + ".mhclo"))
    manifest["textures"][n] = save_tex(tex, n, 512, alpha=True, gray=True)
for folder in sorted(glob.glob(os.path.join(assets, "eyelashes/*/"))):
    n = os.path.basename(folder.rstrip("/\\"))
    tex = build_proxy(n, os.path.join(folder, n + ".mhclo"))
    manifest["textures"][n] = save_tex(tex, n, 512, alpha=True)
for folder in sorted(glob.glob(os.path.join(assets, "hair/*/"))):
    n = os.path.basename(folder.rstrip("/\\"))
    tex = build_proxy(n, os.path.join(folder, n + ".mhclo"))
    manifest["textures"][n] = save_tex(tex, n, 1024, alpha=True, gray=True)
for folder in sorted(glob.glob(os.path.join(assets, "skins/*/"))):
    n = os.path.basename(folder.rstrip("/\\"))
    png = [f for f in glob.glob(os.path.join(folder, "*.png"))][0]
    manifest["textures"]["skin:" + n] = save_tex(png, "skin_" + n, 2048)

open(os.path.join(out, "avatar.bin"), "wb").write(bytes(blob))
json.dump(manifest, open(os.path.join(out, "avatar.json"), "w"), separators=(",", ":"))
print("wrote", len(blob) // 1024, "KB;", "proxies", list(manifest["proxies"].keys()))
