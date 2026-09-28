package com.bgssai.health.common.exception;

import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.ratelimit.RateLimitExceededException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    @ExceptionHandler(BizException.class)
    public ResponseEntity<ApiResponse<Void>> business(BizException ex) {
        int status = switch (ex.getCode()) {
            case "2002", "2003", "4001" -> 401;
            case "4003" -> 403;
            case "404000" -> 404;
            case "409000" -> 409;
            case "429000" -> 429;
            case "502000", "504000" -> 502;
            default -> 400;
        };
        log.info("request rejected code={}", ex.getCode());
        return ResponseEntity.status(status).body(ApiResponse.fail(ex.getCode(), ex.getMessage()));
    }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> invalid(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream().findFirst()
            .map(e -> e.getField() + ": " + e.getDefaultMessage()).orElse("Invalid request");
        return ResponseEntity.badRequest().body(ApiResponse.fail("50000001", message));
    }
    @ExceptionHandler({HttpMessageNotReadableException.class, IllegalArgumentException.class})
    public ResponseEntity<ApiResponse<Void>> malformed(Exception ex) {
        return ResponseEntity.badRequest().body(ApiResponse.fail("50000001", "Invalid request / 请求格式不正确"));
    }
    @ExceptionHandler(DuplicateKeyException.class)
    public ResponseEntity<ApiResponse<Void>> duplicate(DuplicateKeyException ex) {
        return ResponseEntity.status(409).body(ApiResponse.fail("409000", "Record already exists / 记录已存在，请刷新"));
    }
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> missing(NoResourceFoundException ex) {
        return ResponseEntity.status(404).body(ApiResponse.fail("404000", "Not found"));
    }
    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ApiResponse<Void>> limited(RateLimitExceededException ex) {
        return ResponseEntity.status(429).header("Retry-After", String.valueOf(ex.getRetryAfterSeconds()))
            .body(ApiResponse.fail("429000", "Too many requests / 操作频繁，请稍后重试"));
    }
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> unexpected(Exception ex) {
        log.error("request failed exceptionType={}", ex.getClass().getName());
        return ResponseEntity.internalServerError().body(ApiResponse.fail("999999", "Service error / 服务暂时不可用"));
    }
}
