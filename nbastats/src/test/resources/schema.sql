-- PlayerRepository compares names through PostgreSQL's unaccent(). H2 has no
-- such function, so tests register a Java equivalent under the same name.
CREATE ALIAS IF NOT EXISTS UNACCENT FOR 'com.cristian.nbastats.TestUnaccent.unaccent';
