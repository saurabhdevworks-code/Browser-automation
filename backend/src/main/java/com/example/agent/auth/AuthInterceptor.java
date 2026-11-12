package com.example.agent.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.util.Optional;
import java.util.Set;

@Component
public class AuthInterceptor implements HandlerInterceptor {
    public static final String AUTH_USER_ATTR = "NAVIO_AUTH_USER";

    private static final Set<String> PUBLIC_AUTH_PATHS = Set.of(
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/providers",
            "/api/v1/auth/google/url",
            "/api/v1/auth/google/callback",
            "/api/v1/auth/google/id-token"
    );

    private final JwtService jwtService;
    private final AppUserRepository users;
    private final String corsOrigin;

    public AuthInterceptor(
            JwtService jwtService,
            AppUserRepository users,
            @Value("${app.cors-origin:http://localhost:5173}") String corsOrigin
    ) {
        this.jwtService = jwtService;
        this.users = users;
        this.corsOrigin = corsOrigin;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String path = request.getRequestURI();
        Optional<AppUser> resolvedUser = resolveUserFromRequest(request);
        resolvedUser.ifPresent(u -> request.setAttribute(AUTH_USER_ATTR, u));

        if (PUBLIC_AUTH_PATHS.contains(path)) {
            return true;
        }
        // Allow initial Google OAuth bootstrap setup when POSTing to /google/config; controller enforces lock if already configured.
        if ("/api/v1/auth/google/config".equals(path) && "POST".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        if (resolvedUser.isPresent()) {
            return true;
        }

        applyCorsIfAllowed(request, response);
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"error\":\"Authentication required. Please sign in.\"}");
        return false;
    }

    private Optional<AppUser> resolveUserFromRequest(HttpServletRequest request) {
        String token = null;
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
            token = authHeader.substring(7).trim();
        } else if ("GET".equalsIgnoreCase(request.getMethod()) && request.getRequestURI().endsWith("/download")) {
            String queryToken = request.getParameter("token");
            if (queryToken != null && !queryToken.isBlank()) {
                token = queryToken.trim();
            }
        }

        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        return jwtService.verifyUserToken(token)
                .flatMap(claims -> users.findById(claims.userId()));
    }

    /**
     * Extracts the authenticated AppUser stored on the current request, or throws SecurityException if missing.
     */
    public static AppUser requireUser(HttpServletRequest request) {
        Object attr = request.getAttribute(AUTH_USER_ATTR);
        if (attr instanceof AppUser user && user.getId() != null) {
            return user;
        }
        throw new SecurityException("Authentication required. Please sign in.");
    }

    /**
     * Extracts the authenticated user's UUID from the current request.
     */
    public static java.util.UUID requireUserId(HttpServletRequest request) {
        return requireUser(request).getId();
    }

    private void applyCorsIfAllowed(HttpServletRequest request, HttpServletResponse response) {
        String origin = request.getHeader("Origin");
        if (origin != null && !origin.isBlank() && corsOrigin != null) {
            for (String allowed : corsOrigin.split(",")) {
                if (origin.equals(allowed.trim())) {
                    response.setHeader("Access-Control-Allow-Origin", origin);
                    response.setHeader("Vary", "Origin");
                    break;
                }
            }
        }
    }
}
