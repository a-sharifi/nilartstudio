"""Bounded, dependency-free table exports. XLSX cells are text to preserve exact decimals."""

import csv
import io
import re
from xml.etree.ElementTree import Element, SubElement, tostring
from zipfile import ZIP_DEFLATED, ZipFile

from fastapi.responses import Response


def safe_csv(value):
    value = str(value if value is not None else "")
    return "'" + value if value.lstrip().startswith(("=", "+", "-", "@")) else value


def table_response(columns, rows, filename, format="csv", numeric_columns=()):
    if format == "csv":
        stream = io.StringIO()
        writer = csv.writer(stream)
        writer.writerow(columns)
        for row in rows:
            writer.writerow(
                [
                    str(v) if i in numeric_columns and v is not None else safe_csv(v)
                    for i, v in enumerate(row)
                ]
            )
        data = ("\ufeff" + stream.getvalue()).encode("utf-8")
        media = "text/csv; charset=utf-8"
    else:
        # inlineStr never creates a formula, and avoids Excel's 15-digit numeric truncation.
        ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
        root = Element("worksheet", xmlns=ns)
        sheet = SubElement(root, "sheetData")
        for index, values in enumerate([columns, *rows], 1):
            row = SubElement(sheet, "row", r=str(index))
            for value in values:
                cell = SubElement(row, "c", t="inlineStr")
                text = SubElement(SubElement(cell, "is"), "t", {"xml:space": "preserve"})
                text.text = re.sub(
                    r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", str(value if value is not None else "")
                )
        stream = io.BytesIO()
        with ZipFile(stream, "w", ZIP_DEFLATED) as archive:
            archive.writestr(
                "[Content_Types].xml",
                '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
            )
            archive.writestr(
                "_rels/.rels",
                '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
            )
            archive.writestr(
                "xl/workbook.xml",
                '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Recorded data" sheetId="1" r:id="rId1"/></sheets></workbook>',
            )
            archive.writestr(
                "xl/_rels/workbook.xml.rels",
                '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
            )
            archive.writestr(
                "xl/worksheets/sheet1.xml", tostring(root, encoding="utf-8", xml_declaration=True)
            )
        data = stream.getvalue()
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    return Response(
        data,
        media_type=media,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}.{format}"',
            "Cache-Control": "no-store",
        },
    )
