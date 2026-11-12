package com.example.agent.conversation;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessageEntity, UUID> {
    List<ChatMessageEntity> findByConversationIdOrderByCreatedAtAscSeqAsc(UUID conversationId);
    long countByConversationId(UUID conversationId);
}
