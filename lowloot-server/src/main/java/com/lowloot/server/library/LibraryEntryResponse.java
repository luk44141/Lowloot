package com.lowloot.server.library;

import java.time.LocalDateTime;

public record LibraryEntryResponse(
        Long gameId,
        String name,
        String genre,
        String coverImageUrl,
        double price,
        boolean installed,
        boolean favorite,
        LocalDateTime purchasedAt) {
}
