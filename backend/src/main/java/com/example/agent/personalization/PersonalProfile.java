package com.example.agent.personalization;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "personal_profiles")
public class PersonalProfile {
    @Id
    private String id = "";

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "full_name", length = 200)
    private String fullName = "";

    @Column(length = 200)
    private String email = "";

    @Column(length = 80)
    private String phone = "";

    @Column(length = 255)
    private String location = "";

    @Column(name = "custom_text", columnDefinition = "text")
    private String customText = "";

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public PersonalProfile() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName != null ? fullName : ""; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email != null ? email : ""; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone != null ? phone : ""; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location != null ? location : ""; }

    public String getCustomText() { return customText; }
    public void setCustomText(String customText) { this.customText = customText != null ? customText : ""; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
