"""Isolated printable carrier markup: no scripts, remote resources or event handlers."""

import re
from html import escape
from html.parser import HTMLParser


class Label(HTMLParser):
    tags = {
        "div",
        "span",
        "p",
        "br",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
        "strong",
        "b",
        "small",
        "h1",
        "h2",
        "h3",
        "img",
    }

    def __init__(self):
        super().__init__()
        self.parts = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "iframe", "object"}:
            self.skip += 1
        if self.skip or tag not in self.tags:
            return
        allowed = []
        for key, value in attrs:
            if value is None:
                continue
            if (
                tag == "img"
                and key == "src"
                and re.fullmatch(r"data:image/(?:png|jpeg);base64,[A-Za-z0-9+/=]+", value)
            ):
                allowed.append((key, value))
            elif key in {"colspan", "rowspan", "width", "height"} and re.fullmatch(
                r"[1-9][0-9]{0,3}", value
            ):
                allowed.append((key, value))
            elif key == "dir" and value in {"rtl", "ltr", "auto"}:
                allowed.append((key, value))
        if tag == "img" and not any(k == "src" for k, _ in allowed):
            return
        self.parts.append(
            "<"
            + tag
            + "".join(" " + k + '="' + escape(v, quote=True) + '"' for k, v in allowed)
            + ">"
        )

    def handle_endtag(self, tag):
        if tag in {"script", "style", "iframe", "object"}:
            self.skip = max(0, self.skip - 1)
            return
        if not self.skip and tag in self.tags and tag not in {"img", "br"}:
            self.parts.append("</" + tag + ">")

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(escape(data))


def printable(markup):
    parser = Label()
    parser.feed(markup)
    parser.close()
    return (
        '<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>Tapin shipping label</title><style>@page{margin:10mm}body{font:14px/1.7 sans-serif;color:#111}table{border-collapse:collapse;width:100%}td,th{border:1px solid #aaa;padding:5px}img{max-width:100%;height:auto}tr{break-inside:avoid}</style><body>'
        + "".join(parser.parts)
        + "</body></html>"
    )
