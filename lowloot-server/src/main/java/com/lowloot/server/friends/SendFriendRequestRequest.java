package com.lowloot.server.friends;

import jakarta.validation.constraints.NotNull;

public record SendFriendRequestRequest(@NotNull Long userId) {
}
