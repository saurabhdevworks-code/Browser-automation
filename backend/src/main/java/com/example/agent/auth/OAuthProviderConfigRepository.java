package com.example.agent.auth;

import org.springframework.data.jpa.repository.JpaRepository;

public interface OAuthProviderConfigRepository extends JpaRepository<OAuthProviderConfig, String> {
}
