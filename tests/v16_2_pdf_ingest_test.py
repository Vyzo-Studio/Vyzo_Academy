"""V16.2 — testes locais do parser: PDFs sintéticos, sem rede, sem exames externos."""
import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from ingest_exam_pdf import InvalidDocument, ingest, institutional_source


class NoticeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "edital-exemplo.pdf"
        pdf = canvas.Canvas(str(self.path))
        pdf.drawString(70, 700, "EDITAL FICTICIO DE TESTE VYZO 2026 - MATEMATICA")
        pdf.showPage()
        pdf.drawString(70, 700, "CONTEUDO DE TESTE - NAO E PUBLICACAO OFICIAL")
        pdf.save()

    def test_extract_with_explicit_unverified_provenance(self):
        result = ingest(self.path, "https://www.gov.br/inep/edital-exemplo.pdf")
        self.assertEqual(result["total_paginas"], 2)
        self.assertEqual(result["situacao"], "extraido_sem_revisao")
        self.assertFalse(result["origem_confirmada"])
        self.assertFalse(result["conteudo_oficial_homologado"])
        self.assertEqual(result["hash_sha256"], hashlib.sha256(self.path.read_bytes()).hexdigest())
        self.assertIn("EDITAL FICTICIO", result["paginas"][0]["texto"])
        self.assertEqual(result["paginas_sem_texto"], 0)
        self.assertFalse(result["texto_truncado"])

    def test_no_auto_verification_on_institutional_looking_url(self):
        for url in (
            "http://www.gov.br/inep",
            "https://www.gov.br.evil.invalid/edital",
            "https://user:password@gov.br/edital",
            "https://gov.br:9999/edital",
            "https://gov.br:porta-invalida/edital",
            "https://gov.br/%2e%2e/edital",
            "https://gov.br/um/../edital",
            "https://gov.br/%2f/edital",
            "javascript:alert(1)",
            "https://example.invalid/pdf",
        ):
            with self.subTest(url=url), self.assertRaises(InvalidDocument):
                institutional_source(url)

    def test_blank_and_corrupted_pdf_fail_closed(self):
        blank = Path(self.temp.name) / "scan.pdf"
        pdf = canvas.Canvas(str(blank))
        pdf.showPage()
        pdf.save()
        self.assertEqual(ingest(blank, "https://www.gov.br/inep")["paginas_sem_texto"], 1)
        self.path.write_bytes(b"NOT_PDF_" * 12)
        with self.assertRaises(InvalidDocument):
            ingest(self.path, "https://www.gov.br/inep")

    def test_does_not_overwrite_existing_output(self):
        out = Path(self.temp.name) / "saida.json"
        args = [sys.executable, str(ROOT / "scripts/ingest_exam_pdf.py"),
                str(self.path), "--origem", "https://www.gov.br/inep", "--saida", str(out)]
        first = subprocess.run(args, capture_output=True, text=True, check=False)
        self.assertEqual(first.returncode, 0, first.stderr)
        content = json.loads(out.read_text(encoding="utf-8"))
        self.assertEqual(content["total_paginas"], 2)
        second = subprocess.run(args, capture_output=True, text=True, check=False)
        self.assertEqual(second.returncode, 2)
        self.assertIn("não sobrescrever", second.stderr)
        self.assertEqual(json.loads(out.read_text(encoding="utf-8")), content)


if __name__ == "__main__":
    unittest.main()
