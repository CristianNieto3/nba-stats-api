package com.cristian.nbastats.error;

import com.cristian.nbastats.player.PlayerNotFoundException;
import com.cristian.nbastats.player.WriteOperationsDisabledException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(PlayerNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(
            PlayerNotFoundException exception,
            HttpServletRequest request
    ) {
        return response(HttpStatus.NOT_FOUND, exception.getMessage(), request, Map.of());
    }

    @ExceptionHandler(WriteOperationsDisabledException.class)
    public ResponseEntity<ApiError> handleWritesDisabled(
            WriteOperationsDisabledException exception,
            HttpServletRequest request
    ) {
        return response(HttpStatus.FORBIDDEN, exception.getMessage(), request, Map.of());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(
            MethodArgumentNotValidException exception,
            HttpServletRequest request
    ) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors()
                .forEach(error -> fieldErrors.putIfAbsent(error.getField(), error.getDefaultMessage()));
        return response(HttpStatus.BAD_REQUEST, "Request validation failed.", request, fieldErrors);
    }

    @ExceptionHandler({
            IllegalArgumentException.class,
            ConstraintViolationException.class,
            MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class,
            HttpMessageNotReadableException.class
    })
    public ResponseEntity<ApiError> handleBadRequest(Exception exception, HttpServletRequest request) {
        String message = exception instanceof HttpMessageNotReadableException
                ? "Request body is malformed or contains an invalid value."
                : exception.getMessage();
        return response(HttpStatus.BAD_REQUEST, message, request, Map.of());
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<ApiError> handleDatabaseError(
            DataAccessException exception,
            HttpServletRequest request
    ) {
        LOGGER.error("Database operation failed for {}", request.getRequestURI(), exception);
        return response(
                HttpStatus.SERVICE_UNAVAILABLE,
                "The database operation could not be completed.",
                request,
                Map.of()
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception exception, HttpServletRequest request) {
        LOGGER.error("Unexpected error for {}", request.getRequestURI(), exception);
        return response(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "An unexpected error occurred.",
                request,
                Map.of()
        );
    }

    private ResponseEntity<ApiError> response(
            HttpStatus status,
            String message,
            HttpServletRequest request,
            Map<String, String> fieldErrors
    ) {
        ApiError error = new ApiError(
                Instant.now(),
                status.value(),
                status.getReasonPhrase(),
                message,
                request.getRequestURI(),
                fieldErrors
        );
        return ResponseEntity.status(status).body(error);
    }
}
