package com.example.agent.file;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface FileRepository extends JpaRepository<GeneratedFile, UUID> {
    List<GeneratedFile> findByOrderByCreatedAtDesc();
    List<GeneratedFile> findByTaskId(UUID taskId);
    void deleteByTaskId(UUID taskId);
}
