"""HTML sanitization utility for rich-text lesson content and descriptions.

Protects against Cross-Site Scripting (XSS) attacks by whitelisting safe HTML tags,
attributes, and URL protocols while stripping dangerous elements (scripts, iframes,
event handlers, javascript: URIs).
"""

from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

SAFE_TAGS = {
    "a",
    "b",
    "blockquote",
    "br",
    "code",
    "div",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "i",
    "img",
    "li",
    "ol",
    "p",
    "pre",
    "s",
    "span",
    "strike",
    "strong",
    "sub",
    "sup",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "u",
    "ul",
}

SAFE_ATTRS = {
    "a": {"href", "title", "target"},
    "img": {"src", "alt", "title", "width", "height"},
    "*": {"class"},
}

SAFE_SCHEMES = {"http", "https", "mailto"}


def _is_safe_url(url: str) -> bool:
    """Validate that a URL does not use javascript:, data:, or unsafe schemes."""
    if not url or not isinstance(url, str):
        return False
    stripped = url.strip()
    if not stripped:
        return False
    # Allow relative URLs
    if stripped.startswith("/") and not stripped.startswith("//"):
        return True
    try:
        parsed = urlparse(stripped)
        return parsed.scheme.lower() in SAFE_SCHEMES
    except Exception:
        return False


class SafeHTMLSanitizer(HTMLParser):
    """Deterministic HTML parser that reconstructs a sanitized HTML string."""

    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.result: list[str] = []
        self._skip_tag_content: int = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag_lower = tag.lower()
        if tag_lower in {"script", "style", "iframe", "object", "embed", "applet"}:
            self._skip_tag_content += 1
            return

        if self._skip_tag_content > 0:
            return

        if tag_lower not in SAFE_TAGS:
            return

        cleaned_attrs: list[str] = []
        has_href = False

        allowed_for_tag = SAFE_ATTRS.get(tag_lower, set()) | SAFE_ATTRS["*"]

        for attr, val in attrs:
            attr_lower = attr.lower()
            if attr_lower.startswith("on"):
                # Strip event handlers (onload, onerror, onclick, etc.)
                continue
            if attr_lower not in allowed_for_tag:
                continue

            val_str = val or ""

            # Check URLs in href and src
            if attr_lower in {"href", "src"}:
                if not _is_safe_url(val_str):
                    continue
                if attr_lower == "href":
                    has_href = True

            cleaned_attrs.append(f'{attr_lower}="{escape(val_str, quote=True)}"')

        if tag_lower == "a" and has_href:
            cleaned_attrs.append('rel="noopener noreferrer"')

        attrs_str = (" " + " ".join(cleaned_attrs)) if cleaned_attrs else ""
        if tag_lower in {"br", "hr", "img"}:
            self.result.append(f"<{tag_lower}{attrs_str} />")
        else:
            self.result.append(f"<{tag_lower}{attrs_str}>")

    def handle_endtag(self, tag: str) -> None:
        tag_lower = tag.lower()
        if tag_lower in {"script", "style", "iframe", "object", "embed", "applet"}:
            if self._skip_tag_content > 0:
                self._skip_tag_content -= 1
            return

        if self._skip_tag_content > 0:
            return

        if tag_lower in SAFE_TAGS and tag_lower not in {"br", "hr", "img"}:
            self.result.append(f"</{tag_lower}>")

    def handle_data(self, data: str) -> None:
        if self._skip_tag_content > 0:
            return
        self.result.append(escape(data, quote=False))

    def handle_entityref(self, name: str) -> None:
        if self._skip_tag_content > 0:
            return
        self.result.append(f"&{name};")

    def handle_charref(self, name: str) -> None:
        if self._skip_tag_content > 0:
            return
        self.result.append(f"&#{name};")


def sanitize_html(raw_html: str | None) -> str | None:
    """Sanitize raw HTML or rich-text markdown input.

    Returns clean HTML string or None if input was None.
    """
    if raw_html is None:
        return None
    if not raw_html.strip():
        return ""

    parser = SafeHTMLSanitizer()
    parser.feed(raw_html)
    parser.close()
    return "".join(parser.result)
