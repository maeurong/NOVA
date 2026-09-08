# Ri-conversione NTC 2018 + Circolare 2019 — 07/09/2026

Sorgenti: i PDF ufficiali della **Gazzetta Ufficiale**, scaricati e verificati per dimensione. Sono conservati in `fonte/`, esclusi dall'indice via `.graphifyignore`: sono la fonte da aprire, non testo da estrarre due volte.

- NTC 2018 — <https://www.gazzettaufficiale.it/eli/gu/2018/02/20/42/so/8/sg/pdf> — 9.888.288 byte, 372 pagine
- Circolare C.S.LL.PP. 7/2019 — <https://www.gazzettaufficiale.it/eli/gu/2019/02/11/35/so/5/sg/pdf> — 50.658.045 byte, 348 pagine

Estrattore: **anydoc** (`npx -y @firecrawl/anydoc`), poi `converti-anydoc.py` per la rimappatura dei simboli e la struttura.

**Niente qui sostituisce i file esistenti.** La sostituzione del corpus vecchio è una decisione aperta: [Il corpus ri-convertito sostituisce quello vecchio?](https://github.com/maeurong/claude-config/issues/11)

## Perché serve un passo dopo l'estrattore

La corruzione **non era della conversione precedente: è nel PDF ufficiale**. Il font dei simboli è `Type0` con `Identity-H` e **senza `ToUnicode`**, e il sottoinsieme incorporato è spogliato di `post` e `cmap`. Nessun estrattore può sapere quale carattere sia un glifo — verificato: `pdftotext` e `anydoc` producono lo stesso guasto.

`Identity-H` però garantisce che uno stesso codice sia **sempre** lo stesso glifo, quindi una prova per codice vale per tutte le sue occorrenze. La tabella è in `converti-anydoc.py`, ogni riga con il contesto che l'ha dimostrata, **ri-verificata sull'output di anydoc** e non ereditata da quella costruita su `pdftotext`.

Trappola da conoscere: `·` U+0387 (corrotto, sta per γ) e `·` U+00B7 (punto mediano vero) si stampano identici. Nel codice si scrive per code point.

## Grado di fiducia, per documento

| File | Prosa | Simboli | Formule |
|---|---|---|---|
| `ntc2018.md` | affidabile | **affidabile** — 127 `≥`, 264 `≤`, 262 `γ`, 168 `α`, 65 `ε`, 39 `ψ`, zero codici rotti residui | **con riserva**, vedi sotto |
| `circolare2019.md` | affidabile | non pertinente: il documento non ne porta di recuperabili | **inaffidabile — non citare formule da qui** |

Le formule della Circolare sono strutturalmente distrutte, non cifrate: più sottoinsiemi Symbol nella stessa pagina, layout bidimensionale appiattito, tratti di prosa spostati di tre posizioni nell'alfabeto. Nessuno strumento di estrazione testo le recupera. Per una formula della Circolare **si apre il PDF**.

### La riserva sulle formule NTC

anydoc lascia cadere caratteri sulle formule, in modo non uniforme. Caso reale, §11.2.5:

```
pdftotext:   Rcm28 ≥ Rck + 3,5      integro
anydoc:        cm28≥ Rck + 3,5      perde la R iniziale
```

Sulla seconda occorrenza della stessa riga la `R` c'è. **Una formula presa da `ntc2018.md` va confrontata con il PDF in `fonte/` prima di citarla.**

Nella convenzione a marche di `Tesi/docs/validazione/`: la prosa NTC è **[V]**; un simbolo NTC è **[V]**; una **formula** NTC è **[R]** finché non confrontata; le formule della Circolare restano **[NON TROVATO]**.

## Confronto fra i due estrattori, misurato sulle NTC

```
                    parole      ≥     ≤     γ    heading   righe di tabella
  pdftotext        206.740    124   262   258      1840*          0
  anydoc           196.392    127   264   262       555          784
```

\* incluse le duplicazioni indice/corpo, quindi il valore reale è circa la metà.

anydoc recupera qualche simbolo in più, restituisce i **pedici veri** (`G₂` invece di `G2`) e ricostruisce le tabelle; perde ~10.000 parole, produce 498 caratteri `�` irrecuperabili nelle zone di formula, e lascia cadere caratteri come nel caso sopra. Il riscontro `pdftotext` è servito a stabilire questi numeri e non è conservato: recuperabile in un minuto da `fonte/ntc2018.pdf` con `pdftotext -layout`, mentre il PDF resta il riscontro che conta.

## Struttura

I `§` sono heading Markdown, profondità pari al livello — 555 in NTC, 454 nella Circolare (che numera con la `C` davanti ai paragrafi NTC che commenta). Prima era **un heading per file di capitolo**: nessun indice di clausola era possibile. Tolti 359 e 337 numeri di pagina che anydoc aveva promosso a heading.

L'indice iniziale e il corpo producono heading identici: ogni `§` compare due volte. Chi indicizza tenga la seconda occorrenza.

## Riprodurre

```bash
npx -y @firecrawl/anydoc ntc2018.pdf -o ntc-anydoc-grezzo.md
python3 converti-anydoc.py ntc-anydoc-grezzo.md
```


## C7 della Circolare: scansioni, quindi OCR (08/09/2026)

Il capitolo C7 (progettazione per azioni sismiche) **non esiste come testo nel PDF ufficiale**: le pagine 197-253 sono scansioni (`pdfimages -list`: 284 immagini, una JPEG 2219×3106 a 346 ppi per pagina) e `pdftotext` ne ricava ~916 parole di sole intestazioni. Ricavato via OCR — tesseract 5.5.3, modello `ita`, 300 dpi, `--psm 4` — e innestato in `circolare2019.md` fra `<!-- inizio OCR C7 -->` e `<!-- fine OCR C7 -->`, con un marcatore `<!-- OCR pag. N -->` per pagina; copia integrale in `circolare2019-C7-ocr.md`.

Misure: 33.204 parole, 7% di token di un carattere, 1.049 token accentati, 164 sezioni `C7.n` distinte. Verifica a occhio su tre pagine (197 titolo, 223 figure, 230 prosa): la prosa combacia, formule e figure no.

**Marca `[OCR]`**: quinta marca accanto a `[V]`/`[R]`/`[I]`/`[NON TROVATO]`. Un valore preso dal C7 e' `[OCR]` finche' non e' riscontrato sul PDF alla pagina indicata; `norme-reviewer` lo tratta come *non verificabile*.
