#!/usr/bin/env python3
"""Extrator local de texto para editais: não baixa PDFs, não usa IA, não verifica publicação."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

from pypdf import PdfReader

MAX_BYTES = 12 * 1024 * 1024
MAX_PAGES = 100
MAX_PAGE_CHARS = 12_000
MAX_TOTAL_CHARS = 250_000
OFFICIAL_HOSTS = (
    "gov.br", "edu.br", "mil.br", "unb.br", "fgv.br", "cebraspe.org.br",
    "vunesp.com.br", "concursosfcc.com.br", "cesgranrio.org.br"
)


class InvalidDocument(ValueError):
    pass

# Pistas editoriais: padrões de linha, não interpretação semântica nem validação.
# O trecho registrado é sempre uma substring exata do texto da página.
EVIDENCE_LABELS = (
    ("retificacao", re.compile(r"\bretifica(?:ção|cao|ções|coes)\b", re.IGNORECASE)),
    ("edital_identificacao", re.compile(r"\b(?:edital\s+(?:n[º°.o]*|numero|número)?\s*\d+)", re.IGNORECASE)),
    ("data_prova", re.compile(r"\b(?:data\s+(?:da|de)\s+prova|provas?\s+(?:ser[aã]o|ocorrer[aã]o))\b", re.IGNORECASE)),
    ("disciplinas", re.compile(r"\b(?:conte[uú]do\s+program[aá]tico|disciplinas?\s+exigidas?|conhecimentos\s+espec[ií]ficos)\b", re.IGNORECASE)),
    ("banca", re.compile(r"\b(?:banca\s+organizadora|institui[cç][aã]o\s+organizadora)\b", re.IGNORECASE)),
    ("cargo_curso", re.compile(r"\b(?:cargos?\s+(?:ofertados?|dispon[ií]veis)|curso\s+de\s+gradua[cç][aã]o)\b", re.IGNORECASE)),
)
MAX_REVIEW_ITEMS = 48
MAX_EVIDENCE_LINE = 450


def evidence_candidates(pages: list[dict], truncated: bool) -> list[dict]:
    """Pistas literalizadas. Nunca transformar indicação de edital em fato aprovado."""
    findings = []
    for page in pages:
        number = page["pagina"]
        for line_number, raw_line in enumerate(page["texto"].splitlines(), 1):
            literal = raw_line.strip()
            if len(literal) < 5:
                continue
            for label, pattern in EVIDENCE_LABELS:
                match = pattern.search(literal)
                if match and len(findings) < MAX_REVIEW_ITEMS:
                    excerpt = literal[:MAX_EVIDENCE_LINE]
                    if match.start() >= MAX_EVIDENCE_LINE:
                        continue
                    findings.append({
                        "tipo": label,
                        "pagina": number,
                        "linha_texto_extraido": line_number,
                        "trecho_literal": excerpt,
                        "estado_revisao": "pendente",
                        "interpretação_confirmada": False,
                        "confianca_automaticamente_atribuida": None,
                    })
                    break
            if len(findings) == MAX_REVIEW_ITEMS:
                return findings
    return findings




def institutional_source(url: str) -> str:
    if not isinstance(url, str) or len(url) > 1600 or not url:
        raise InvalidDocument("Informe uma URL institucional HTTPS para a origem.")
    if any(ord(char) < 32 for char in url) or "\\" in url:
        raise InvalidDocument("A URL da origem contém caracteres inválidos.")
    try:
        parsed = urlsplit(url)
        host = (parsed.hostname or "").lower().rstrip(".")
        port = parsed.port
    except ValueError as exc:
        raise InvalidDocument("A URL institucional está malformada.") from exc
    if (
        parsed.scheme != "https" or not host or parsed.username or parsed.password
        or port not in (None, 443)
        or host not in OFFICIAL_HOSTS and not any(host.endswith("." + allowed) for allowed in OFFICIAL_HOSTS)
    ):
        raise InvalidDocument("A URL deve apontar para um domínio institucional HTTPS permitido.")
    decoded = unquote(parsed.path)
    segments = decoded.split("/")
    if (
        any(segment in (".", "..") for segment in segments)
        or "//" in decoded or "\\" in decoded or "\x00" in decoded
        or re.search(r"%(?:2e|2f|5c|00)", parsed.path, flags=re.IGNORECASE)
    ):
        raise InvalidDocument("A URL contém um caminho ambíguo.")
    return url


def ingest(pdf_path: Path, source_url: str) -> dict:
    source = institutional_source(source_url)
    path = pdf_path.resolve(strict=True)
    if pdf_path.suffix.lower() != ".pdf" or not path.is_file():
        raise InvalidDocument("Selecione um arquivo PDF local válido.")
    size = path.stat().st_size
    if size < 16 or size > MAX_BYTES:
        raise InvalidDocument("Arquivo vazio, incompleto ou maior que 12 MiB.")
    content = path.read_bytes()
    if not content.startswith(b"%PDF-"):
        raise InvalidDocument("O arquivo não possui cabeçalho PDF válido.")
    try:
        reader = PdfReader(path, strict=True)
        if reader.is_encrypted:
            raise InvalidDocument("PDF protegido por senha; extração não permitida.")
        page_count = len(reader.pages)
        if page_count < 1 or page_count > MAX_PAGES:
            raise InvalidDocument("O edital excede o limite de 100 páginas para esta etapa.")
        pages = []
        remaining = MAX_TOTAL_CHARS
        no_text = 0
        truncated = False
        for index in range(page_count):
            extracted = reader.pages[index].extract_text(extraction_mode="plain") or ""
            extracted = extracted.replace("\x00", "").strip()
            if not extracted:
                no_text += 1
            trimmed = extracted[:min(MAX_PAGE_CHARS, remaining)]
            if len(trimmed) < len(extracted):
                truncated = True
            remaining -= len(trimmed)
            pages.append({
                "pagina": index + 1,
                "caracteres_extraidos": len(extracted),
                "texto": trimmed,
                "sem_texto_extraivel": not bool(extracted)
            })
        return {
            "schema": "vyzo-edital-extraction-1",
            "situacao": "extraido_sem_revisao",
            "origem_informada": source,
            "origem_confirmada": False,
            "conteudo_oficial_homologado": False,
            "hash_sha256": hashlib.sha256(content).hexdigest(),
            "tamanho_bytes": size,
            "total_paginas": page_count,
            "paginas_sem_texto": no_text,
            "texto_truncado": truncated,
            "paginas": pages,
            "pistas_para_revisao": evidence_candidates(pages, truncated),
            "pistas_sem_validacao": True,
            "avisos": [
                "A URL é apenas uma origem institucional informada; sua relação com o PDF não foi verificada.",
                "Texto extraído pode perder colunas, tabelas, anexos ou caracteres; revisão editorial obrigatória.",
                "Páginas sem texto podem ser digitalizadas. OCR não foi executado.",
                "Datas, cargos, disciplinas e exigências NÃO foram interpretados nem validados automaticamente.",
                "Pistas são linhas literais para revisão editorial; não significam requisitos identificados ou aprovados."
            ]
        }
    except InvalidDocument:
        raise
    except Exception as exc:
        raise InvalidDocument("PDF não pôde ser processado com segurança.") from exc


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="VYZO Academy: extração LOCAL de editais em PDF (não homologados).")
    parser.add_argument("arquivo", type=Path)
    parser.add_argument("--origem", required=True, help="URL institucional declarada pelo operador.")
    parser.add_argument("--saida", type=Path, help="Arquivo JSON local de saída; omitido escreve em stdout.")
    args = parser.parse_args(argv)
    try:
        result = ingest(args.arquivo, args.origem)
        payload = json.dumps(result, ensure_ascii=False, indent=2)
        if args.saida:
            destination = args.saida
            if destination.exists():
                raise InvalidDocument("O JSON de saída já existe; não sobrescrever automaticamente.")
            with destination.open("x", encoding="utf-8") as stream:
                stream.write(payload + "\n")
        else:
            print(payload)
    except (InvalidDocument, OSError, OverflowError) as error:
        print("ERRO: " + str(error), file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
