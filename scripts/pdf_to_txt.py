"""Convert a PDF book to a plain UTF-8 .txt file ready for upload to the classifier.

Usage:
    python scripts/pdf_to_txt.py book.pdf
    python scripts/pdf_to_txt.py book.pdf --output my_book.txt

Output defaults to the same directory as the PDF, with .txt extension.
"""
import argparse
import re
import sys
from pathlib import Path

from pdfminer.high_level import extract_pages
from pdfminer.layout import LTTextContainer, LTChar


def extract_text_from_pdf(pdf_path: Path) -> str:
    """Extract raw text from all pages of a PDF."""
    pages = []
    for page_layout in extract_pages(str(pdf_path)):
        page_text = []
        for element in page_layout:
            if isinstance(element, LTTextContainer):
                page_text.append(element.get_text())
        pages.append(''.join(page_text))
    return '\n'.join(pages)


def clean_text(raw: str) -> str:
    """Clean common PDF extraction artifacts from book text.

    Handles:
    - Hyphenated line-breaks (re-\njoined -> rejoined)
    - Isolated page numbers (lines containing only a number)
    - Excessive blank lines (collapsed to double newline)
    - Non-printable / control characters
    - Ligatures and common Unicode substitutions
    """
    # Replace common ligatures with ASCII equivalents
    ligatures = {
        '\ufb01': 'fi', '\ufb02': 'fl', '\ufb00': 'ff',
        '\ufb03': 'ffi', '\ufb04': 'ffl', '\u2019': "'",
        '\u2018': "'", '\u201c': '"', '\u201d': '"',
        '\u2013': '-', '\u2014': '--', '\u00a0': ' ',
    }
    for src, dst in ligatures.items():
        raw = raw.replace(src, dst)

    # Rejoin hyphenated line-breaks: "some-\nword" -> "someword"
    raw = re.sub(r'(\w)-\n(\w)', r'\1\2', raw)

    # Remove lines that are purely a page number (digits only, optional spaces)
    raw = re.sub(r'^\s*\d+\s*$', '', raw, flags=re.MULTILINE)

    # Collapse runs of 3+ blank lines to a single blank line
    raw = re.sub(r'\n{3,}', '\n\n', raw)

    # Strip non-printable control characters (keep \n \t)
    raw = re.sub(r'[^\x09\x0a\x20-\x7e\x80-\xff]', '', raw)

    return raw.strip()


def word_count(text: str) -> int:
    return len(re.findall(r'[a-zA-Z]+', text))


def convert(pdf_path: Path, output_path: Path) -> None:
    print(f'Reading:  {pdf_path}')
    raw = extract_text_from_pdf(pdf_path)
    cleaned = clean_text(raw)
    wc = word_count(cleaned)

    output_path.write_text(cleaned, encoding='utf-8')
    print(f'Written:  {output_path}')
    print(f'Words:    {wc:,}')
    if wc < 500:
        print(f'WARNING: Only {wc} words — classifier requires minimum 500.')
    else:
        print(f'Ready for upload to POST /classify')


def main():
    parser = argparse.ArgumentParser(description='Convert a PDF book to .txt for genre classification')
    parser.add_argument('pdf', type=Path, help='Input PDF file')
    parser.add_argument('--output', '-o', type=Path, default=None,
                        help='Output .txt path (default: same name as PDF with .txt extension)')
    args = parser.parse_args()

    pdf_path = args.pdf.resolve()
    if not pdf_path.exists():
        print(f'Error: File not found: {pdf_path}', file=sys.stderr)
        sys.exit(1)
    if pdf_path.suffix.lower() != '.pdf':
        print(f'Error: Expected a .pdf file, got: {pdf_path.suffix}', file=sys.stderr)
        sys.exit(1)

    output_path = args.output.resolve() if args.output else pdf_path.with_suffix('.txt')
    convert(pdf_path, output_path)


if __name__ == '__main__':
    main()
