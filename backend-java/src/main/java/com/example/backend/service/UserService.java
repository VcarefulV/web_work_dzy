package com.example.backend.service;

import com.example.backend.model.User;
import com.example.backend.repository.UserRepository;
import com.example.backend.repository.FollowRepository;
import com.example.backend.repository.PostRepository;
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
    private PostRepository postRepository;

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
}
