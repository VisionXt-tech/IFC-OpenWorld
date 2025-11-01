"""
Basic tests for ifc-processor
TODO: Expand these tests once the codebase stabilizes
"""
import os


def test_app_structure():
    """Test that app directory structure exists"""
    assert os.path.exists("app")
    assert os.path.exists("app/services")
    assert os.path.exists("app/workers")


def test_placeholder():
    """Placeholder test to ensure pytest runs successfully"""
    assert True


def test_python_version():
    """Test Python version is compatible"""
    import sys
    assert sys.version_info >= (3, 11)