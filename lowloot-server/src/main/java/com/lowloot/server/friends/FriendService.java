package com.lowloot.server.friends;

import com.lowloot.server.auth.User;
import com.lowloot.server.auth.UserRepository;
import com.lowloot.server.notification.NotificationService;
import com.lowloot.server.profile.UserAvatarRepository;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class FriendService {

    // Umbral para considerar a alguien "En línea": si tuvo actividad
    // autenticada (ver JwtAuthFilter) dentro de este margen. No hay
    // presencia en tiempo real (sin WebSockets), es una aproximación
    // simple y suficiente, tal como se pidió.
    private static final Duration ONLINE_THRESHOLD = Duration.ofMinutes(5);
    private static final int SEARCH_LIMIT = 20;

    private static final String TYPE_FRIEND_REQUEST = "FRIEND_REQUEST";
    private static final String TYPE_FRIEND_ACCEPTED = "FRIEND_ACCEPTED";

    private final UserRepository userRepository;
    private final FriendRequestRepository friendRequestRepository;
    private final FriendshipRepository friendshipRepository;
    private final UserAvatarRepository userAvatarRepository;
    private final NotificationService notificationService;

    public FriendService(
            UserRepository userRepository,
            FriendRequestRepository friendRequestRepository,
            FriendshipRepository friendshipRepository,
            UserAvatarRepository userAvatarRepository,
            NotificationService notificationService) {
        this.userRepository = userRepository;
        this.friendRequestRepository = friendRequestRepository;
        this.friendshipRepository = friendshipRepository;
        this.userAvatarRepository = userAvatarRepository;
        this.notificationService = notificationService;
    }

    /* ---------- Búsqueda ---------- */

    // Por nombre visible (parcial, insensible a mayúsculas) o por código
    // de amigo (exacto). El código va primero: si alguien pega un código
    // completo, esperamos que sea justo a esa persona a la que busca.
    public List<FriendSearchResult> search(User currentUser, String rawQuery) {
        String query = rawQuery == null ? "" : rawQuery.trim();
        if (query.isEmpty()) return List.of();

        LinkedHashMap<Long, User> results = new LinkedHashMap<>();

        userRepository.findByFriendCodeIgnoreCase(query).ifPresent(u -> {
            if (!u.getId().equals(currentUser.getId())) results.put(u.getId(), u);
        });

        userRepository.searchByDisplayName(query, currentUser.getId())
                .forEach(u -> results.putIfAbsent(u.getId(), u));

        return results.values().stream()
                .limit(SEARCH_LIMIT)
                .map(u -> toSearchResult(currentUser, u))
                .toList();
    }

    /* ---------- Solicitudes ---------- */

    @Transactional
    public FriendRequestResponse sendRequest(User sender, Long receiverId) {
        if (receiverId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Falta indicar a quién enviarle la solicitud");
        }
        if (receiverId.equals(sender.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No podés enviarte una solicitud de amistad a vos mismo");
        }

        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        if (isFriendPair(sender.getId(), receiverId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya son amigos");
        }
        if (friendRequestRepository.existsBySenderIdAndReceiverId(sender.getId(), receiverId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya le enviaste una solicitud a este usuario");
        }
        if (friendRequestRepository.existsBySenderIdAndReceiverId(receiverId, sender.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este usuario ya te envió una solicitud: respondela desde \"Recibidas\"");
        }

        FriendRequest request = new FriendRequest(sender.getId(), receiverId);
        try {
            request = friendRequestRepository.save(request);
        } catch (DataIntegrityViolationException ex) {
            // Carrera entre dos requests simultáneos creando la misma
            // solicitud: la unique constraint (sender_id, receiver_id) la
            // frena en la base: se lo informamos como conflicto en vez de
            // un 500 genérico.
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe una solicitud entre estos usuarios");
        }

        notificationService.create(
                receiver.getId(),
                TYPE_FRIEND_REQUEST,
                sender,
                request.getId(),
                sender.getEffectiveDisplayName() + " te envió una solicitud de amistad",
                null);

        return toRequestResponse(request, sender, receiver, true);
    }

    public List<FriendRequestResponse> listReceived(User currentUser) {
        List<FriendRequest> requests = friendRequestRepository.findByReceiverIdOrderByCreatedAtDesc(currentUser.getId());
        if (requests.isEmpty()) return List.of();

        Map<Long, User> sendersById = usersById(requests.stream().map(FriendRequest::getSenderId).toList());

        return requests.stream()
                .map(r -> {
                    User sender = sendersById.get(r.getSenderId());
                    if (sender == null) return null; // cuenta borrada entre medio: no se muestra
                    return toRequestResponse(r, sender, currentUser, false);
                })
                .filter(Objects::nonNull)
                .toList();
    }

    public List<FriendRequestResponse> listSent(User currentUser) {
        List<FriendRequest> requests = friendRequestRepository.findBySenderIdOrderByCreatedAtDesc(currentUser.getId());
        if (requests.isEmpty()) return List.of();

        Map<Long, User> receiversById = usersById(requests.stream().map(FriendRequest::getReceiverId).toList());

        return requests.stream()
                .map(r -> {
                    User receiver = receiversById.get(r.getReceiverId());
                    if (receiver == null) return null;
                    return toRequestResponse(r, currentUser, receiver, true);
                })
                .filter(Objects::nonNull)
                .toList();
    }

    public long pendingReceivedCount(Long userId) {
        return friendRequestRepository.countByReceiverId(userId);
    }

    @Transactional
    public void acceptRequest(User currentUser, Long requestId) {
        FriendRequest request = ownedReceivedRequest(currentUser, requestId);

        long low = Math.min(request.getSenderId(), request.getReceiverId());
        long high = Math.max(request.getSenderId(), request.getReceiverId());

        if (!friendshipRepository.existsByUserIdLowAndUserIdHigh(low, high)) {
            try {
                friendshipRepository.save(new Friendship(low, high));
            } catch (DataIntegrityViolationException ex) {
                // Ya se había creado (dos aceptaciones/casos borde en
                // simultáneo): no es un error real, la amistad ya existe.
            }
        }

        notificationService.deleteByReference(TYPE_FRIEND_REQUEST, request.getId());
        friendRequestRepository.delete(request);

        userRepository.findById(request.getSenderId()).ifPresent(sender ->
                notificationService.create(
                        sender.getId(),
                        TYPE_FRIEND_ACCEPTED,
                        currentUser,
                        currentUser.getId(),
                        currentUser.getEffectiveDisplayName() + " aceptó tu solicitud de amistad",
                        null));
    }

    @Transactional
    public void rejectRequest(User currentUser, Long requestId) {
        FriendRequest request = ownedReceivedRequest(currentUser, requestId);
        notificationService.deleteByReference(TYPE_FRIEND_REQUEST, request.getId());
        friendRequestRepository.delete(request);
    }

    // El que envió la solicitud puede arrepentirse antes de que el otro
    // responda; no estaba pedido explícitamente pero se desprende de
    // "ver solicitudes enviadas" (si no, quedarían ahí para siempre).
    @Transactional
    public void cancelRequest(User currentUser, Long requestId) {
        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitud no encontrada"));
        if (!request.getSenderId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Esta solicitud no te pertenece");
        }
        notificationService.deleteByReference(TYPE_FRIEND_REQUEST, request.getId());
        friendRequestRepository.delete(request);
    }

    private FriendRequest ownedReceivedRequest(User currentUser, Long requestId) {
        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitud no encontrada"));
        if (!request.getReceiverId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Esta solicitud no te pertenece");
        }
        return request;
    }

    /* ---------- Amigos ---------- */

    public List<FriendResponse> listFriends(User currentUser) {
        List<Friendship> friendships = friendshipRepository.findAllForUser(currentUser.getId());
        if (friendships.isEmpty()) return List.of();

        List<Long> friendIds = friendships.stream()
                .map(f -> f.getUserIdLow().equals(currentUser.getId()) ? f.getUserIdHigh() : f.getUserIdLow())
                .toList();

        Map<Long, User> usersById = usersById(friendIds);

        return friendIds.stream()
                .map(usersById::get)
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(User::getEffectiveDisplayName, String.CASE_INSENSITIVE_ORDER))
                .map(this::toFriendResponse)
                .toList();
    }

    public FriendProfileResponse publicProfile(User currentUser, Long userId) {
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        boolean hasAvatar = userAvatarRepository.existsByUserId(target.getId());
        return new FriendProfileResponse(
                target.getId(),
                target.getDisplayUsername(),
                target.getEffectiveDisplayName(),
                hasAvatar ? "/users/" + target.getId() + "/avatar" : null,
                isFriendPair(currentUser.getId(), target.getId()),
                isOnline(target),
                target.getLastActiveAt());
    }

    @Transactional
    public void removeFriend(User currentUser, Long friendUserId) {
        if (friendUserId.equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Operación inválida");
        }
        long low = Math.min(currentUser.getId(), friendUserId);
        long high = Math.max(currentUser.getId(), friendUserId);

        Friendship friendship = friendshipRepository.findByUserIdLowAndUserIdHigh(low, high)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No son amigos"));

        friendshipRepository.delete(friendship);
    }

    /* ---------- Helpers ---------- */

    private boolean isFriendPair(Long a, Long b) {
        long low = Math.min(a, b);
        long high = Math.max(a, b);
        return friendshipRepository.existsByUserIdLowAndUserIdHigh(low, high);
    }

    private boolean isOnline(User user) {
        LocalDateTime last = user.getLastActiveAt();
        return last != null && Duration.between(last, LocalDateTime.now()).compareTo(ONLINE_THRESHOLD) <= 0;
    }

    private Map<Long, User> usersById(List<Long> ids) {
        if (ids.isEmpty()) return Map.of();
        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
    }

    private String avatarUrl(User user) {
        return userAvatarRepository.existsByUserId(user.getId()) ? "/users/" + user.getId() + "/avatar" : null;
    }

    private FriendSearchResult toSearchResult(User currentUser, User target) {
        String status;
        if (isFriendPair(currentUser.getId(), target.getId())) {
            status = "FRIENDS";
        } else if (friendRequestRepository.existsBySenderIdAndReceiverId(currentUser.getId(), target.getId())) {
            status = "REQUEST_SENT";
        } else if (friendRequestRepository.existsBySenderIdAndReceiverId(target.getId(), currentUser.getId())) {
            status = "REQUEST_RECEIVED";
        } else {
            status = "NONE";
        }

        return new FriendSearchResult(
                target.getId(),
                target.getDisplayUsername(),
                target.getEffectiveDisplayName(),
                target.getFriendCode(),
                avatarUrl(target),
                isOnline(target),
                status);
    }

    private FriendResponse toFriendResponse(User friend) {
        return new FriendResponse(
                friend.getId(),
                friend.getDisplayUsername(),
                friend.getEffectiveDisplayName(),
                avatarUrl(friend),
                isOnline(friend),
                friend.getLastActiveAt());
    }

    private FriendRequestResponse toRequestResponse(FriendRequest request, User sender, User receiver, boolean outgoing) {
        User other = outgoing ? receiver : sender;
        return new FriendRequestResponse(
                request.getId(),
                other.getId(),
                other.getDisplayUsername(),
                other.getEffectiveDisplayName(),
                avatarUrl(other),
                request.getCreatedAt());
    }
}
