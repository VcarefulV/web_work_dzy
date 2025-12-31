package com.example.backend.repository;

import com.example.backend.model.Like;
import com.example.backend.model.Post;
import com.example.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface LikeRepository extends JpaRepository<Like, Long> {
    Optional<Like> findByUserAndPost(User user, Post post);

    long countByPostId(Long postId);

    boolean existsByUserIdAndPostId(Long userId, Long postId);

    List<Like> findByPostUserIdOrderByCreatedAtDesc(Long userId);

    List<Like> findByUserId(Long userId); // New for getting user's likes
}
