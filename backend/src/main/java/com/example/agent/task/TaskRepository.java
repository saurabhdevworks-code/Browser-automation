package com.example.agent.task;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface TaskRepository extends JpaRepository<AgentTask,UUID>{
    List<AgentTask> findByConnectionId(UUID connectionId);
}
