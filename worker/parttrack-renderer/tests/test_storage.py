from unittest.mock import MagicMock, patch

import storage
from config import Settings

S = Settings(database_url="x", supabase_url="https://supabase.example.org",
             service_key="sk", soundfont_path="/sf.sf2", poll_interval_s=5)


def test_upload_posts_to_object_endpoint(tmp_path):
    f = tmp_path / "a.mp3"
    f.write_bytes(b"abc")
    with patch("storage.requests.post") as post:
        post.return_value = MagicMock(status_code=200)
        storage.upload(S, "parttrack", "t/s/stems/a.mp3", f, "audio/mpeg")
        url = post.call_args.args[0]
        assert url == "https://supabase.example.org/storage/v1/object/parttrack/t/s/stems/a.mp3"
        assert post.call_args.kwargs["headers"]["Authorization"] == "Bearer sk"
