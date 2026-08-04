# Make the worker modules importable from tests/ without packaging.
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
