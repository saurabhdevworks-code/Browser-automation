package com.example.agent.task;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface TaskRepository extends JpaRepository<AgentTask, UUID> {
    List<AgentTask> findByConnectionId(UUID connectionId);
    List<AgentTask> findByConnectionIdAndUserId(UUID connectionId, UUID userId);
    List<AgentTask> findByUserIdOrderByCreatedAtAsc(UUID userId);
    Optional<AgentTask> findByIdAndUserId(UUID id, UUID userId);
}
