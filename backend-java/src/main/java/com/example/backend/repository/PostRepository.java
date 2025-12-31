package com.example.backend.repository;

import com.example.backend.model.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {
    // Basic queries
    List<Post> findByUserId(Long userId);

    // For scheduled auto-publishing (simulated by filtering in query or cron)
    // We will do filtering in Service layer or custom query mostly.

    @Query("SELECT p FROM Post p WHERE (p.status = 'published' OR (p.status = 'scheduled' AND p.publishAt <= :now)) ORDER BY p.createdAt DESC")
    List<Post> findAllPublished(@Param("now") LocalDateTime now);

    @Query("SELECT p FROM Post p WHERE p.user.id = :userId ORDER BY p.createdAt DESC")
    List<Post> findAllByUserIdOrderByCreatedAtDesc(@Param("userId") Long userId);

    @Query(value = "SELECT * FROM posts p WHERE (p.status = 'published' OR (p.status = 'scheduled' AND p.publish_at <= NOW())) ORDER BY p.created_at DESC", nativeQuery = true)
    List<Post> findAllPublishedNative();

    // Just finding scheduled ones to auto-update
    List<Post> findByStatusAndPublishAtBefore(String status, LocalDateTime date);
}
