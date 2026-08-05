package com.cristian.nbastats;

import java.text.Normalizer;

/**
 * Stand-in for PostgreSQL's unaccent() so name queries can run on H2 in tests.
 * Registered as an H2 alias by the INIT clause on the test datasource URL.
 *
 * Stripping combining marks covers most accents, but letters such as Đ, ø and ł
 * carry no separate mark and survive normalization, so they are mapped by hand
 * to match what the real unaccent() returns.
 */
public final class TestUnaccent {

    private static final String FOLDED_FROM = "ĐđØøŁłÆæŒœÞþÐðİıŊŋ";
    private static final String[] FOLDED_TO = {
            "D", "d", "O", "o", "L", "l", "AE", "ae", "OE", "oe",
            "TH", "th", "D", "d", "I", "i", "N", "n"
    };

    private TestUnaccent() {
    }

    public static String unaccent(String value) {
        if (value == null) {
            return null;
        }

        String stripped = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");

        StringBuilder result = new StringBuilder(stripped.length());
        for (char character : stripped.toCharArray()) {
            int index = FOLDED_FROM.indexOf(character);
            result.append(index < 0 ? String.valueOf(character) : FOLDED_TO[index]);
        }
        return result.toString();
    }
}
