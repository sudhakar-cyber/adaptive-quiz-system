"""
Tests for ML Adaptive Recommendations
"""
from test_ml_adaptive import run_tests

if __name__ == "__main__":
    success = run_tests()
    import sys
    sys.exit(0 if success else 1)
