package com.lowloot.server.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(
            @Value("${lowloot.jwt.secret}") String secret,
            @Value("${lowloot.jwt.expiration-ms}") long expirationMs) {
        // HS256 necesita al menos 32 bytes de secreto; si el valor de
        // configuracion es mas corto (por ejemplo, el placeholder por
        // defecto), lo rellenamos para no romper el arranque en desarrollo,
        // pero en application-local.properties siempre hay que poner un
        // secreto propio y largo.
        byte[] rawKey = secret.getBytes(StandardCharsets.UTF_8);
        if (rawKey.length < 32) {
            byte[] padded = new byte[32];
            System.arraycopy(rawKey, 0, padded, 0, rawKey.length);
            rawKey = padded;
        }
        this.key = Keys.hmacShaKeyFor(rawKey);
        this.expirationMs = expirationMs;
    }

    public String generateToken(User user) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(user.getEmail())
                .claim("uid", user.getId())
                .claim("role", user.getRole().name())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key)
                .compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extractEmail(String token) {
        return parseClaims(token).getSubject();
    }

    public boolean isExpired(String token) {
        return parseClaims(token).getExpiration().before(new Date());
    }
}
