package com.example.agent.connection;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface ConnectionRepository extends JpaRepository<WebsiteConnection,UUID> {}
