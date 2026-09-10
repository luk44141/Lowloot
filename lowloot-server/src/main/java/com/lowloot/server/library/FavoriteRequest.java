package com.lowloot.server.library;

import jakarta.validation.constraints.NotNull;

public record FavoriteRequest(@NotNull Boolean favorite) {
}
