from datetime import datetime
from unittest.mock import Mock

import pandas as pd
import pytest

import load_nba_players as loader
import verify_player_table as verify


def stub_import(monkeypatch, previous_season, count, active_count=None):
    conn = Mock()
    cursor = conn.cursor.return_value
    cursor.fetchone.return_value = (516, previous_season)
    monkeypatch.setattr(loader, "connect_db", lambda: conn)
    frame = pd.DataFrame([
        {"PLAYER_ID": i, "GP": 4, "PTS": 20, "TEAM_ABBREVIATION": "LAL"}
        for i in range(count)
    ])
    endpoint = Mock()
    endpoint.get_data_frames.return_value = [frame]
    monkeypatch.setattr(loader.leaguedashplayerstats, "LeagueDashPlayerStats", Mock(return_value=endpoint))
    monkeypatch.setattr(loader.players, "get_active_players", lambda: [
        {"id": i, "full_name": f"Player {i}"}
        for i in range(count if active_count is None else active_count)
    ])
    monkeypatch.setattr(loader, "build_position_map", lambda _: dict.fromkeys(range(count), "Guard"))
    monkeypatch.setattr(loader, "random_delay", lambda _: None)
    return conn, cursor


@pytest.mark.parametrize("count", [0, 299])
def test_new_season_skips_before_delete(monkeypatch, capsys, count):
    conn, cursor = stub_import(monkeypatch, 2025, count)
    assert loader.fetch_and_insert_players(today=datetime(2026, 10, 2)) == 3
    assert all("DELETE" not in call.args[0] for call in cursor.execute.call_args_list)
    conn.commit.assert_not_called()
    conn.rollback.assert_called_once()
    cursor.close.assert_called_once()
    conn.close.assert_called_once()
    assert f"SEASON NOT STARTED: 2026-27 has {count} players with games; keeping season 2025 (516 rows)" in capsys.readouterr().out


def test_same_season_empty_is_a_failure(monkeypatch):
    conn, cursor = stub_import(monkeypatch, 2025, 0)
    with pytest.raises(RuntimeError, match="No league stats"):
        loader.fetch_and_insert_players(today=datetime(2026, 9, 14))
    conn.commit.assert_not_called()
    conn.rollback.assert_called_once()
    assert all("DELETE" not in call.args[0] for call in cursor.execute.call_args_list)


def test_zero_games_do_not_count_toward_switchover(monkeypatch):
    conn, cursor = stub_import(monkeypatch, 2025, 300)
    frame = loader.leaguedashplayerstats.LeagueDashPlayerStats.return_value.get_data_frames.return_value[0]
    frame.loc[0, "GP"] = 0
    assert loader.fetch_and_insert_players(today=datetime(2026, 10, 2)) == 3
    conn.commit.assert_not_called()
    assert all("DELETE" not in call.args[0] for call in cursor.execute.call_args_list)


def test_rollover_load_keeps_floor_but_not_previous_season_ratio(monkeypatch):
    conn, cursor = stub_import(monkeypatch, 2025, 300)
    assert loader.fetch_and_insert_players(today=datetime(2026, 10, 2)) == 0
    conn.commit.assert_called_once()
    assert sum("INSERT INTO" in call.args[0] for call in cursor.execute.call_args_list) == 300


def test_same_season_still_checks_ratio(monkeypatch):
    conn, _ = stub_import(monkeypatch, 2025, 300)
    with pytest.raises(RuntimeError, match="down from 516"):
        loader.fetch_and_insert_players(today=datetime(2026, 9, 14))
    conn.commit.assert_not_called()
    conn.rollback.assert_called_once()


def test_rollover_insufficient_inserted_rows_rolls_back(monkeypatch):
    conn, _ = stub_import(monkeypatch, 2025, 300, active_count=299)
    with pytest.raises(RuntimeError, match="absolute floor of 300"):
        loader.fetch_and_insert_players(today=datetime(2026, 10, 2))
    conn.commit.assert_not_called()
    conn.rollback.assert_called_once()


@pytest.mark.parametrize("previous_season", [None, 2027])
def test_empty_table_or_older_target_cannot_skip(monkeypatch, previous_season):
    conn, _ = stub_import(monkeypatch, previous_season, 0)
    with pytest.raises(RuntimeError, match="No league stats"):
        loader.fetch_and_insert_players(today=datetime(2026, 10, 2))
    conn.commit.assert_not_called()


@pytest.mark.parametrize("season, expected", [(2025, "2025\n"), (None, "\n")])
def test_print_season_is_machine_readable(monkeypatch, capsys, season, expected):
    conn = Mock()
    cursor = Mock()
    context = Mock(__enter__=Mock(return_value=cursor), __exit__=Mock(return_value=False))
    conn.cursor.return_value = context
    cursor.fetchone.return_value = (season,)
    monkeypatch.setattr(verify, "connect", lambda: conn)
    monkeypatch.setattr("sys.argv", ["verify_player_table.py", "--print-season"])
    verify.main()
    assert capsys.readouterr().out == expected
    cursor.execute.assert_called_once_with("SELECT max(season) FROM player;")
    conn.close.assert_called_once()
