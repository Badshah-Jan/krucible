def test_cli_import():
    """Ensure the CLI app can be imported."""
    from krucible.cli.main import app
    assert app is not None
