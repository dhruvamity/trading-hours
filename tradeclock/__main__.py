"""Entrypoint when running `python -m tradeclock` directly."""
import sys
from pathlib import Path

# Add src to sys.path
src_dir = Path(__file__).resolve().parent / "src"
if str(src_dir) not in sys.path:
    sys.path.insert(0, str(src_dir))

from tradeclock.terminal.app import main

if __name__ == "__main__":
    main()
