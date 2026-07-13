"""Tests for the YAML Loaders."""
import pytest
from pathlib import Path

from krucible.loaders.attack_loader import AttackLoader
from krucible.loaders.policy_loader import PolicyLoader
from krucible.loaders.parser import YamlParser
from krucible.loaders.exceptions import FileParseError

def test_yaml_parser_invalid_syntax(tmp_path):
    f = tmp_path / "bad.yml"
    f.write_text("id: [this is malformed:\n  -", encoding="utf-8")
    with pytest.raises(FileParseError):
        YamlParser.parse(f)

def test_yaml_parser_not_dict(tmp_path):
    f = tmp_path / "list.yml"
    f.write_text("- item1\n- item2", encoding="utf-8")
    with pytest.raises(FileParseError):
        YamlParser.parse(f)

def test_attack_loader_success(tmp_path):
    d = tmp_path / "attacks"
    d.mkdir()
    (d / "a1.yml").write_text("id: atk-1\nname: Test\ndescription: D\ntype: injection\npayload: P\ntags: []", encoding="utf-8")
    
    loader = AttackLoader(d)
    attacks = loader.load_all()
    assert len(attacks) == 1
    assert attacks[0].id == "atk-1"

def test_attack_loader_skips_invalid_gracefully(tmp_path):
    d = tmp_path / "attacks"
    d.mkdir()
    # Missing required fields -> SchemaValidationError
    (d / "a1.yml").write_text("id: atk-1\nname: Test", encoding="utf-8")
    # Duplicate ID
    (d / "a2.yml").write_text("id: atk-2\nname: T\ndescription: D\ntype: injection\npayload: P\ntags: []", encoding="utf-8")
    (d / "a3.yml").write_text("id: atk-2\nname: T\ndescription: D\ntype: injection\npayload: P\ntags: []", encoding="utf-8")
    
    loader = AttackLoader(d)
    attacks = loader.load_all()
    # Should yield only the first valid atk-2 (a2.yml) because a3.yml is a duplicate and a1.yml is schema-invalid
    assert len(attacks) == 1
    assert attacks[0].id == "atk-2"

def test_policy_loader_success(tmp_path):
    d = tmp_path / "policies"
    d.mkdir()
    (d / "p1.yml").write_text("id: pol-1\nname: N\ntype: keyword\nrules:\n  deny: ['test']", encoding="utf-8")
    
    loader = PolicyLoader(d)
    policies = loader.load_all()
    assert len(policies) == 1

def test_empty_directory_returns_empty_list(tmp_path):
    # Directory doesn't exist
    loader = AttackLoader(tmp_path / "does_not_exist")
    assert loader.load_all() == []
