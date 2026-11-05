package com.example.agent.task;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface ActionRepository extends JpaRepository<AgentAction,UUID>{ 
    List<AgentAction> findByTaskIdOrderByCreatedAtAsc(UUID taskId); 
    void deleteByTaskId(UUID taskId);
}
