package com.example.agent.scheduler;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ScheduledJobRunRepository extends JpaRepository<ScheduledJobRun, UUID> {
    List<ScheduledJobRun> findTop25ByScheduledJobIdInOrderByStartedAtDesc(Collection<UUID> scheduledJobIds);
    List<ScheduledJobRun> findTop10ByScheduledJobIdOrderByStartedAtDesc(UUID scheduledJobId);
}
