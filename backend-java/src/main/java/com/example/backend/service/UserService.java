package com.example.backend.service;

import com.example.backend.model.User;
import com.example.backend.repository.UserRepository;
import com.example.backend.repository.FollowRepository;
import com.example.backend.repository.PostRepository;
import com.example.backend.repository.FavoriteRepository;
import com.example.backend.repository.LikeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.util.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import jakarta.transaction.Transactional;

import java.io.IOException;
import java.nio.file.*;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FollowRepository followRepository;

    @Autowired
    private FavoriteRepository favoriteRepository;

    @Autowired
    private LikeRepository likeRepository;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private PostService postService;

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Value("${server.port}")
    private String serverPort;

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public User getCurrentUser(String username) {
        return userRepository.findByUsername(username).orElseThrow(() -> new RuntimeException("User not found"));
    }

    public Map<String, Object> getUserStats(Long userId) {
        long followers = followRepository.countByFollowedId(userId);
        long following = followRepository.countByFollowerId(userId);
        long posts = postRepository.findAll().stream().filter(p -> p.getUser().getId().equals(userId)).count(); // Simplify
                                                                                                                // given
                                                                                                                // JPA
                                                                                                                // limitations
                                                                                                                // on
                                                                                                                // countBy

        return Map.of(
                "followers_count", followers,
                "following_count", following,
                "post_count", posts);
    }

    public Map<String, Object> getProfileWithStats(String username, Long currentUserId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Map<String, Object> stats = getUserStats(user.getId());

        boolean isFollowed = false;
        if (currentUserId != null) {
            isFollowed = followRepository.existsByFollowerIdAndFollowedId(currentUserId, user.getId());
        }

        return Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "email", user.getEmail() != null ? user.getEmail() : "",
                "avatar", user.getAvatar() != null ? user.getAvatar() : "",
                "created_at", user.getCreatedAt(),
                "followers_count", stats.get("followers_count"),
                "following_count", stats.get("following_count"),
                "post_count", stats.get("post_count"),
                "isFollowed", isFollowed);
    }

    @Transactional
    public User updateProfile(Long userId, String username, String email, String password, String avatarBase64,
            String avatarFilename) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));

        if (username != null && !username.equals(user.getUsername())) {
            if (userRepository.existsByUsername(username)) {
                throw new RuntimeException("用户名已被使用");
            }
            user.setUsername(username);
        }

        if (email != null && !email.equals(user.getEmail())) {
            if (userRepository.existsByEmail(email)) {
                throw new RuntimeException("邮箱已被使用");
            }
            user.setEmail(email);
        }

        if (password != null && !password.isEmpty()) {
            user.setPassword(password); // Plaintext as per requirement
        }

        if (avatarBase64 != null && !avatarBase64.isEmpty()) {
            try {
                String fileName = "avatar_" + userId + "_" + System.currentTimeMillis() + ".png";
                if (avatarFilename != null) {
                    fileName = StringUtils.cleanPath(avatarFilename);
                }

                String timestampFolder = String.valueOf(System.currentTimeMillis());
                Path uploadPath = Paths.get(uploadDir, "avatars", timestampFolder);

                if (!Files.exists(uploadPath)) {
                    Files.createDirectories(uploadPath);
                }

                // Decode Base64
                String base64Data = avatarBase64;
                if (base64Data.contains(",")) {
                    base64Data = base64Data.split(",")[1];
                }

                byte[] decodedBytes = Base64.getDecoder().decode(base64Data);
                Path filePath = uploadPath.resolve(fileName);
                Files.write(filePath, decodedBytes);

                String avatarUrl = "http://localhost:" + serverPort + "/uploads/avatars/" + timestampFolder + "/"
                        + fileName;
                user.setAvatar(avatarUrl);

            } catch (IOException e) {
                throw new RuntimeException("Failed to store avatar", e);
            }
        }

        return userRepository.save(user);
    }

    @Transactional
    public java.util.List<Map<String, Object>> getUserFavorites(Long userId) {
        return favoriteRepository.findByUserIdOrderByCreatedAtDesc(userId).stream().map(fav -> {
            com.example.backend.model.Post post = fav.getPost();
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", fav.getId());
            map.put("createdAt", fav.getCreatedAt());

            // Handle null/deleted posts safely
            if (post == null)
                return null;
            try {
                map.put("post", postService.getPostById(post.getId(), userId));
            } catch (Exception e) {
                // Post might be deleted or not found
                return null;
            }
            return map;
        })
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public java.util.List<Map<String, Object>> getUserLikes(Long userId) {
        return likeRepository.findByUserIdOrderByCreatedAtDesc(userId).stream().map(like -> {
            com.example.backend.model.Post post = like.getPost();
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", like.getId());
            map.put("createdAt", like.getCreatedAt());

            if (post == null)
                return null;
            try {
                map.put("post", postService.getPostById(post.getId(), userId));
            } catch (Exception e) {
                return null;
            }

            Map<String, Object> liker = new java.util.HashMap<>();
            liker.put("id", like.getUser().getId());
            liker.put("username", like.getUser().getUsername());
            liker.put("avatar", like.getUser().getAvatar());
            map.put("liker", liker);

            return map;
        })
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toList());
    }

    public java.util.List<Map<String, Object>> getUserFollowers(Long userId) {
        java.util.List<Long> followerIds = followRepository.findByFollowedId(userId).stream()
                .map(com.example.backend.model.Follow::getFollowerId)
                .collect(java.util.stream.Collectors.toList());

        return userRepository.findAllById(followerIds).stream().map(user -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", user.getId());
            map.put("username", user.getUsername());
            map.put("avatar", user.getAvatar());
            map.put("bio", "Web Developer | Tech Enthusiast"); // Placeholder logic, add bio to User model later
            return map;
        }).collect(java.util.stream.Collectors.toList());
    }

    public java.util.List<Map<String, Object>> getUserFollowing(Long userId) {
        java.util.List<Long> followingIds = followRepository.findByFollowerId(userId).stream()
                .map(com.example.backend.model.Follow::getFollowedId)
                .collect(java.util.stream.Collectors.toList());

        return userRepository.findAllById(followingIds).stream().map(user -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", user.getId());
            map.put("username", user.getUsername());
            map.put("avatar", user.getAvatar());
            map.put("bio", "Web Developer | Tech Enthusiast"); // Placeholder logic
            return map;
        }).collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public boolean toggleFollow(Long followerId, Long followedId) {
        if (followRepository.existsByFollowerIdAndFollowedId(followerId, followedId)) {
            followRepository.deleteByFollowerIdAndFollowedId(followerId, followedId);
            return false;
        } else {
            com.example.backend.model.Follow follow = new com.example.backend.model.Follow();
            follow.setFollowerId(followerId);
            follow.setFollowedId(followedId);
            followRepository.save(follow);
            return true;
        }
    }
}
