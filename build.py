#!/usr/bin/env python3
"""Inline web/ + data/carpools.json into one offline file: dist/carpool-coord.html."""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def rd(rel):
    with open(os.path.join(HERE, rel), encoding="utf-8") as f:
        return f.read()


def main():
    data_path = os.path.join(HERE, "data", "carpools.json")
    with open(data_path, encoding="utf-8") as f:
        data = json.load(f)
    data_js = json.dumps(data, ensure_ascii=False)
    n_kids = len(data.get("kids", []))
    n_standing = len(data.get("standing", []))
    html = rd("web/index.html")
    html = html.replace("/*__CSS__*/", rd("web/app.css"))
    html = html.replace("/*__CARPOOLS__*/ null /*__/CARPOOLS__*/", data_js)
    app = rd("web/app.js").replace("</script", "<\\/script")
    html = html.replace("/*__APP__*/", app)
    os.makedirs(os.path.join(HERE, "dist"), exist_ok=True)
    out = os.path.join(HERE, "dist", "carpool-coord.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print(
        f"built {out} ({os.path.getsize(out):,} bytes) · "
        f"kids={n_kids} standing={n_standing}"
    )


if __name__ == "__main__":
    main()
