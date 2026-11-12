package com.example.agent.scheduler;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ScheduledJobRepository extends JpaRepository<ScheduledJob, UUID> {
    List<ScheduledJob> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<ScheduledJob> findByIdAndUserId(UUID id, UUID userId);
    List<ScheduledJob> findByEnabledTrue();
}
