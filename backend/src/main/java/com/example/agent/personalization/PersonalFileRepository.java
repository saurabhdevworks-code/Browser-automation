package com.example.agent.personalization;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PersonalFileRepository extends JpaRepository<PersonalFile, UUID> {
    List<PersonalFile> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<PersonalFile> findByIdAndUserId(UUID id, UUID userId);
}
