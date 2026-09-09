package com.lowloot.server.purchase;

import java.math.BigDecimal;
import java.util.List;

public record PurchaseResponse(
        List<Long> purchasedGameIds,
        BigDecimal totalCharged,
        BigDecimal newBalance) {
}
