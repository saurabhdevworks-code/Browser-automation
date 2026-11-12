package com.example.agent.connection;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConnectionRepository extends JpaRepository<WebsiteConnection, UUID> {
    List<WebsiteConnection> findByUserIdOrderByCreatedAtAsc(UUID userId);
    Optional<WebsiteConnection> findByIdAndUserId(UUID id, UUID userId);
}
