package com.example.backend.service;

import com.example.backend.model.*;
import com.example.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.util.Base64;

@Service
public class PostService {

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private LikeRepository likeRepository;

    @Autowired
    private FavoriteRepository favoriteRepository;

    @Autowired
    private FollowRepository followRepository;

    @Autowired
    private TagRepository tagRepository;

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Value("${server.port}")
    private String serverPort;

    public List<Map<String, Object>> getAllPosts(Long currentUserId, String filter, String tag, String date,
            Long authorId) {
        // Simple implementation: Fetch all and filter in memory for complex logic not
        // easily done in naming conventions
        // For production, use Specifications or QueryDSL.
        // Given the requirement "refactor based on existing code", we try to match
        // logic.

        List<Post> posts;

        if (authorId != null) {
            posts = postRepository.findAllByUserIdOrderByCreatedAtDesc(authorId);
        } else {
            // Default to all published
            posts = postRepository.findAllPublished(LocalDateTime.now());
        }

        // Filter by Tag
        if (tag != null && !tag.equals("all")) {
            // Check tag ID or Name? The existing backend used ID in query but logic seemed
            // mix. Let's assume ID.
            try {
                Long tagId = Long.parseLong(tag);
                posts = posts.stream()
                        .filter(p -> p.getTags().stream().anyMatch(t -> t.getId().equals(tagId)))
                        .collect(Collectors.toList());
            } catch (NumberFormatException e) {
                // Ignore if not a number
            }
        }

        // Filter by Date
        if (date != null) {
            posts = posts.stream()
                    .filter(p -> p.getCreatedAt().toLocalDate().toString().equals(date))
                    .collect(Collectors.toList());
        }

        // Filter by Follow
        if ("follow".equals(filter) && currentUserId != null) {
            List<Follow> follows = followRepository.findAll(); // Inefficient, should be findByFollowerId
            // Better:
            // List<Long> followedIds =
            // followRepository.findFollowedIdsByFollowerId(currentUserId);
            // using stream for now as repo method not defined yet
            // Let's rely on standard logic
            posts = posts.stream()
                    .filter(p -> followRepository.existsByFollowerIdAndFollowedId(currentUserId, p.getUser().getId()))
                    .collect(Collectors.toList());
        }

        // Sorting
        if ("hot".equals(filter)) {
            posts.sort((p1, p2) -> {
                long like1 = likeRepository.countByPostId(p1.getId());
                long like2 = likeRepository.countByPostId(p2.getId());
                return Long.compare(like2, like1);
            });
        } else if ("recommended".equals(filter)) {
            posts.sort((p1, p2) -> {
                long like1 = likeRepository.countByPostId(p1.getId());
                long like2 = likeRepository.countByPostId(p2.getId());
                // comment count needed?
                // For simplicity, just use likes for recommended in this MVP or add comment
                // count repo method
                return Long.compare(like2, like1);
            });
        }

        // Map to DTO
        return posts.stream().map(p -> convertToDto(p, currentUserId)).collect(Collectors.toList());
    }

    public Map<String, Object> getPostById(Long id, Long currentUserId) {
        Post post = postRepository.findById(id).orElseThrow(() -> new RuntimeException("Post not found"));
        return convertToDto(post, currentUserId);
    }

    public Map<String, Object> createPost(Long userId, String title, String content, String imageBase64, String status,
            String publishAtStr, List<Long> tagIds) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));

        Post post = new Post();
        post.setTitle(title);
        post.setContent(content);
        post.setUser(user);
        post.setStatus(status != null ? status : "published");

        if ("scheduled".equals(status) && publishAtStr != null) {
            // Parse ISO date string
            // Assuming format 2023-10-10T10:00:00.000Z
            try {
                // Simple parser, might need adjustment based on frontend format
                // frontend likely sends ISO string
                post.setPublishAt(LocalDateTime.parse(publishAtStr.replace("Z", "")));
            } catch (Exception e) {
                // handle parsing
                post.setPublishAt(LocalDateTime.now());
            }
        } else if ("published".equals(status)) {
            post.setPublishAt(LocalDateTime.now());
        }

        // Tags
        if (tagIds != null && !tagIds.isEmpty()) {
            Set<Tag> tags = new HashSet<>(tagRepository.findAllById(tagIds));
            post.setTags(tags);
        }

        // Image
        if (imageBase64 != null && imageBase64.startsWith("data:image")) {
            try {
                String fileName = "post_" + userId + "_" + System.currentTimeMillis() + ".png";
                String timestampFolder = String.valueOf(System.currentTimeMillis());
                Path uploadPath = Paths.get(uploadDir, "posts", timestampFolder);

                if (!Files.exists(uploadPath)) {
                    Files.createDirectories(uploadPath);
                }

                String base64Data = imageBase64.replaceFirst("^data:image/[a-zA-Z0-9]+;base64,", "");
                byte[] decodedBytes = Base64.getDecoder().decode(base64Data);
                Path filePath = uploadPath.resolve(fileName);
                Files.write(filePath, decodedBytes);

                String imageUrl = "http://localhost:" + serverPort + "/uploads/posts/" + timestampFolder + "/"
                        + fileName;
                post.setImage(imageUrl);

            } catch (IOException e) {
                e.printStackTrace();
            }
        }

        Post saved = postRepository.save(post);
        return convertToDto(saved, userId);
    }

    public void deletePost(Long postId, Long userId) {
        Post post = postRepository.findById(postId).orElseThrow(() -> new RuntimeException("Post not found"));
        if (!post.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }
        postRepository.delete(post);
    }

    public void updateStatus(Long postId, Long userId, String status) {
        Post post = postRepository.findById(postId).orElseThrow(() -> new RuntimeException("Post not found"));
        if (!post.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }
        if ("published".equals(status)) {
            post.setStatus("published");
            post.setPublishAt(LocalDateTime.now());
            post.setCreatedAt(LocalDateTime.now()); // Update created time to now to show at top
        } else {
            post.setStatus(status);
        }
        postRepository.save(post);
    }

    public boolean toggleLike(Long postId, Long userId) {
        if (likeRepository.existsByUserIdAndPostId(userId, postId)) {
            Like like = likeRepository
                    .findByUserAndPost(userRepository.getReferenceById(userId), postRepository.getReferenceById(postId))
                    .get();
            likeRepository.delete(like);
            return false;
        } else {
            Like like = new Like();
            like.setUser(userRepository.getReferenceById(userId));
            like.setPost(postRepository.getReferenceById(postId));
            likeRepository.save(like);
            return true;
        }
    }

    public boolean toggleFavorite(Long postId, Long userId) {
        if (favoriteRepository.existsByUserIdAndPostId(userId, postId)) {
            Favorite fav = favoriteRepository
                    .findByUserAndPost(userRepository.getReferenceById(userId), postRepository.getReferenceById(postId))
                    .get();
            favoriteRepository.delete(fav);
            return false;
        } else {
            Favorite fav = new Favorite();
            fav.setUser(userRepository.getReferenceById(userId));
            fav.setPost(postRepository.getReferenceById(postId));
            favoriteRepository.save(fav);
            return true;
        }
    }

    public List<String> getPostDates(Long userId) {
        return postRepository.findByUserId(userId).stream()
                .filter(p -> "published".equals(p.getStatus()))
                .map(p -> p.getCreatedAt().toLocalDate().toString())
                .distinct()
                .sorted(Comparator.reverseOrder())
                .collect(Collectors.toList());
    }

    private Map<String, Object> convertToDto(Post post, Long currentUserId) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", post.getId());
        map.put("title", post.getTitle());
        map.put("content", post.getContent());
        map.put("image", post.getImage());
        map.put("status", post.getStatus()); // Add logic for scheduled -> published check if needed
        map.put("publishAt", post.getPublishAt());
        map.put("createdAt", post.getCreatedAt());

        Map<String, Object> author = new HashMap<>();
        author.put("id", post.getUser().getId());
        author.put("username", post.getUser().getUsername());
        author.put("email", post.getUser().getEmail());
        author.put("avatar", post.getUser().getAvatar());
        if (currentUserId != null) {
            author.put("isFollowed",
                    followRepository.existsByFollowerIdAndFollowedId(currentUserId, post.getUser().getId()));
        } else {
            author.put("isFollowed", false);
        }
        map.put("author", author);

        map.put("likeCount", likeRepository.countByPostId(post.getId()));
        map.put("commentCount", 0); // TODO: wire comment repo
        map.put("isLiked",
                currentUserId != null && likeRepository.existsByUserIdAndPostId(currentUserId, post.getId()));
        map.put("isFavorited",
                currentUserId != null && favoriteRepository.existsByUserIdAndPostId(currentUserId, post.getId()));
        map.put("tags", post.getTags());

        return map;
    }
}
