package com.lowloot.server.purchase;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

// 402 Payment Required: el frontend lo distingue de un 500/409 generico y
// muestra el mensaje "Saldo insuficiente" sin tocar el carrito.
public class InsufficientBalanceException extends ResponseStatusException {
    public InsufficientBalanceException(String message) {
        super(HttpStatus.PAYMENT_REQUIRED, message);
    }
}
