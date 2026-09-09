package com.lowloot.server.admin;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

// `delta` puede ser positivo (acreditar) o negativo (debitar). El servidor
// vuelve a chequear que el saldo resultante no quede negativo (la propia
// tabla wallets tiene un CHECK balance >= 0 como ultima red de seguridad).
public record AdminBalanceAdjustmentRequest(
        @NotNull BigDecimal delta,
        String reason) {
}
