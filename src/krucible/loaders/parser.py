"""Raw YAML parser utility."""
import yaml
from pathlib import Path
from krucible.loaders.exceptions import FileParseError

class YamlParser:
    """Safely extracts raw dictionaries from YAML files."""
    
    @staticmethod
    def parse(file_path: Path) -> dict:
        try:
            with file_path.open("r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
            if not isinstance(data, dict):
                raise FileParseError(f"File {file_path.name} must contain a YAML dictionary at the root.")
            return data
        except yaml.YAMLError as e:
            raise FileParseError(f"Invalid YAML syntax in {file_path.name}: {str(e)}")
        except OSError as e:
            raise FileParseError(f"Failed to read file {file_path.name}: {str(e)}")
