"""Shared test setup for direct-mode contract tests.

Windows shim: the direct-mode loader maps a temp file onto stdin (fd 0) and then
immediately unlinks it. On Windows you cannot delete a file that is still open,
so the unlink raises ``PermissionError``. We tolerate that one case here — the
temp file is reclaimed by the OS — so the same tests run on Windows and Linux.
"""

import os
import sys
import tempfile

if sys.platform.startswith("win"):
    _real_unlink = os.unlink
    _tmp_root = os.path.realpath(tempfile.gettempdir())

    def _tolerant_unlink(path, *args, **kwargs):
        try:
            return _real_unlink(path, *args, **kwargs)
        except PermissionError:
            # Only swallow it for files under the system temp directory.
            try:
                if os.path.realpath(os.path.dirname(str(path))).startswith(_tmp_root):
                    return None
            except Exception:
                pass
            raise

    os.unlink = _tolerant_unlink
