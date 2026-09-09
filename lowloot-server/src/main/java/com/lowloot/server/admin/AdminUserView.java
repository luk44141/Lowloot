package com.lowloot.server.admin;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AdminUserView(
        Long id,
        String username,
        String email,
        String role,
        BigDecimal balance,
        LocalDateTime createdAt) {
}
