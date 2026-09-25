package com.lowloot.server.friends;

import java.security.SecureRandom;

// Genera codigos de amigo legibles: 8 caracteres en mayuscula, sin
// caracteres ambiguos (0/O, 1/I/L) para que sea facil compartirlos de
// palabra o escritos a mano. La unicidad real la garantiza la columna
// `users.friend_code` (UNIQUE, V6__friends.sql); quien llama a esto
// reintenta si por casualidad ya existe (ver AuthController).
public final class FriendCodeGenerator {

    private static final String ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static final int LENGTH = 8;
    private static final SecureRandom RANDOM = new SecureRandom();

    private FriendCodeGenerator() {
    }

    public static String generate() {
        StringBuilder sb = new StringBuilder(LENGTH);
        for (int i = 0; i < LENGTH; i++) {
            sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }
}
