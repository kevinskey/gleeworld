import requests


def _headers(settings):
    return {"Authorization": f"Bearer {settings.service_key}", "apikey": settings.service_key}


def download(settings, bucket, path, dest):
    url = f"{settings.supabase_url}/storage/v1/object/{bucket}/{path}"
    r = requests.get(url, headers=_headers(settings), timeout=60)
    r.raise_for_status()
    dest.write_bytes(r.content)
    return dest


def upload(settings, bucket, path, local, content_type):
    url = f"{settings.supabase_url}/storage/v1/object/{bucket}/{path}"
    with open(local, "rb") as fh:
        r = requests.post(url, headers={**_headers(settings),
                                        "Content-Type": content_type,
                                        "x-upsert": "true"},
                          data=fh, timeout=300)
    r.raise_for_status()
