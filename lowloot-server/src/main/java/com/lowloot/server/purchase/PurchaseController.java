package com.lowloot.server.purchase;

import com.lowloot.server.auth.User;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PurchaseController {

    private final PurchaseService purchaseService;

    public PurchaseController(PurchaseService purchaseService) {
        this.purchaseService = purchaseService;
    }

    // Un solo juego -> gameIds con un elemento. Varios (carrito) -> la
    // misma lista con todos. Mismo camino atomico en los dos casos.
    @PostMapping("/purchases")
    public ResponseEntity<PurchaseResponse> purchase(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody PurchaseRequest request) {
        PurchaseResponse response = purchaseService.purchase(user.getId(), request.gameIds());
        return ResponseEntity.ok(response);
    }
}
