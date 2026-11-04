package com.example.agent.task;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="agent_actions")
public class AgentAction {
 @Id private UUID id;
 @Column(name="task_id",nullable=false) private UUID taskId;
 @Column(name="action_type",nullable=false) private String actionType;
 @Column(nullable=false,length=1000) private String description;
 @Column(nullable=false) private String status;
 @Column(name="created_at",nullable=false) private Instant createdAt;
 protected AgentAction(){}
 public AgentAction(UUID taskId,String type,String description,String status){this.id=UUID.randomUUID();this.taskId=taskId;this.actionType=type;this.description=description;this.status=status;this.createdAt=Instant.now();}
 public UUID getId(){return id;} public UUID getTaskId(){return taskId;} public String getActionType(){return actionType;} public String getDescription(){return description;} public String getStatus(){return status;} public Instant getCreatedAt(){return createdAt;}
}
