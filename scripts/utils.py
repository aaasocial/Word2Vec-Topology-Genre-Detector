import yaml
from pathlib import Path


def load_params(overrides=None):
    """Load config/params.yaml and merge CLI overrides.

    Args:
        overrides: Optional dict with dot-notation keys mapping to values.
                   e.g., {'homology.max_words': 400}

    Returns:
        Nested dict of parameters.
    """
    params_path = Path(__file__).parent.parent / 'config' / 'params.yaml'
    with open(params_path) as f:
        params = yaml.safe_load(f)
    if overrides:
        # Deep merge: overrides is a flat dict with dot-notation keys
        # e.g., {'homology.max_words': 400}
        for key, value in overrides.items():
            parts = key.split('.')
            d = params
            for part in parts[:-1]:
                d = d[part]
            d[parts[-1]] = value
    return params
