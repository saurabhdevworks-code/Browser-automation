package com.example.agent.approval;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ApprovalRepository extends JpaRepository<ApprovalRequest, UUID> {
    List<ApprovalRequest> findByUserIdOrderByRequestedAtDesc(UUID userId);
    List<ApprovalRequest> findByUserIdAndApprovalStatusOrderByRequestedAtDesc(UUID userId, String status);
    Optional<ApprovalRequest> findByIdAndUserId(UUID id, UUID userId);
    void deleteByTaskId(UUID taskId);
}
