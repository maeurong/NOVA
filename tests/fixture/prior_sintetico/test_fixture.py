"""La fixture del prior sintetico c'e', e' JSON, e ha quanto dice il README.

Solo stdlib: nessuna dipendenza da MeshRec, la fixture e' versionata apposta.
"""

import importlib.util
import json
import sys
from pathlib import Path

import pytest

QUI = Path(__file__).resolve().parent
FIXTURE = QUI / "12_wall.json"
MEMBRATURE_ATTESE = 4  # [M] README.md: il TELAIO di test_wall.py da' 4 membrature


def _genera():
    spec = importlib.util.spec_from_file_location("genera", QUI / "genera.py")
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


def test_la_fixture_esiste_ed_e_json_con_membrature_e_giunzioni():
    assert FIXTURE.is_file()
    esito = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert "membrature" in esito
    assert "giunzioni" in esito


def test_il_numero_di_membrature_e_quello_del_readme():
    esito = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert len(esito["membrature"]) == MEMBRATURE_ATTESE


def test_zero_membrature_non_scrive_e_riporta_le_scartate(tmp_path):
    esito = {
        "membrature": [],
        "giunzioni": [],
        "scartate": [{"controllo": "min_cells", "valore": 3, "soglia": 12}],
    }
    with pytest.raises(SystemExit) as errore:
        _genera().scrivi(esito, tmp_path / "12_wall.json")
    assert "min_cells" in str(errore.value)
    assert not (tmp_path / "12_wall.json").exists()


@pytest.mark.parametrize("valore", [float("nan"), float("inf")])
def test_un_nan_o_inf_fa_fallire_il_generatore_senza_scrivere(tmp_path, valore):
    esito = {"membrature": [{"lunghezza": valore}], "giunzioni": [], "scartate": []}
    with pytest.raises(ValueError):
        _genera().scrivi(esito, tmp_path / "12_wall.json")
    assert not (tmp_path / "12_wall.json").exists()


def test_senza_meshrec_il_generatore_si_ferma_all_import_senza_scrivere(tmp_path, monkeypatch):
    modulo = _genera()
    monkeypatch.setattr(sys, "path", list(sys.path))  # main() antepone TESI a sys.path
    monkeypatch.setattr(modulo, "TESI", tmp_path / "tesi_assente")
    monkeypatch.setattr(modulo, "QUI", tmp_path)
    with pytest.raises(ModuleNotFoundError) as errore:
        modulo.main()
    assert errore.value.name == "test_wall"
    assert not (tmp_path / "12_wall.json").exists()
