package com.example.backend.repository;

import com.example.backend.model.Favorite;
import com.example.backend.model.Post;
import com.example.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    Optional<Favorite> findByUserAndPost(User user, Post post);

    long countByPostId(Long postId);

    boolean existsByUserIdAndPostId(Long userId, Long postId);

    List<Favorite> findByUserIdOrderByCreatedAtDesc(Long userId);
}
