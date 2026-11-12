package com.example.agent.ai;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UserAiConfigRepository extends JpaRepository<UserAiConfig, UUID> {
}
