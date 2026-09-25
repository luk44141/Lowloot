package com.lowloot.server.common;

import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

// Único lugar donde se traducen las excepciones a una respuesta JSON
// consistente ({"message": "..."}) en español y sin detalles técnicos.
// Los controllers ya usan ResponseStatusException con mensajes propios
// (ej. "Saldo insuficiente") para los casos de negocio; este advice cubre
// lo que se les escapa: validación de @Valid, permisos y errores 500
// inesperados, para que nunca lleguen al launcher como JSON crudo,
// stacktrace o el texto genérico de Spring.
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // Los controllers y servicios (AuthController, PurchaseService, etc.)
    // ya tiran ResponseStatusException con su propio status y mensaje de
    // negocio (ej. 402 "Saldo insuficiente", 409 "Ya tenés en tu
    // biblioteca..."). Este handler es más específico que el catch-all de
    // Exception de abajo, así que Spring lo prioriza y esos mensajes
    // llegan intactos al frontend en vez de convertirse en un 500 genérico.
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException ex) {
        HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
        if (status == null) status = HttpStatus.INTERNAL_SERVER_ERROR;
        String message = ex.getReason() != null ? ex.getReason() : "No se pudo completar la operación";
        return body(status, message);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String detail = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(fieldError -> fieldError.getDefaultMessage())
                .orElse("Revisá los datos ingresados");
        return body(HttpStatus.BAD_REQUEST, detail);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        return body(HttpStatus.FORBIDDEN, "No tenés permisos para hacer esto");
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleBadCredentials(BadCredentialsException ex) {
        return body(HttpStatus.UNAUTHORIZED, "Email o contraseña incorrectos");
    }

    // Cualquier otra excepción no prevista: nunca se expone el mensaje real
    // al cliente (podría contener detalles internos) ni un stacktrace, pero
    // SÍ se loguea completo del lado del servidor (antes esto se tragaba en
    // silencio: un 500 llegaba al launcher como "Hubo un problema..." sin
    // dejar ningún rastro en la consola para poder diagnosticarlo).
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpected(Exception ex) {
        log.error("Error no manejado procesando un request", ex);
        return body(HttpStatus.INTERNAL_SERVER_ERROR, "Hubo un problema en el servidor, intentá de nuevo en un momento");
    }

    private ResponseEntity<Map<String, Object>> body(HttpStatus status, String message) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("status", status.value());
        payload.put("message", message);
        return ResponseEntity.status(status).body(payload);
    }
}
