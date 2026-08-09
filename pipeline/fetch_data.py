import requests
import json
import os
import time

OSDR_BASE = "https://visualization.osdr.nasa.gov/biodata/api/v2"


def fetch_dataset(osd_id: str) -> dict:
    url = f"{OSDR_BASE}/dataset/{osd_id}/"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    raw = resp.json()
    return raw.get(osd_id, raw)


def extract_text(data: dict) -> str:
    meta = data.get("metadata", data)
    parts = []

    field_map = {
        "title": ["study title", "project title"],
        "description": ["study description"],
        "organism": ["organism"],
        "material_type": ["material type"],
        "assay_type": ["study assay technology type"],
        "mission": ["mission", "flight program"],
        "factor_name": ["study factor name"],
        "factor_value": ["factor value"],
    }

    for label, keys in field_map.items():
        for key in keys:
            val = meta.get(key)
            if val:
                if isinstance(val, list):
                    val = "; ".join(str(v) for v in val)
                parts.append(f"{label}: {val}")

    chars = meta.get("characteristics", [])
    if isinstance(chars, list):
        for c in chars[:10]:
            if isinstance(c, dict):
                parts.append(f"characteristic: {c.get('category', '')} = {c.get('text', '')}")
            elif isinstance(c, str):
                parts.append(f"characteristic: {c}")

    factors = meta.get("factor value", [])
    if isinstance(factors, list):
        for f in factors[:10]:
            if isinstance(f, dict):
                parts.append(f"factor_value: {f.get('category', '')} = {f.get('text', '')}")

    return "\n".join(parts)


def get_all_dataset_ids() -> list[str]:
    """Get list of all available OSDR dataset IDs."""
    url = f"{OSDR_BASE}/datasets/?format=json"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    return sorted(data.keys(), key=lambda x: int(x.split("-")[1]))


def fetch_all(save_dir: str = "data", limit: int = 100) -> list[dict]:
    os.makedirs(save_dir, exist_ok=True)
    docs = []

    all_ids = get_all_dataset_ids()
    print(f"Found {len(all_ids)} total datasets, fetching {limit}...")

    for i, osd_id in enumerate(all_ids[:limit]):
        print(f"[{i+1}/{limit}] Fetching {osd_id}...", end=" ")
        try:
            data = fetch_dataset(osd_id)
            text = extract_text(data)
            if len(text) > 50:  # skip empty datasets
                docs.append({
                    "osd_id": osd_id,
                    "text": text,
                    "metadata": {
                        "source": "OSDR",
                        "osd_id": osd_id,
                        "url": f"https://genelab.nasa.gov/data/search?q={osd_id}"
                    }
                })
                print(f"OK - {len(text)} chars")
            else:
                print("SKIP - too short")
        except Exception as e:
            print(f"FAIL - {e}")
        time.sleep(0.2)  # rate limit

    out_path = os.path.join(save_dir, "osdr_documents.json")
    with open(out_path, "w") as f:
        json.dump(docs, f, indent=2)
    print(f"\nSaved {len(docs)} documents to {out_path}")
    return docs


if __name__ == "__main__":
    import sys
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 631
    fetch_all(limit=limit)
