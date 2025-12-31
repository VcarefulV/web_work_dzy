package com.example.backend.repository;

import com.example.backend.model.Follow;
import com.example.backend.model.FollowId;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FollowRepository extends JpaRepository<Follow, FollowId> {
    long countByFollowerId(Long followerId);

    long countByFollowedId(Long followedId);

    boolean existsByFollowerIdAndFollowedId(Long followerId, Long followedId);

    void deleteByFollowerIdAndFollowedId(Long followerId, Long followedId);
}
