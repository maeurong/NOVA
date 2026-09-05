"""Il deck a fibre non lineare e la statica a passi, senza binario.

La prima prova non è sul non lineare: è la **regressione elastica**. Il refactor di `scrivi`
(ticket #19) sposta codice, e l'unico modo di dimostrare che non lo riscrive è confrontare il
`.tcl` del `telaio_2x1` con quello generato a `main` @ `2c120fa`, prima del refactor, byte per
byte. La riga d'intestazione non porta data né versione, quindi il confronto è sull'intero file.
"""
import pytest

from conftest import FIXTURE, leggi_fixture
from nova import deck as _deck
from nova import legami as _legami
from nova import modello as _modello
from nova import sidecar as _sidecar

RIFERIMENTO = FIXTURE / "telaio_2x1_riferimento.tcl"


def _carica(nome: str, **modifiche):
    dati = leggi_fixture(nome)
    dati.update(modifiche)
    return _modello.assicura_peso_proprio(_modello.carica(dati))


def _fibre(dati: dict, **campi) -> dict:
    """La stessa fixture con la statica dichiarata a fibre (e quel che serve al caso)."""
    for an in dati["analisi"]:
        if an["tipo"] == "statica":
            an.update({"legami": "fibre", **campi})
    return dati


def _testo(m, casi, tmp_path, **extra) -> str:
    return _deck.scrivi(m, list(casi), tmp_path, **extra).percorso.read_text(encoding="utf-8")


# --- regressione: `legami: elastico` (default) scrive quel che scriveva prima del refactor ---

def test_il_deck_elastico_del_telaio_2x1_e_identico_a_prima_del_refactor(tmp_path):
    m = _carica("telaio_2x1.nova.json")
    casi = _sidecar._casi_delle_analisi(m)
    assert casi == ["Z1", "Z2", "C1", "Z3"]  # l'ordine è quello del riferimento
    assert _testo(m, casi, tmp_path) == RIFERIMENTO.read_text(encoding="utf-8")
