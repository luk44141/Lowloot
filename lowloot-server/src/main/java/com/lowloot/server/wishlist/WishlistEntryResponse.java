package com.lowloot.server.wishlist;

import java.time.LocalDateTime;

public record WishlistEntryResponse(
        Long gameId,
        String name,
        String genre,
        String coverImageUrl,
        double price,
        double discount,
        String releaseDate,
        LocalDateTime addedAt) {
}
