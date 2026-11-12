package com.example.agent.auth;

import com.example.agent.security.CredentialCrypto;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}$");

    private final AppUserRepository users;
    private final OAuthProviderConfigRepository oauthConfigs;
    private final JwtService jwtService;
    private final ObjectMapper mapper;
    private final HttpClient httpClient;

    private final String defaultFrontendUrl;
    private final String allowedCorsOrigins;
    private final String configuredEncryptionKey;
    private final String envGoogleClientId;
    private final String envGoogleClientSecret;
    private final String envGoogleRedirectUri;

    public AuthController(
            AppUserRepository users,
            OAuthProviderConfigRepository oauthConfigs,
            JwtService jwtService,
            ObjectMapper mapper,
            @Value("${app.auth.frontend-url:http://localhost:5173}") String defaultFrontendUrl,
            @Value("${app.cors-origin:http://localhost:5173}") String allowedCorsOrigins,
            @Value("${app.encryption-key:}") String configuredEncryptionKey,
            @Value("${app.auth.google.client-id:}") String envGoogleClientId,
            @Value("${app.auth.google.client-secret:}") String envGoogleClientSecret,
            @Value("${app.auth.google.redirect-uri:http://localhost:8080/api/v1/auth/google/callback}") String envGoogleRedirectUri
    ) {
        this.users = users;
        this.oauthConfigs = oauthConfigs;
        this.jwtService = jwtService;
        this.mapper = mapper;
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
        this.defaultFrontendUrl = defaultFrontendUrl;
        this.allowedCorsOrigins = allowedCorsOrigins;
        this.configuredEncryptionKey = configuredEncryptionKey;
        this.envGoogleClientId = envGoogleClientId;
        this.envGoogleClientSecret = envGoogleClientSecret;
        this.envGoogleRedirectUri = envGoogleRedirectUri;
    }

    public record RegisterRequest(String fullName, String email, String password) {}
    public record LoginRequest(String email, String password) {}
    public record GoogleConfigRequest(String clientId, String clientSecret, String redirectUri) {}
    public record GoogleIdTokenRequest(String idToken) {}

    private record ResolvedGoogleConfig(String clientId, String clientSecret, String redirectUri, String source) {}

    @PostMapping("/register")
    @Transactional
    public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
        String email = normalizeEmail(req != null ? req.email() : null);
        if (email == null || !EMAIL_PATTERN.matcher(email).matches()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Please enter a valid email address."));
        }
        String password = req.password() != null ? req.password() : "";
        if (password.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 6 characters."));
        }

        Optional<AppUser> existingOpt = users.findByEmailIgnoreCase(email);
        if (existingOpt.isPresent()) {
            AppUser existing = existingOpt.get();
            if (existing.getPasswordHash() == null || existing.getPasswordHash().isBlank()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                        "error", "This email is already registered via Google Sign-In. Please click 'Continue with Google'."
                ));
            }
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "error", "An account with this email already exists. Please sign in instead."
            ));
        }

        String rawName = req.fullName() != null ? req.fullName().trim() : "";
        String fullName = !rawName.isBlank() ? rawName : deriveNameFromEmail(email);
        if (fullName.length() > 160) fullName = fullName.substring(0, 160);

        Instant now = Instant.now();
        AppUser user = new AppUser();
        user.setEmail(email);
        user.setFullName(fullName);
        user.setPasswordHash(PasswordHasher.hash(password));
        user.setAuthProvider("email");
        user.setEmailVerified(false);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        user.setLastLoginAt(now);
        users.save(user);

        String token = jwtService.issueUserToken(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "token", token,
                "user", toUserDto(user)
        ));
    }

    @PostMapping("/login")
    @Transactional
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        String email = normalizeEmail(req != null ? req.email() : null);
        String password = req != null && req.password() != null ? req.password() : "";
        if (email == null || password.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and password are required."));
        }

        Optional<AppUser> userOpt = users.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid email or password."));
        }

        AppUser user = userOpt.get();
        if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "This account uses Google Sign-In. Please click 'Continue with Google'."
            ));
        }

        if (!PasswordHasher.verify(password, user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid email or password."));
        }

        Instant now = Instant.now();
        user.setLastLoginAt(now);
        user.setUpdatedAt(now);
        users.save(user);

        String token = jwtService.issueUserToken(user);
        return ResponseEntity.ok(Map.of(
                "token", token,
                "user", toUserDto(user)
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(HttpServletRequest request) {
        AppUser user = (AppUser) request.getAttribute(AuthInterceptor.AUTH_USER_ATTR);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }
        return ResponseEntity.ok(Map.of("user", toUserDto(user)));
    }

    @GetMapping("/providers")
    public Map<String, Object> providers() {
        Optional<ResolvedGoogleConfig> google = resolveGoogleConfig();
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("emailEnabled", true);
        res.put("googleConfigured", google.isPresent());
        res.put("googleClientId", google.map(ResolvedGoogleConfig::clientId).orElse(""));
        res.put("googleClientIdMasked", google.map(c -> maskClientId(c.clientId())).orElse(""));
        res.put("googleConfigSource", google.map(ResolvedGoogleConfig::source).orElse("none"));
        res.put("redirectUri", google.map(ResolvedGoogleConfig::redirectUri).orElse(envGoogleRedirectUri));
        res.put("frontendOrigin", defaultFrontendUrl);
        return res;
    }

    @PostMapping("/google/config")
    @Transactional
    public ResponseEntity<?> saveGoogleConfig(
            @RequestBody GoogleConfigRequest req,
            HttpServletRequest request
    ) {
        Optional<ResolvedGoogleConfig> existing = resolveGoogleConfig();
        Object authUser = request.getAttribute(AuthInterceptor.AUTH_USER_ATTR);
        if (existing.isPresent() && authUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "Sign in required to modify existing Google OAuth credentials."
            ));
        }

        String clientId = req != null && req.clientId() != null ? req.clientId().trim() : "";
        String clientSecret = req != null && req.clientSecret() != null ? req.clientSecret().trim() : "";
        String redirectUri = req != null && req.redirectUri() != null && !req.redirectUri().isBlank()
                ? req.redirectUri().trim()
                : envGoogleRedirectUri;

        if (clientId.isBlank() || clientSecret.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Both Google Client ID and Client Secret are required."));
        }

        OAuthProviderConfig entity = oauthConfigs.findById("google").orElseGet(OAuthProviderConfig::new);
        entity.setProvider("google");
        entity.setClientId(clientId);
        entity.setClientSecretEnc(CredentialCrypto.encrypt(clientSecret, effectiveAesKey()));
        entity.setRedirectUri(redirectUri);
        entity.setUpdatedAt(Instant.now());
        oauthConfigs.save(entity);

        return ResponseEntity.ok(Map.of(
                "googleConfigured", true,
                "googleClientIdMasked", maskClientId(clientId),
                "redirectUri", redirectUri
        ));
    }

    @DeleteMapping("/google/config")
    @Transactional
    public ResponseEntity<?> deleteGoogleConfig() {
        oauthConfigs.deleteById("google");
        return ResponseEntity.ok(Map.of("deleted", true));
    }

    @GetMapping("/google/url")
    public ResponseEntity<?> getGoogleAuthUrl(
            @RequestParam(value = "mode", defaultValue = "popup") String mode,
            @RequestParam(value = "origin", required = false) String requestedOrigin
    ) {
        Optional<ResolvedGoogleConfig> googleOpt = resolveGoogleConfig();
        if (googleOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Google OAuth is not configured yet. Add Google Client ID & Secret to continue."
            ));
        }

        ResolvedGoogleConfig google = googleOpt.get();
        String safeOrigin = resolveAllowedFrontendOrigin(requestedOrigin);
        String safeMode = "redirect".equalsIgnoreCase(mode) ? "redirect" : "popup";
        String state = jwtService.issueOAuthState(safeOrigin, safeMode);

        String authUrl = "https://accounts.google.com/o/oauth2/v2/auth"
                + "?client_id=" + urlEncode(google.clientId())
                + "&redirect_uri=" + urlEncode(google.redirectUri())
                + "&response_type=code"
                + "&scope=" + urlEncode("openid email profile")
                + "&access_type=offline"
                + "&prompt=select_account"
                + "&state=" + urlEncode(state);

        return ResponseEntity.ok(Map.of("url", authUrl));
    }

    @GetMapping(value = "/google/callback", produces = MediaType.TEXT_HTML_VALUE)
    @Transactional
    public ResponseEntity<String> googleCallback(
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "error", required = false) String oauthError
    ) {
        String targetOrigin = defaultFrontendUrl;
        String mode = "popup";

        if (state != null && !state.isBlank()) {
            Optional<Map<String, Object>> parsedState = jwtService.verifyOAuthState(state);
            if (parsedState.isEmpty()) {
                return htmlBridgeResponse(targetOrigin, mode, null, null, "Invalid or expired Google login state. Please try again.");
            }
            targetOrigin = resolveAllowedFrontendOrigin(String.valueOf(parsedState.get().getOrDefault("origin", defaultFrontendUrl)));
            mode = String.valueOf(parsedState.get().getOrDefault("mode", "popup"));
        } else {
            return htmlBridgeResponse(targetOrigin, mode, null, null, "Missing OAuth state parameter.");
        }

        if (oauthError != null && !oauthError.isBlank()) {
            return htmlBridgeResponse(targetOrigin, mode, null, null, "Google sign-in was cancelled or denied (" + oauthError + ").");
        }

        if (code == null || code.isBlank()) {
            return htmlBridgeResponse(targetOrigin, mode, null, null, "Missing authorization code from Google.");
        }

        Optional<ResolvedGoogleConfig> googleOpt = resolveGoogleConfig();
        if (googleOpt.isEmpty()) {
            return htmlBridgeResponse(targetOrigin, mode, null, null, "Google OAuth configuration is missing on the server.");
        }

        try {
            ResolvedGoogleConfig google = googleOpt.get();
            Map<String, Object> tokenPayload = exchangeCodeForTokens(google, code);
            String accessToken = asString(tokenPayload.get("access_token"));
            String idToken = asString(tokenPayload.get("id_token"));

            Map<String, Object> profile;
            if (accessToken != null && !accessToken.isBlank()) {
                profile = fetchGoogleUserInfo(accessToken);
            } else if (idToken != null && !idToken.isBlank()) {
                profile = verifyGoogleIdTokenWithGoogle(idToken);
            } else {
                return htmlBridgeResponse(targetOrigin, mode, null, null, "Google did not return an access token or ID token.");
            }

            String sub = asString(profile.get("sub"));
            String email = normalizeEmail(asString(profile.get("email")));
            String fullName = asString(profile.get("name"));
            String avatarUrl = asString(profile.get("picture"));
            boolean emailVerified = asBoolean(profile.get("email_verified"));

            if (email == null || sub == null) {
                return htmlBridgeResponse(targetOrigin, mode, null, null, "Google profile did not include an email address.");
            }

            AppUser user = upsertGoogleUser(sub, email, fullName, avatarUrl, emailVerified);
            String navioJwt = jwtService.issueUserToken(user);
            return htmlBridgeResponse(targetOrigin, mode, navioJwt, toUserDto(user), null);
        } catch (Exception e) {
            return htmlBridgeResponse(targetOrigin, mode, null, null, "Google sign-in failed: " + e.getMessage());
        }
    }

    @PostMapping("/google/id-token")
    @Transactional
    public ResponseEntity<?> loginWithGoogleIdToken(@RequestBody GoogleIdTokenRequest req) {
        if (req == null || req.idToken() == null || req.idToken().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Google idToken is required."));
        }
        Optional<ResolvedGoogleConfig> googleOpt = resolveGoogleConfig();
        if (googleOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Google OAuth is not configured."));
        }
        try {
            Map<String, Object> info = verifyGoogleIdTokenWithGoogle(req.idToken().trim());
            String aud = asString(info.get("aud"));
            if (!googleOpt.get().clientId().equals(aud)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Google ID token audience mismatch."));
            }
            String sub = asString(info.get("sub"));
            String email = normalizeEmail(asString(info.get("email")));
            String name = asString(info.get("name"));
            String avatar = asString(info.get("picture"));
            boolean verified = asBoolean(info.get("email_verified"));
            if (email == null || sub == null || !verified) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unverified Google account."));
            }
            AppUser user = upsertGoogleUser(sub, email, name, avatar, true);
            String token = jwtService.issueUserToken(user);
            return ResponseEntity.ok(Map.of("token", token, "user", toUserDto(user)));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Google token verification failed."));
        }
    }

    private AppUser upsertGoogleUser(String sub, String email, String name, String avatarUrl, boolean emailVerified) {
        Instant now = Instant.now();
        Optional<AppUser> existingOpt = users.findByGoogleSub(sub)
                .or(() -> users.findByEmailIgnoreCase(email));

        AppUser user = existingOpt.orElseGet(AppUser::new);
        user.setEmail(email);
        user.setGoogleSub(sub);
        if (name != null && !name.isBlank()) {
            user.setFullName(name.trim().length() > 160 ? name.trim().substring(0, 160) : name.trim());
        } else if (user.getFullName() == null || user.getFullName().isBlank()) {
            user.setFullName(deriveNameFromEmail(email));
        }
        if (avatarUrl != null && !avatarUrl.isBlank()) {
            user.setAvatarUrl(avatarUrl.trim());
        }
        user.setEmailVerified(user.isEmailVerified() || emailVerified);
        if (user.getPasswordHash() != null && !user.getPasswordHash().isBlank()) {
            user.setAuthProvider("email,google");
        } else {
            user.setAuthProvider("google");
        }
        if (user.getCreatedAt() == null) user.setCreatedAt(now);
        user.setUpdatedAt(now);
        user.setLastLoginAt(now);
        return users.save(user);
    }

    private Map<String, Object> exchangeCodeForTokens(ResolvedGoogleConfig google, String code) throws Exception {
        String form = "code=" + urlEncode(code)
                + "&client_id=" + urlEncode(google.clientId())
                + "&client_secret=" + urlEncode(google.clientSecret())
                + "&redirect_uri=" + urlEncode(google.redirectUri())
                + "&grant_type=authorization_code";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://oauth2.googleapis.com/token"))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .build();

        HttpResponse<String> resp = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        Map<String, Object> payload = mapper.readValue(resp.body(), new TypeReference<>() {});
        if (resp.statusCode() >= 400) {
            throw new IllegalStateException(String.valueOf(payload.getOrDefault("error_description", "Token exchange rejected (" + resp.statusCode() + ")")));
        }
        return payload;
    }

    private Map<String, Object> fetchGoogleUserInfo(String accessToken) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://www.googleapis.com/oauth2/v3/userinfo"))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + accessToken)
                .GET()
                .build();

        HttpResponse<String> resp = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() >= 400) {
            throw new IllegalStateException("Failed to fetch Google user profile (" + resp.statusCode() + ")");
        }
        return mapper.readValue(resp.body(), new TypeReference<>() {});
    }

    private Map<String, Object> verifyGoogleIdTokenWithGoogle(String idToken) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://oauth2.googleapis.com/tokeninfo?id_token=" + urlEncode(idToken)))
                .timeout(Duration.ofSeconds(15))
                .GET()
                .build();
        HttpResponse<String> resp = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() >= 400) {
            throw new IllegalStateException("Google ID token rejected (" + resp.statusCode() + ")");
        }
        return mapper.readValue(resp.body(), new TypeReference<>() {});
    }

    private Optional<ResolvedGoogleConfig> resolveGoogleConfig() {
        Optional<OAuthProviderConfig> dbCfg = oauthConfigs.findById("google");
        if (dbCfg.isPresent()) {
            OAuthProviderConfig cfg = dbCfg.get();
            if (cfg.getClientId() != null && !cfg.getClientId().isBlank()
                    && cfg.getClientSecretEnc() != null && !cfg.getClientSecretEnc().isBlank()) {
                try {
                    String secret = CredentialCrypto.decrypt(cfg.getClientSecretEnc(), effectiveAesKey());
                    String redirect = cfg.getRedirectUri() != null && !cfg.getRedirectUri().isBlank()
                            ? cfg.getRedirectUri()
                            : envGoogleRedirectUri;
                    return Optional.of(new ResolvedGoogleConfig(cfg.getClientId().trim(), secret, redirect, "database"));
                } catch (Exception ignored) {
                }
            }
        }

        if (envGoogleClientId != null && !envGoogleClientId.isBlank()
                && envGoogleClientSecret != null && !envGoogleClientSecret.isBlank()) {
            return Optional.of(new ResolvedGoogleConfig(
                    envGoogleClientId.trim(),
                    envGoogleClientSecret.trim(),
                    envGoogleRedirectUri,
                    "environment"
            ));
        }
        return Optional.empty();
    }

    private String effectiveAesKey() {
        if (configuredEncryptionKey != null && !configuredEncryptionKey.isBlank()
                && !configuredEncryptionKey.contains("REPLACE_WITH")) {
            try {
                byte[] decoded = Base64.getDecoder().decode(configuredEncryptionKey.trim());
                if (decoded.length == 32) {
                    return configuredEncryptionKey.trim();
                }
            } catch (Exception ignored) {}
        }
        return jwtService.getBase64AesKey();
    }

    private ResponseEntity<String> htmlBridgeResponse(
            String targetOrigin,
            String mode,
            String token,
            Map<String, Object> user,
            String error
    ) {
        try {
            Map<String, Object> messagePayload = new LinkedHashMap<>();
            messagePayload.put("type", "navio-google-auth");
            if (token != null) messagePayload.put("token", token);
            if (user != null) messagePayload.put("user", user);
            if (error != null) messagePayload.put("error", error);

            String safeJson = toSafeInlineJsJson(messagePayload);
            String safeOriginJson = toSafeInlineJsJson(targetOrigin);
            String redirectTarget = error == null && token != null
                    ? targetOrigin + "/#auth_token=" + urlEncode(token)
                    : targetOrigin + "/#auth_error=" + urlEncode(error != null ? error : "Google authentication failed");
            String safeRedirectJson = toSafeInlineJsJson(redirectTarget);
            String titleText = error == null ? "Signed in to Navio" : "Google Sign-In Failed";
            String statusText = error == null
                    ? "Authentication successful. Returning to Navio..."
                    : error;

            String html = "<!doctype html><html><head><meta charset=\"utf-8\"><title>" + escapeHtml(titleText) + "</title>"
                    + "<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#040915;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;}"
                    + ".card{background:#0b152d;border:1px solid rgba(59,130,246,0.28);border-radius:16px;padding:28px 32px;max-width:420px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.45);}"
                    + ".title{font-size:18px;font-weight:700;margin-bottom:10px;}"
                    + ".msg{font-size:14px;color:#94a3b8;line-height:1.5;}</style></head><body>"
                    + "<div class=\"card\"><div class=\"title\">" + escapeHtml(titleText) + "</div>"
                    + "<div class=\"msg\">" + escapeHtml(statusText) + "</div></div>"
                    + "<script>"
                    + "(function(){"
                    + "var payload=" + safeJson + ";"
                    + "var targetOrigin=" + safeOriginJson + ";"
                    + "var redirectUrl=" + safeRedirectJson + ";"
                    + "var isPopup=" + ("popup".equalsIgnoreCase(mode) ? "true" : "false") + ";"
                    + "if(isPopup && window.opener && !window.opener.closed){"
                    + "  try{ window.opener.postMessage(payload, targetOrigin); window.close(); return; }catch(e){}"
                    + "}"
                    + "window.location.replace(redirectUrl);"
                    + "})();"
                    + "</script></body></html>";

            return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(html);
        } catch (Exception e) {
            return ResponseEntity.status(500).contentType(MediaType.TEXT_PLAIN).body("OAuth callback rendering error");
        }
    }

    private String toSafeInlineJsJson(Object value) throws Exception {
        return mapper.writeValueAsString(value)
                .replace("<", "\\u003c")
                .replace(">", "\\u003e")
                .replace("&", "\\u0026")
                .replace("'", "\\u0027");
    }

    private String resolveAllowedFrontendOrigin(String candidate) {
        if (candidate != null && !candidate.isBlank()) {
            String trimmed = candidate.trim().replaceAll("/+$", "");
            if (allowedCorsOrigins != null) {
                for (String allowed : allowedCorsOrigins.split(",")) {
                    if (trimmed.equalsIgnoreCase(allowed.trim().replaceAll("/+$", ""))) {
                        return allowed.trim().replaceAll("/+$", "");
                    }
                }
            }
        }
        return defaultFrontendUrl.replaceAll("/+$", "");
    }

    private static Map<String, Object> toUserDto(AppUser user) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", user.getId().toString());
        dto.put("email", user.getEmail());
        dto.put("fullName", user.getFullName());
        dto.put("authProvider", user.getAuthProvider());
        dto.put("avatarUrl", user.getAvatarUrl());
        dto.put("emailVerified", user.isEmailVerified());
        return dto;
    }

    private static String normalizeEmail(String raw) {
        if (raw == null) return null;
        String cleaned = raw.trim().toLowerCase(Locale.ROOT);
        return cleaned.isEmpty() ? null : cleaned;
    }

    private static String deriveNameFromEmail(String email) {
        int at = email.indexOf('@');
        String local = at > 0 ? email.substring(0, at) : email;
        String cleaned = local.replace('.', ' ').replace('_', ' ').replace('-', ' ').trim();
        if (cleaned.isEmpty()) return "Navio User";
        String[] parts = cleaned.split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (p.isEmpty()) continue;
            if (!sb.isEmpty()) sb.append(' ');
            sb.append(Character.toUpperCase(p.charAt(0))).append(p.substring(1));
        }
        return sb.isEmpty() ? "Navio User" : sb.toString();
    }

    private static String maskClientId(String clientId) {
        if (clientId == null || clientId.length() <= 14) return "Configured";
        return clientId.substring(0, 8) + "..." + clientId.substring(clientId.length() - 8);
    }

    private static String urlEncode(String v) {
        return URLEncoder.encode(v != null ? v : "", StandardCharsets.UTF_8);
    }

    private static String asString(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private static boolean asBoolean(Object o) {
        if (o instanceof Boolean b) return b;
        return o != null && "true".equalsIgnoreCase(String.valueOf(o));
    }

    private static String escapeHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
