"""Upload text validation and tokenization.

Validates: extension (.txt), size (<=5MB), encoding (UTF-8),
language (English), word count (>=500 after stopword removal).
Returns cleaned text and token list on success.
Raises ValueError with specific actionable message on failure.
"""
import re
import chardet
from langdetect import detect, LangDetectException

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
MIN_WORD_COUNT = 500

# Load stopwords once at module level
from nltk.corpus import stopwords
_STOP_WORDS = set(stopwords.words('english'))


def validate_and_tokenize(content: bytes, filename: str) -> tuple[str, list[str]]:
    """Validate uploaded file content and tokenize.

    Args:
        content: Raw file bytes
        filename: Original filename (for extension check)

    Returns:
        (text, tokens) tuple on success

    Raises:
        ValueError: With specific actionable error message on any validation failure
    """
    # 1. Extension check
    if not filename or not filename.lower().endswith('.txt'):
        raise ValueError('Only .txt files are accepted')

    # 2. Size check
    if len(content) > MAX_FILE_SIZE:
        size_mb = len(content) / (1024 * 1024)
        raise ValueError(f'File exceeds 5MB limit ({size_mb:.1f}MB)')

    # 3. Encoding detection
    detected = chardet.detect(content)
    enc = detected.get('encoding')
    if enc is None or enc.lower() not in ('utf-8', 'ascii', 'utf-8-sig'):
        raise ValueError(
            'File encoding not detected as UTF-8. '
            'Save the file as UTF-8 and retry.'
        )

    try:
        text = content.decode('utf-8', errors='strict')
    except UnicodeDecodeError:
        raise ValueError(
            'File encoding not detected as UTF-8. '
            'Save the file as UTF-8 and retry.'
        )

    # 4. Language detection (first 5000 chars for speed)
    try:
        lang = detect(text[:5000])
        if lang != 'en':
            raise ValueError(
                'Non-English text detected. '
                'The model is trained on English-language books only.'
            )
    except LangDetectException:
        pass  # Very short or ambiguous -- skip language check

    # 5. Tokenize and count words
    tokens = re.findall(r'[a-z]+', text.lower())
    tokens = [t for t in tokens if t not in _STOP_WORDS and len(t) > 1]

    if len(tokens) < MIN_WORD_COUNT:
        raise ValueError(
            f'Book has only {len(tokens)} words after processing '
            f'-- minimum {MIN_WORD_COUNT} required'
        )

    return text, tokens
