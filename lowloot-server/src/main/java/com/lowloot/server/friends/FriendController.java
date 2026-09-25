package com.lowloot.server.friends;

import com.lowloot.server.auth.User;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/friends")
public class FriendController {

    private final FriendService friendService;

    public FriendController(FriendService friendService) {
        this.friendService = friendService;
    }

    @GetMapping("/me/code")
    public FriendCodeResponse myCode(@AuthenticationPrincipal User user) {
        return new FriendCodeResponse(user.getFriendCode());
    }

    @GetMapping("/search")
    public List<FriendSearchResult> search(@AuthenticationPrincipal User user, @RequestParam("q") String query) {
        return friendService.search(user, query);
    }

    /* ---------- Solicitudes ---------- */

    @PostMapping("/requests")
    public FriendRequestResponse sendRequest(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody SendFriendRequestRequest request) {
        return friendService.sendRequest(user, request.userId());
    }

    @GetMapping("/requests/received")
    public List<FriendRequestResponse> received(@AuthenticationPrincipal User user) {
        return friendService.listReceived(user);
    }

    @GetMapping("/requests/sent")
    public List<FriendRequestResponse> sent(@AuthenticationPrincipal User user) {
        return friendService.listSent(user);
    }

    // Fuente del contador de solicitudes pendientes (requisito 5): se
    // consulta al arrancar el launcher y después de cada acción, así que
    // sobrevive a cerrar y volver a abrir sin depender solo del frontend.
    @GetMapping("/requests/pending-count")
    public PendingCountResponse pendingCount(@AuthenticationPrincipal User user) {
        return new PendingCountResponse(friendService.pendingReceivedCount(user.getId()));
    }

    @PostMapping("/requests/{id}/accept")
    public ResponseEntity<Void> accept(@AuthenticationPrincipal User user, @PathVariable Long id) {
        friendService.acceptRequest(user, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/requests/{id}/reject")
    public ResponseEntity<Void> reject(@AuthenticationPrincipal User user, @PathVariable Long id) {
        friendService.rejectRequest(user, id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/requests/{id}")
    public ResponseEntity<Void> cancel(@AuthenticationPrincipal User user, @PathVariable Long id) {
        friendService.cancelRequest(user, id);
        return ResponseEntity.noContent().build();
    }

    /* ---------- Amigos ---------- */

    @GetMapping
    public List<FriendResponse> myFriends(@AuthenticationPrincipal User user) {
        return friendService.listFriends(user);
    }

    // Va después de /requests/** y /search a propósito (orden de los
    // métodos no afecta el ruteo de Spring, pero mantiene juntas las rutas
    // fijas antes que esta con path variable, para que sea fácil de leer).
    @GetMapping("/{userId}")
    public FriendProfileResponse profile(@AuthenticationPrincipal User user, @PathVariable Long userId) {
        return friendService.publicProfile(user, userId);
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> remove(@AuthenticationPrincipal User user, @PathVariable Long userId) {
        friendService.removeFriend(user, userId);
        return ResponseEntity.noContent().build();
    }
}
