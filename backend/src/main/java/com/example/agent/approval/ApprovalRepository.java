package com.example.agent.approval;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ApprovalRepository extends JpaRepository<ApprovalRequest, UUID> {
    List<ApprovalRequest> findByOrderByRequestedAtDesc();
    List<ApprovalRequest> findByApprovalStatusOrderByRequestedAtDesc(String status);
}
