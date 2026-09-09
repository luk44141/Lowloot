package com.lowloot.server.purchase;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record PurchaseRequest(@NotEmpty List<Long> gameIds) {
}
