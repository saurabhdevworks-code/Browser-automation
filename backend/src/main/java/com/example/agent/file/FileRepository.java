package com.example.agent.file;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FileRepository extends JpaRepository<GeneratedFile, UUID> {
    List<GeneratedFile> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<GeneratedFile> findByIdAndUserId(UUID id, UUID userId);
    List<GeneratedFile> findByIdInAndUserId(List<UUID> ids, UUID userId);
    List<GeneratedFile> findByTaskId(UUID taskId);
    void deleteByTaskId(UUID taskId);
}
